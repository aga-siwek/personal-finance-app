"""Tests for GET /overview — aggregated dashboard payload."""

from datetime import datetime, timezone

# "unbudgeted" spend is derived from ``compute_spent``, which is bounded to the
# current calendar month. Dating test transactions to *today* keeps these tests
# from breaking at a month boundary.
_TODAY = datetime.now(timezone.utc).date().isoformat()


def _get_category_id(client, headers, name="Groceries"):
    resp = client.get("/categories", headers=headers)
    for category in resp.get_json()["categories"]:
        if category["name"] == name:
            return category["id"]
    raise AssertionError("category {} not found".format(name))


def test_overview_requires_auth(client):
    resp = client.get("/overview")
    assert resp.status_code == 401


def test_overview_empty_state(client, register_user):
    _, headers, _ = register_user()

    resp = client.get("/overview", headers=headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["balance"] == 0
    assert body["income"] == 0
    assert body["expenses"] == 0
    assert body["pots"]["total_count"] == 0
    assert body["budgets"]["total_count"] == 0
    assert body["budgets"]["unbudgeted"] == []
    assert body["latest_transactions"] == []
    assert body["recurring_bills"] == {"paid": 0, "due_soon": 0, "upcoming": 0}


def test_overview_reflects_transactions_and_pots(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Paycheck",
            "amount": 100000,
            "transaction_date": "2026-07-01",
        },
        headers=headers,
    )
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Store",
            "amount": -20000,
            "transaction_date": "2026-07-02",
        },
        headers=headers,
    )
    pot_id = client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 500000, "theme": "blue"},
        headers=headers,
    ).get_json()["pot"]["id"]
    client.post("/pots/{}/add".format(pot_id), json={"amount": 30000}, headers=headers)

    resp = client.get("/overview", headers=headers)
    body = resp.get_json()
    assert body["income"] == 100000
    assert body["expenses"] == 20000
    # balance = 100000 - 20000 - 30000 (parked in pot) = 50000
    assert body["balance"] == 50000
    assert body["pots"]["total_count"] == 1
    assert body["pots"]["total_saved"] == 30000
    assert len(body["latest_transactions"]) == 2


def test_overview_budgets_and_recurring_bills(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 10000, "theme": "green"},
        headers=headers,
    )
    client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 4500,
            "due_day": 15,
        },
        headers=headers,
    )

    resp = client.get("/overview", headers=headers)
    body = resp.get_json()
    assert body["budgets"]["total_count"] == 1
    assert len(body["budgets"]["top"]) == 1
    assert body["budgets"]["top"][0]["max_spend"] == 10000
    assert sum(body["recurring_bills"].values()) == 1


def test_overview_unbudgeted_excludes_budgeted_category(client, register_user):
    _, headers, _ = register_user()
    budgeted_id = _get_category_id(client, headers, name="Groceries")
    unbudgeted_id = _get_category_id(client, headers, name="Shopping")

    client.post(
        "/budgets",
        json={"category_id": budgeted_id, "max_spend": 10000, "theme": "green"},
        headers=headers,
    )
    # Spend in the budgeted category (must NOT show up under unbudgeted)...
    client.post(
        "/transactions",
        json={
            "category_id": budgeted_id,
            "recipient_name": "Store",
            "amount": -3000,
            "transaction_date": _TODAY,
        },
        headers=headers,
    )
    # ...and spend in a category with no budget (must show up).
    client.post(
        "/transactions",
        json={
            "category_id": unbudgeted_id,
            "recipient_name": "Mall",
            "amount": -4500,
            "transaction_date": _TODAY,
        },
        headers=headers,
    )

    body = client.get("/overview", headers=headers).get_json()
    unbudgeted = body["budgets"]["unbudgeted"]
    assert unbudgeted == [{"category_id": unbudgeted_id, "spent": 4500}]


def test_overview_unbudgeted_ignores_income_only_category(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers, name="Shopping")

    # A category with no budget that only ever sees income (positive amounts)
    # has spent == 0 and must not appear under unbudgeted.
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Refund",
            "amount": 7000,
            "transaction_date": _TODAY,
        },
        headers=headers,
    )

    body = client.get("/overview", headers=headers).get_json()
    assert body["budgets"]["unbudgeted"] == []


def test_overview_unbudgeted_sorted_and_capped(client, register_user):
    _, headers, _ = register_user()
    # Seven categories without budgets, each with distinct spend. The endpoint
    # must return the top 5 (OVERVIEW_TOP_N), sorted by spent descending.
    names = [
        "Entertainment",
        "Bills",
        "Groceries",
        "Dining Out",
        "Transportation",
        "Personal Care",
        "Shopping",
    ]
    amounts = [1000, 7000, 3000, 6000, 2000, 5000, 4000]
    for name, amount in zip(names, amounts):
        category_id = _get_category_id(client, headers, name=name)
        client.post(
            "/transactions",
            json={
                "category_id": category_id,
                "recipient_name": name,
                "amount": -amount,
                "transaction_date": _TODAY,
            },
            headers=headers,
        )

    body = client.get("/overview", headers=headers).get_json()
    unbudgeted = body["budgets"]["unbudgeted"]
    spends = [item["spent"] for item in unbudgeted]
    assert len(unbudgeted) == 5
    assert spends == [7000, 6000, 5000, 4000, 3000]


def test_overview_isolated_per_user(client, register_user):
    _, headers_a, _ = register_user(email="ovwa@example.com")
    _, headers_b, _ = register_user(email="ovwb@example.com")
    category_id = _get_category_id(client, headers_a)
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Paycheck",
            "amount": 50000,
            "transaction_date": "2026-07-01",
        },
        headers=headers_a,
    )

    resp_a = client.get("/overview", headers=headers_a)
    resp_b = client.get("/overview", headers=headers_b)
    assert resp_a.get_json()["balance"] == 50000
    assert resp_b.get_json()["balance"] == 0
