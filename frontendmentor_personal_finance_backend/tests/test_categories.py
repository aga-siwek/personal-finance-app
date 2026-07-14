"""Tests for /categories — CRUD, default seeding, and user isolation."""

DEFAULT_CATEGORY_NAMES = [
    "Entertainment",
    "Bills",
    "Groceries",
    "Dining Out",
    "Transportation",
    "Personal Care",
    "Shopping",
    "Lifestyle",
    "Education",
    "General",
]


def test_signup_seeds_default_categories(client, register_user):
    _, headers, _ = register_user()

    resp = client.get("/categories", headers=headers)
    assert resp.status_code == 200
    names = {c["name"] for c in resp.get_json()["categories"]}
    assert names == set(DEFAULT_CATEGORY_NAMES)


def test_list_categories_requires_auth(client):
    resp = client.get("/categories")
    assert resp.status_code == 401


def test_create_category(client, register_user):
    _, headers, _ = register_user()

    resp = client.post("/categories", json={"name": "Hobbies"}, headers=headers)
    assert resp.status_code == 201
    assert resp.get_json()["category"]["name"] == "Hobbies"


def test_create_category_duplicate_name_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.post("/categories", json={"name": "General"}, headers=headers)
    assert resp.status_code == 409


def test_create_category_empty_name_rejected(client, register_user):
    _, headers, _ = register_user()

    resp = client.post("/categories", json={"name": ""}, headers=headers)
    assert resp.status_code == 400


def test_two_users_can_each_have_a_category_with_the_same_name(client, register_user):
    _, headers_a, _ = register_user(email="catuser1@example.com")
    _, headers_b, _ = register_user(email="catuser2@example.com")

    resp_a = client.post("/categories", json={"name": "Side Project"}, headers=headers_a)
    resp_b = client.post("/categories", json={"name": "Side Project"}, headers=headers_b)
    assert resp_a.status_code == 201
    assert resp_b.status_code == 201


def test_get_category(client, register_user):
    _, headers, _ = register_user()
    create_resp = client.post("/categories", json={"name": "Hobbies"}, headers=headers)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.get("/categories/{}".format(category_id), headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["category"]["name"] == "Hobbies"


def test_get_category_not_owned_by_user_is_404(client, register_user):
    _, headers_a, _ = register_user(email="owner@example.com")
    _, headers_b, _ = register_user(email="other@example.com")

    create_resp = client.post("/categories", json={"name": "Private"}, headers=headers_a)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.get("/categories/{}".format(category_id), headers=headers_b)
    assert resp.status_code == 404


def test_update_category_name(client, register_user):
    _, headers, _ = register_user()
    create_resp = client.post("/categories", json={"name": "Hobbies"}, headers=headers)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.put(
        "/categories/{}".format(category_id),
        json={"name": "Hobbies & Crafts"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.get_json()["category"]["name"] == "Hobbies & Crafts"


def test_update_category_name_collision_rejected(client, register_user):
    _, headers, _ = register_user()
    create_resp = client.post("/categories", json={"name": "Hobbies"}, headers=headers)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.put(
        "/categories/{}".format(category_id),
        json={"name": "General"},
        headers=headers,
    )
    assert resp.status_code == 409


def test_update_category_not_owned_by_user_is_404(client, register_user):
    _, headers_a, _ = register_user(email="owner2@example.com")
    _, headers_b, _ = register_user(email="other2@example.com")

    create_resp = client.post("/categories", json={"name": "Private"}, headers=headers_a)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.put(
        "/categories/{}".format(category_id),
        json={"name": "Hijacked"},
        headers=headers_b,
    )
    assert resp.status_code == 404


def test_delete_category(client, register_user):
    _, headers, _ = register_user()
    create_resp = client.post("/categories", json={"name": "Hobbies"}, headers=headers)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.delete("/categories/{}".format(category_id), headers=headers)
    assert resp.status_code == 200

    get_resp = client.get("/categories/{}".format(category_id), headers=headers)
    assert get_resp.status_code == 404


def test_delete_category_not_owned_by_user_is_404(client, register_user):
    _, headers_a, _ = register_user(email="owner3@example.com")
    _, headers_b, _ = register_user(email="other3@example.com")

    create_resp = client.post("/categories", json={"name": "Private"}, headers=headers_a)
    category_id = create_resp.get_json()["category"]["id"]

    resp = client.delete("/categories/{}".format(category_id), headers=headers_b)
    assert resp.status_code == 404
