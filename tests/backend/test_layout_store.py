from backend.services.layout_store import LayoutStore


def test_layout_store_returns_empty_when_missing(tmp_path):
    store = LayoutStore(str(tmp_path / "missing.json"))

    assert store.load() == {"nodes": {}, "viewport": None, "updatedAt": None}


def test_layout_store_filters_invalid_positions(tmp_path):
    store = LayoutStore(str(tmp_path / "layout.json"))

    payload = store.save(
        {
            "peer1": {"x": 10, "y": 20},
            "peer2": {"x": "bad", "y": 5},
            "peer3": {"x": 0, "y": None},
        },
        {"x": 4, "y": 8, "scale": 1.1},
    )

    assert payload["nodes"] == {"peer1": {"x": 10.0, "y": 20.0}}
    assert payload["viewport"] == {"x": 4.0, "y": 8.0, "scale": 1.1}
    assert store.load()["nodes"] == {"peer1": {"x": 10.0, "y": 20.0}}
