"""Tests for /admin/* — all gated by @require_admin, cross-user access."""

from app.extensions import db
from app.models.user import User


def _make_admin(email):
    """Promote a just-registered user to admin directly in the DB (no admin
    exists yet to call POST /admin/users/:id/promote with)."""
    user = User.query.filter_by(email=email).first()
    user.is_admin = True
    db.session.commit()


def _login(client, email, password="password123"):
    resp = client.post("/auth/login", json={"email": email, "password": password})
    token = resp.get_json()["access_token"]
    return {"Authorization": "Bearer {}".format(token)}


def _admin_headers(client, register_user, email="admin@example.com"):
    register_user(email=email)
    _make_admin(email)
    return _login(client, email)


def test_admin_routes_require_auth(client):
    resp = client.get("/admin/users")
    assert resp.status_code == 401


def test_admin_routes_reject_non_admin(client, register_user):
    _, headers, _ = register_user(email="regular@example.com")

    resp = client.get("/admin/users", headers=headers)
    assert resp.status_code == 403


def test_admin_list_users(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    register_user(email="someone@example.com")

    resp = client.get("/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["total"] >= 2
    emails = {u["email"] for u in body["users"]}
    assert "someone@example.com" in emails


def test_admin_get_user(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    register_user(email="target@example.com")
    target = User.query.filter_by(email="target@example.com").first()

    resp = client.get("/admin/users/{}".format(target.id), headers=admin_headers)
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "target@example.com"


def test_admin_list_users_rejects_oversized_per_page(client, register_user):
    admin_headers = _admin_headers(client, register_user)

    resp = client.get("/admin/users?per_page=1000", headers=admin_headers)
    assert resp.status_code == 400


def test_admin_list_users_rejects_invalid_page(client, register_user):
    admin_headers = _admin_headers(client, register_user)

    resp = client.get("/admin/users?page=0", headers=admin_headers)
    assert resp.status_code == 400


def test_admin_get_user_not_found(client, register_user):
    admin_headers = _admin_headers(client, register_user)

    resp = client.get("/admin/users/999999", headers=admin_headers)
    assert resp.status_code == 404


def test_admin_update_user(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    register_user(email="editme@example.com")
    target = User.query.filter_by(email="editme@example.com").first()

    resp = client.put(
        "/admin/users/{}".format(target.id),
        json={"name": "Edited By Admin"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["user"]["name"] == "Edited By Admin"


def test_admin_promote_and_demote_user(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    register_user(email="promoteme@example.com")
    target = User.query.filter_by(email="promoteme@example.com").first()

    promote_resp = client.post(
        "/admin/users/{}/promote".format(target.id), headers=admin_headers
    )
    assert promote_resp.status_code == 200
    assert promote_resp.get_json()["user"]["is_admin"] is True

    demote_resp = client.post(
        "/admin/users/{}/demote".format(target.id), headers=admin_headers
    )
    assert demote_resp.status_code == 200
    assert demote_resp.get_json()["user"]["is_admin"] is False


def test_admin_cannot_demote_self(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    admin = User.query.filter_by(email="admin@example.com").first()

    resp = client.post(
        "/admin/users/{}/demote".format(admin.id), headers=admin_headers
    )
    assert resp.status_code == 400


def test_admin_delete_user(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    register_user(email="deleteme@example.com")
    target = User.query.filter_by(email="deleteme@example.com").first()

    resp = client.delete("/admin/users/{}".format(target.id), headers=admin_headers)
    assert resp.status_code == 200

    get_resp = client.get(
        "/admin/users/{}".format(target.id), headers=admin_headers
    )
    assert get_resp.status_code == 404


def test_admin_can_see_another_users_transactions(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    _, user_headers, _ = register_user(email="txowner@example.com")

    category_id = client.get("/categories", headers=user_headers).get_json()[
        "categories"
    ][0]["id"]
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Store",
            "amount": -1000,
            "transaction_date": "2026-07-01",
        },
        headers=user_headers,
    )

    resp = client.get("/admin/transactions/all", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.get_json()["total"] >= 1


def test_admin_can_filter_transactions_by_user(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    _, user_headers, _ = register_user(email="filtertarget@example.com")
    user = User.query.filter_by(email="filtertarget@example.com").first()

    category_id = client.get("/categories", headers=user_headers).get_json()[
        "categories"
    ][0]["id"]
    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Store",
            "amount": -1000,
            "transaction_date": "2026-07-01",
        },
        headers=user_headers,
    )

    resp = client.get(
        "/admin/transactions/all?user_id={}".format(user.id), headers=admin_headers
    )
    body = resp.get_json()
    assert body["total"] == 1


def test_admin_delete_transaction_is_soft_delete(client, register_user):
    admin_headers = _admin_headers(client, register_user)
    _, user_headers, _ = register_user(email="admindeltx@example.com")
    category_id = client.get("/categories", headers=user_headers).get_json()[
        "categories"
    ][0]["id"]
    create_resp = client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Store",
            "amount": -1000,
            "transaction_date": "2026-07-01",
        },
        headers=user_headers,
    )
    transaction_id = create_resp.get_json()["transaction"]["id"]

    resp = client.delete(
        "/admin/transactions/{}".format(transaction_id), headers=admin_headers
    )
    assert resp.status_code == 200

    # The user's own view excludes it (soft-deleted).
    user_get_resp = client.get(
        "/transactions/{}".format(transaction_id), headers=user_headers
    )
    assert user_get_resp.status_code == 404

    # But admin can still see it directly (audit visibility).
    admin_get_resp = client.get(
        "/admin/transactions/{}".format(transaction_id), headers=admin_headers
    )
    assert admin_get_resp.status_code == 200


def test_admin_can_list_all_categories_budgets_pots_recurring_bills(
    client, register_user
):
    admin_headers = _admin_headers(client, register_user)
    _, user_headers, _ = register_user(email="fulldata@example.com")
    category_id = client.get("/categories", headers=user_headers).get_json()[
        "categories"
    ][0]["id"]
    client.post(
        "/budgets",
        json={"category_id": category_id, "max_spend": 5000, "theme": "green"},
        headers=user_headers,
    )
    client.post(
        "/pots",
        json={"name": "Vacation", "target_amount": 10000, "theme": "blue"},
        headers=user_headers,
    )
    client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 1000,
            "due_day": 15,
        },
        headers=user_headers,
    )

    assert client.get("/admin/categories/all", headers=admin_headers).status_code == 200
    assert client.get("/admin/budgets/all", headers=admin_headers).status_code == 200
    assert client.get("/admin/pots/all", headers=admin_headers).status_code == 200
    assert (
        client.get("/admin/recurring-bills/all", headers=admin_headers).status_code
        == 200
    )

    budgets = client.get("/admin/budgets/all", headers=admin_headers).get_json()[
        "budgets"
    ]
    assert any("spent" in b and "remaining" in b for b in budgets)

    bills = client.get(
        "/admin/recurring-bills/all", headers=admin_headers
    ).get_json()["recurring_bills"]
    assert any("status" in b for b in bills)


def test_admin_reports(client, register_user):
    admin_headers = _admin_headers(client, register_user)

    summary_resp = client.get("/admin/reports", headers=admin_headers)
    assert summary_resp.status_code == 200
    assert "total_users" in summary_resp.get_json()

    tx_resp = client.get("/admin/reports/transactions", headers=admin_headers)
    assert tx_resp.status_code == 200
    assert "total_count" in tx_resp.get_json()

    users_resp = client.get("/admin/reports/users", headers=admin_headers)
    assert users_resp.status_code == 200
    assert "admin_users" in users_resp.get_json()
