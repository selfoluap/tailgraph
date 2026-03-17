from backend.services.layout_store import LayoutStore


def test_layout_store_returns_empty_when_missing(tmp_path):
    store = LayoutStore(str(tmp_path / "missing.json"))

    assert store.load() == {
        "activeView": "view1",
        "views": {
            "view1": {"nodes": {}, "viewport": None, "showConnections": True, "showGrid": False, "updatedAt": None},
            "view2": {"nodes": {}, "viewport": None, "showConnections": True, "showGrid": False, "updatedAt": None},
            "view3": {"nodes": {}, "viewport": None, "showConnections": True, "showGrid": False, "updatedAt": None},
            "view4": {"nodes": {}, "viewport": None, "showConnections": True, "showGrid": False, "updatedAt": None},
            "view5": {"nodes": {}, "viewport": None, "showConnections": True, "showGrid": False, "updatedAt": None},
        },
        "nodes": {},
        "viewport": None,
        "showConnections": True,
        "showGrid": False,
        "updatedAt": None,
    }


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
    assert payload["showConnections"] is True
    assert payload["showGrid"] is False
    assert store.load()["nodes"] == {"peer1": {"x": 10.0, "y": 20.0}}


def test_layout_store_preserves_multiple_views(tmp_path):
    store = LayoutStore(str(tmp_path / "layout.json"))

    first = store.save({"peer1": {"x": 1, "y": 2}}, {"x": 0, "y": 0, "scale": 1}, "view1", False, True)
    second = store.save({"peer2": {"x": 3, "y": 4}}, {"x": 5, "y": 6, "scale": 1.5}, "view2", True, False)

    assert first["activeView"] == "view1"
    assert second["activeView"] == "view2"
    assert second["views"]["view1"]["nodes"] == {"peer1": {"x": 1.0, "y": 2.0}}
    assert second["views"]["view1"]["showConnections"] is False
    assert second["views"]["view1"]["showGrid"] is True
    assert second["views"]["view2"]["nodes"] == {"peer2": {"x": 3.0, "y": 4.0}}
    assert second["views"]["view2"]["showConnections"] is True
    assert second["views"]["view2"]["showGrid"] is False
    assert store.load()["views"]["view1"]["nodes"] == {"peer1": {"x": 1.0, "y": 2.0}}
    assert store.load()["views"]["view2"]["viewport"] == {"x": 5.0, "y": 6.0, "scale": 1.5}


def test_layout_store_defaults_legacy_layout_to_visible_connections(tmp_path):
    config_path = tmp_path / "layout.json"
    config_path.write_text(
        '{"nodes":{"peer1":{"x":1,"y":2}},"viewport":{"x":3,"y":4,"scale":1.2},"updatedAt":123}',
        encoding="utf-8",
    )

    store = LayoutStore(str(config_path))

    payload = store.load()

    assert payload["showConnections"] is True
    assert payload["showGrid"] is False
    assert payload["views"]["view1"]["showConnections"] is True
    assert payload["views"]["view1"]["showGrid"] is False
