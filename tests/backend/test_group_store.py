from backend.services.group_store import GroupStore


def test_group_store_returns_empty_when_missing(tmp_path):
    store = GroupStore(str(tmp_path / "missing.json"))

    assert store.load() == {"groups": {}, "updatedAt": None}


def test_group_store_filters_invalid_groups(tmp_path):
    store = GroupStore(str(tmp_path / "groups.json"))

    payload = store.save(
        {
            "beta": ["Production", "  Edge  ", "production", "", 8],
            "": ["ignored"],
            "gamma": "not-a-list",
        }
    )

    assert payload["groups"] == {"beta": ["Production", "Edge"]}
    assert store.load()["groups"] == {"beta": ["Production", "Edge"]}
