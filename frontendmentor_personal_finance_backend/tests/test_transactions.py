"""Tests for /transactions — create, list (search/sort/filter/pagination),
get, soft-delete, immutability, and user isolation."""


def _get_category_id(client, headers, name="Groceries"):
    resp = client.get("/categories", headers=headers)
    for category in resp.get_json()["categories"]:
        if category["name"] == name:
            return category["id"]
    raise AssertionError("category {} not found".format(name))


def _create_transaction(
    client, headers, category_id, recipient_name="Acme Corp", amount=-1000,
    transaction_date="2026-07-01",
):
    return client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": recipient_name,
            "amount": amount,
            "transaction_date": transaction_date,
        },
        headers=headers,
    )


def test_create_transaction(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    resp = _create_transaction(client, headers, category_id)
    assert resp.status_code == 201
    body = resp.get_json()["transaction"]
    assert body["recipient_name"] == "Acme Corp"
    assert body["amount"] == -1000
    assert body["source"] == "manual"


def test_create_transaction_requires_auth(client):
    resp = client.post(
        "/transactions",
        json={
            "category_id": 1,
            "recipient_name": "X",
            "amount": -1,
            "transaction_date": "2026-07-01",
        },
    )
    assert resp.status_code == 401


def test_create_transaction_invalid_category_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = _create_transaction(client, headers, category_id=999999)
    assert resp.status_code == 400


def test_create_transaction_zero_amount_rejected(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    resp = _create_transaction(client, headers, category_id, amount=0)
    assert resp.status_code == 400


def test_create_transaction_with_another_users_category_rejected(client, register_user):
    _, headers_a, _ = register_user(email="txowner@example.com")
    _, headers_b, _ = register_user(email="txother@example.com")
    category_id_a = _get_category_id(client, headers_a)

    resp = _create_transaction(client, headers_b, category_id_a)
    assert resp.status_code == 400


def test_get_transaction(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = _create_transaction(client, headers, category_id)
    transaction_id = create_resp.get_json()["transaction"]["id"]

    resp = client.get("/transactions/{}".format(transaction_id), headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["transaction"]["id"] == transaction_id


def test_get_transaction_not_owned_by_user_is_404(client, register_user):
    _, headers_a, _ = register_user(email="txowner2@example.com")
    _, headers_b, _ = register_user(email="txother2@example.com")
    category_id = _get_category_id(client, headers_a)
    create_resp = _create_transaction(client, headers_a, category_id)
    transaction_id = create_resp.get_json()["transaction"]["id"]

    resp = client.get("/transactions/{}".format(transaction_id), headers=headers_b)
    assert resp.status_code == 404


def test_delete_transaction_is_soft_delete(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = _create_transaction(client, headers, category_id)
    transaction_id = create_resp.get_json()["transaction"]["id"]

    resp = client.delete("/transactions/{}".format(transaction_id), headers=headers)
    assert resp.status_code == 200

    get_resp = client.get("/transactions/{}".format(transaction_id), headers=headers)
    assert get_resp.status_code == 404

    delete_again_resp = client.delete(
        "/transactions/{}".format(transaction_id), headers=headers
    )
    assert delete_again_resp.status_code == 404


def test_no_update_endpoint(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = _create_transaction(client, headers, category_id)
    transaction_id = create_resp.get_json()["transaction"]["id"]

    resp = client.put(
        "/transactions/{}".format(transaction_id),
        json={"recipient_name": "Changed"},
        headers=headers,
    )
    assert resp.status_code == 405


def test_list_transactions_default(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _create_transaction(client, headers, category_id)
    _create_transaction(client, headers, category_id)

    resp = client.get("/transactions", headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["total"] == 2
    assert len(body["transactions"]) == 2


def test_list_transactions_excludes_deleted(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = _create_transaction(client, headers, category_id)
    transaction_id = create_resp.get_json()["transaction"]["id"]
    client.delete("/transactions/{}".format(transaction_id), headers=headers)

    resp = client.get("/transactions", headers=headers)
    assert resp.get_json()["total"] == 0


def test_list_transactions_search(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _create_transaction(client, headers, category_id, recipient_name="Whole Foods")
    _create_transaction(client, headers, category_id, recipient_name="Netflix")

    resp = client.get("/transactions?search=whole", headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["total"] == 1
    assert body["transactions"][0]["recipient_name"] == "Whole Foods"


def test_list_transactions_filter_by_category(client, register_user):
    _, headers, _ = register_user()
    groceries_id = _get_category_id(client, headers, "Groceries")
    bills_id = _get_category_id(client, headers, "Bills")
    _create_transaction(client, headers, groceries_id, recipient_name="Store")
    _create_transaction(client, headers, bills_id, recipient_name="Electric Co")

    resp = client.get(
        "/transactions?category_id={}".format(groceries_id), headers=headers
    )
    body = resp.get_json()
    assert body["total"] == 1
    assert body["transactions"][0]["recipient_name"] == "Store"


def test_list_transactions_sort_amount_asc(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _create_transaction(client, headers, category_id, recipient_name="Big", amount=-5000)
    _create_transaction(client, headers, category_id, recipient_name="Small", amount=-100)

    resp = client.get("/transactions?sort=amount_asc", headers=headers)
    names = [t["recipient_name"] for t in resp.get_json()["transactions"]]
    assert names == ["Big", "Small"]


def test_list_transactions_invalid_sort_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.get("/transactions?sort=bogus", headers=headers)
    assert resp.status_code == 400


def test_list_transactions_pagination(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    for i in range(3):
        _create_transaction(
            client, headers, category_id, recipient_name="Vendor{}".format(i)
        )

    resp = client.get("/transactions?page=1&per_page=2", headers=headers)
    body = resp.get_json()
    assert body["total"] == 3
    assert len(body["transactions"]) == 2


def test_list_transactions_requires_auth(client):
    resp = client.get("/transactions")
    assert resp.status_code == 401


def test_category_in_use_cannot_be_deleted(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _create_transaction(client, headers, category_id)

    resp = client.delete("/categories/{}".format(category_id), headers=headers)
    assert resp.status_code == 409


def test_category_no_longer_in_use_after_transaction_deleted_can_be_deleted(
    client, register_user
):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = _create_transaction(client, headers, category_id)
    transaction_id = create_resp.get_json()["transaction"]["id"]
    client.delete("/transactions/{}".format(transaction_id), headers=headers)

    resp = client.delete("/categories/{}".format(category_id), headers=headers)
    assert resp.status_code == 200
