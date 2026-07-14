"""Tests for /pots — CRUD, atomic add/withdraw, and the balance-guard logic.

True concurrent-thread contention isn't meaningful against SQLite (see the
Stage 2 plan) — these verify the guard logic itself (correct accept/reject
decisions, no partial mutation on rejection), not real lock contention, which
needs Postgres.
"""


def _get_category_id(client, headers, name="Groceries"):
    resp = client.get("/categories", headers=headers)
    for category in resp.get_json()["categories"]:
        if category["name"] == name:
            return category["id"]
    raise AssertionError("category {} not found".format(name))


def _add_income(client, headers, category_id, amount):
    return client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Paycheck",
            "amount": amount,
            "transaction_date": "2026-07-01",
        },
        headers=headers,
    )


def test_create_pot(client, register_user):
    _, headers, _ = register_user()

    resp = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.get_json()["pot"]
    assert body["name"] == "Vacation"
    assert body["total_saved"] == 0


def test_create_pot_requires_auth(client):
    resp = client.post(
        "/pots", json={"name": "Vacation", "target_amount": 100, "theme": "blue"}
    )
    assert resp.status_code == 401


def test_add_to_pot_within_balance_succeeds(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _add_income(client, headers, category_id, 10000)
    create_resp = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    )
    pot_id = create_resp.get_json()["pot"]["id"]

    resp = client.post(
        "/pots/{}/add".format(pot_id), json={"amount": 4000}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.get_json()["pot"]["total_saved"] == 4000


def test_add_to_pot_exceeding_balance_rejected(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _add_income(client, headers, category_id, 1000)
    create_resp = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    )
    pot_id = create_resp.get_json()["pot"]["id"]

    resp = client.post(
        "/pots/{}/add".format(pot_id), json={"amount": 5000}, headers=headers
    )
    assert resp.status_code == 400

    # No partial mutation on rejection.
    get_resp = client.get("/pots/{}".format(pot_id), headers=headers)
    assert get_resp.get_json()["pot"]["total_saved"] == 0


def test_add_to_pot_across_multiple_pots_respects_shared_balance(
    client, register_user
):
    """Two pots, same user: adds must serialize against the SAME balance, not
    be checked independently per pot (this is exactly the multi-pot race the
    user-row lock protects against)."""
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _add_income(client, headers, category_id, 10000)

    pot_a = client.post(
        "/pots",
        json={"name": "A", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]
    pot_b = client.post(
        "/pots",
        json={"name": "B", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]

    # First add consumes most of the balance.
    resp_a = client.post(
        "/pots/{}/add".format(pot_a), json={"amount": 8000}, headers=headers
    )
    assert resp_a.status_code == 200

    # Second add to a DIFFERENT pot would drive the shared balance negative.
    resp_b = client.post(
        "/pots/{}/add".format(pot_b), json={"amount": 5000}, headers=headers
    )
    assert resp_b.status_code == 400


def test_withdraw_from_pot_succeeds(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _add_income(client, headers, category_id, 10000)
    pot_id = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]
    client.post("/pots/{}/add".format(pot_id), json={"amount": 4000}, headers=headers)

    resp = client.post(
        "/pots/{}/withdraw".format(pot_id), json={"amount": 1500}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.get_json()["pot"]["total_saved"] == 2500


def test_withdraw_more_than_pot_total_rejected(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _add_income(client, headers, category_id, 10000)
    pot_id = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]
    client.post("/pots/{}/add".format(pot_id), json={"amount": 1000}, headers=headers)

    resp = client.post(
        "/pots/{}/withdraw".format(pot_id), json={"amount": 5000}, headers=headers
    )
    assert resp.status_code == 400

    get_resp = client.get("/pots/{}".format(pot_id), headers=headers)
    assert get_resp.get_json()["pot"]["total_saved"] == 1000


def test_add_to_pot_zero_or_negative_amount_rejected(client, register_user):
    _, headers, _ = register_user()
    pot_id = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]

    resp = client.post(
        "/pots/{}/add".format(pot_id), json={"amount": 0}, headers=headers
    )
    assert resp.status_code == 400


def test_deleting_pot_releases_balance(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    _add_income(client, headers, category_id, 10000)
    pot_id = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]
    client.post("/pots/{}/add".format(pot_id), json={"amount": 4000}, headers=headers)

    resp = client.delete("/pots/{}".format(pot_id), headers=headers)
    assert resp.status_code == 200

    # Balance is visible indirectly via a fresh pot: adding the full original
    # income should now succeed again since the 4000 is no longer parked.
    pot2_id = client.post(
        "/pots",
        json={"name": "Fresh", "target_amount": 100000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]
    resp2 = client.post(
        "/pots/{}/add".format(pot2_id), json={"amount": 10000}, headers=headers
    )
    assert resp2.status_code == 200


def test_pot_not_owned_by_user_returns_404_on_add(client, register_user):
    _, headers_a, _ = register_user(email="potowner@example.com")
    _, headers_b, _ = register_user(email="potother@example.com")
    pot_id = client.post(
        "/pots",
        json={"name": "Private", "target_amount": 100000, "theme": "blue"},
        headers=headers_a,
    ).get_json()["pot"]["id"]

    resp = client.post(
        "/pots/{}/add".format(pot_id), json={"amount": 100}, headers=headers_b
    )
    assert resp.status_code == 404
