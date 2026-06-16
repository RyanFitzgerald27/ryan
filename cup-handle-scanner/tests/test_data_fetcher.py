"""Data fetcher: caching behaviour and graceful failure (no network)."""

import time

import pandas as pd
import pytest

import src.data_fetcher as dfetch


@pytest.fixture
def tmp_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(dfetch, "CACHE_DIR", tmp_path)
    return tmp_path


def _sample() -> pd.DataFrame:
    idx = pd.date_range("2024-01-01", periods=5, freq="B")
    return pd.DataFrame(
        {
            "Open": [1, 2, 3, 4, 5],
            "High": [1, 2, 3, 4, 5],
            "Low": [1, 2, 3, 4, 5],
            "Close": [1, 2, 3, 4, 5],
            "Volume": [10, 10, 10, 10, 10],
        },
        index=idx,
    )


def test_cache_hit(tmp_cache, monkeypatch):
    path = dfetch._cache_path("FOO", "2y")
    _sample().to_csv(path)

    def _boom(*a, **k):
        raise AssertionError("network must not be hit on a cache hit")

    monkeypatch.setattr(dfetch, "fetch_history", dfetch.fetch_history)
    monkeypatch.setitem(__import__("sys").modules, "yfinance", type("M", (), {"Ticker": _boom}))
    out = dfetch.fetch_history("FOO", "2y")
    assert out is not None and len(out) == 5


def test_cache_miss_when_stale(tmp_cache):
    path = dfetch._cache_path("BAR", "2y")
    _sample().to_csv(path)
    old = time.time() - dfetch.CACHE_MAX_AGE_SECONDS - 10
    import os

    os.utime(path, (old, old))
    assert dfetch._read_cache(path) is None


def test_bad_ticker_returns_none(tmp_cache, monkeypatch):
    class _T:
        def __init__(self, *a, **k):
            pass

        def history(self, *a, **k):
            return pd.DataFrame()

    monkeypatch.setitem(
        __import__("sys").modules, "yfinance", type("M", (), {"Ticker": _T})
    )
    assert dfetch.fetch_history("NOPE", "2y") is None


def test_empty_universe():
    assert dfetch.fetch_universe([]) == {}
