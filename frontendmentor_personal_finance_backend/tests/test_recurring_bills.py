"""Tests for /recurring-bills — CRUD, search/sort, and the derived status
(paid/due_soon/upcoming).

HTTP-level tests cover CRUD and the "paid" case (deterministic: due_day is
set to today's actual day-of-month). due_soon/upcoming boundary behavior is
verified at the service level directly, injecting explicit ``today`` values
— avoiding month-wraparound edge cases that a due_day computed relative to
"today + N days" would introduce through the HTTP layer alone.
"""

from datetime import date

from app.extensions import db
from app.models.user import User
from app.models.recurring_bill import RecurringBill
from app.services import recurring_bill_service


def _get_category_id(client, headers, name="Bills"):
    resp = client.get("/categories", headers=headers)
    for category in resp.get_json()["categories"]:
        if category["name"] == name:
            return category["id"]
    raise AssertionError("category {} not found".format(name))


def test_create_recurring_bill(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    resp = client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 4500,
            "due_day": 15,
        },
        headers=headers,
    )
    assert resp.status_code == 201
    body = resp.get_json()["recurring_bill"]
    assert body["title"] == "Electric Co"
    assert body["status"] in ("paid", "due_soon", "upcoming")


def test_create_recurring_bill_requires_auth(client):
    resp = client.post(
        "/recurring-bills",
        json={"title": "X", "category_id": 1, "amount": 100, "due_day": 1},
    )
    assert resp.status_code == 401


def test_create_recurring_bill_invalid_due_day_rejected(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    resp = client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 4500,
            "due_day": 32,
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_create_recurring_bill_invalid_category_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": 999999,
            "amount": 4500,
            "due_day": 15,
        },
        headers=headers,
    )
    assert resp.status_code == 400


def test_recurring_bill_paid_status_when_matching_transaction_exists(
    client, register_user
):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)

    today = date.today()
    create_resp = client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 4500,
            "due_day": today.day,
        },
        headers=headers,
    )
    assert create_resp.get_json()["recurring_bill"]["status"] != "paid"

    client.post(
        "/transactions",
        json={
            "category_id": category_id,
            "recipient_name": "Electric Co",
            "amount": -4500,
            "transaction_date": today.isoformat(),
        },
        headers=headers,
    )

    bill_id = create_resp.get_json()["recurring_bill"]["id"]
    resp = client.get("/recurring-bills/{}".format(bill_id), headers=headers)
    assert resp.get_json()["recurring_bill"]["status"] == "paid"


def test_list_recurring_bills_search(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
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
    client.post(
        "/recurring-bills",
        json={
            "title": "Internet Provider",
            "category_id": category_id,
            "amount": 6000,
            "due_day": 5,
        },
        headers=headers,
    )

    resp = client.get("/recurring-bills?search=electric", headers=headers)
    bills = resp.get_json()["recurring_bills"]
    assert len(bills) == 1
    assert bills[0]["title"] == "Electric Co"


def test_list_recurring_bills_sort_amount_asc(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    client.post(
        "/recurring-bills",
        json={
            "title": "Big Bill",
            "category_id": category_id,
            "amount": 9000,
            "due_day": 15,
        },
        headers=headers,
    )
    client.post(
        "/recurring-bills",
        json={
            "title": "Small Bill",
            "category_id": category_id,
            "amount": 500,
            "due_day": 5,
        },
        headers=headers,
    )

    resp = client.get("/recurring-bills?sort=amount_asc", headers=headers)
    titles = [b["title"] for b in resp.get_json()["recurring_bills"]]
    assert titles == ["Small Bill", "Big Bill"]


def test_update_recurring_bill(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 4500,
            "due_day": 15,
        },
        headers=headers,
    )
    bill_id = create_resp.get_json()["recurring_bill"]["id"]

    resp = client.put(
        "/recurring-bills/{}".format(bill_id),
        json={"amount": 5000},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["recurring_bill"]["amount"] == 5000


def test_delete_recurring_bill(client, register_user):
    _, headers, _ = register_user()
    category_id = _get_category_id(client, headers)
    create_resp = client.post(
        "/recurring-bills",
        json={
            "title": "Electric Co",
            "category_id": category_id,
            "amount": 4500,
            "due_day": 15,
        },
        headers=headers,
    )
    bill_id = create_resp.get_json()["recurring_bill"]["id"]

    resp = client.delete("/recurring-bills/{}".format(bill_id), headers=headers)
    assert resp.status_code == 200

    get_resp = client.get("/recurring-bills/{}".format(bill_id), headers=headers)
    assert get_resp.status_code == 404


def test_recurring_bill_not_owned_by_user_is_404(client, register_user):
    _, headers_a, _ = register_user(email="billowner@example.com")
    _, headers_b, _ = register_user(email="billother@example.com")
    category_id = _get_category_id(client, headers_a)
    create_resp = client.post(
        "/recurring-bills",
        json={
            "title": "Private Bill",
            "category_id": category_id,
            "amount": 100,
            "due_day": 15,
        },
        headers=headers_a,
    )
    bill_id = create_resp.get_json()["recurring_bill"]["id"]

    resp = client.get("/recurring-bills/{}".format(bill_id), headers=headers_b)
    assert resp.status_code == 404


def test_compute_status_due_soon_and_upcoming_boundaries(app, client, register_user):
    """Service-level: explicit ``today`` avoids month-wraparound edge cases
    that computing due_day relative to 'today + N days' would introduce."""
    _, headers, _ = register_user(email="statususer@example.com")
    category_id = _get_category_id(client, headers)
    create_resp = client.post(
        "/recurring-bills",
        json={
            "title": "Fixed Due Bill",
            "category_id": category_id,
            "amount": 1000,
            "due_day": 15,
        },
        headers=headers,
    )
    bill_id = create_resp.get_json()["recurring_bill"]["id"]

    user = User.query.filter_by(email="statususer@example.com").first()
    bill = db.session.get(RecurringBill, bill_id)

    # Far from due date -> upcoming.
    status = recurring_bill_service.compute_status(user, bill, today=date(2026, 7, 1))
    assert status == "upcoming"

    # Within the 3-day threshold -> due_soon.
    status = recurring_bill_service.compute_status(user, bill, today=date(2026, 7, 13))
    assert status == "due_soon"

    # Exactly on the due date -> due_soon.
    status = recurring_bill_service.compute_status(user, bill, today=date(2026, 7, 15))
    assert status == "due_soon"

    # Past due, still unpaid -> due_soon (no separate "overdue" state).
    status = recurring_bill_service.compute_status(user, bill, today=date(2026, 7, 20))
    assert status == "due_soon"
