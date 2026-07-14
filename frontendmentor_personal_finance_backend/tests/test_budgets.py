"""Tests for /budgets — CRUD, one-per-category rule, derived spent/remaining."""


def _get_category_id(client, headers, name="Groceries"):
    resp = client.get("/categories", headers=headers)
    for category in resp.get_json()["categories"]:
        if category["name"] == name:
            return category["id"]
    raise AssertionError("category {} not found".format(name))


def test_create_budget(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    resp = client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 20000, "theme": "green"},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.get_json()["budget"]
    assert body["max_spend"] == 20000
    assert body["spent"] == 0
    assert body["remaining"] == 20000


def test_create_budget_requires_auth(client):
    resp = client.post(
        "/budgets", json={"category_id": 1, "max_spend": 100, "theme": "green"}
    )
    assert resp.status_code == 401


def test_create_budget_invalid_category_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.post(
        "/budgets",
        json={"category_id": 999999, "max_spend": 100, "theme": "green"},
        headers=headers,
    )
    assert resp.status_code == 400


def test_create_second_budget_for_same_category_rejected(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 20000, "theme": "green"},
        headers=headers,
    )

    resp = client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 5000, "theme": "blue"},
        headers=headers,
    )
    assert resp.status_code == 409


def test_budget_spent_and_remaining_reflect_transactions(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 20000, "theme": "green"},
        headers=headers,
    )
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Store",
            "amount": -5000,
            "transaction_date": "2026-07-01",
        },
        headers=headers,
    )

    resp = client.get("/budgets", headers=headers)
    budget = resp.get_json()["budgets"][0]
    assert budget["spent"] == 5000
    assert budget["remaining"] == 15000


def test_budget_spent_excludes_income(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 20000, "theme": "green"},
        headers=headers,
    )
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Refund",
            "amount": 3000,
            "transaction_date": "2026-07-01",
        },
        headers=headers,
    )

    resp = client.get("/budgets", headers=headers)
    budget = resp.get_json()["budgets"][0]
    assert budget["spent"] == 0


def test_get_budget_not_owned_by_user_is_404(client, register_user):
    _, headers_a, _ = register_user(email="budowner@example.com")
    _, headers_b, _ = register_user(email="budother@example.com")
    category_id = _get_category_id(client, headers_a)
    create_resp = client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 1000, "theme": "green"},
        headers=headers_a,
    )
    budget_id = create_resp.get_json()["budget"]["id"]

    resp = client.get("/budgets/{}".format(budget_id), headers=headers_b)
    assert resp.status_code == 404


def test_update_budget(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 1000, "theme": "green"},
        headers=headers,
    )
    budget_id = create_resp.get_json()["budget"]["id"]

    resp = client.put(
        "/budgets/{}".format(budget_id),
        json={"max_spend": 2000},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["budget"]["max_spend"] == 2000


def test_delete_budget(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 1000, "theme": "green"},
        headers=headers,
    )
    budget_id = create_resp.get_json()["budget"]["id"]

    resp = client.delete("/budgets/{}".format(budget_id), headers=headers)
    assert resp.status_code == 200

    get_resp = client.get("/budgets/{}".format(budget_id), headers=headers)
    assert get_resp.status_code == 404
