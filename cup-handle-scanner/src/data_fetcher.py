"""Daily OHLCV data fetching with local CSV caching."""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"
CACHE_MAX_AGE_SECONDS = 4 * 60 * 60  # refresh cache entries older than 4 hours
_OHLCV_COLUMNS = ["Open", "High", "Low", "Close", "Volume"]


def _cache_path(ticker: str, period: str) -> Path:
    return CACHE_DIR / f"{ticker.upper()}_{period}.csv"


def _read_cache(path: Path) -> Optional[pd.DataFrame]:
    if not path.exists():
        return None
    age = time.time() - path.stat().st_mtime
    if age > CACHE_MAX_AGE_SECONDS:
        logger.debug("Cache for %s stale (%.0fs old)", path.name, age)
        return None
    try:
        df = pd.read_csv(path, index_col=0, parse_dates=True)
    except Exception as exc:  # pragma: no cover - corrupt cache is rare
        logger.warning("Failed to read cache %s: %s", path.name, exc)
        return None
    if df.empty or not set(_OHLCV_COLUMNS).issubset(df.columns):
        return None
    logger.debug("Cache hit for %s", path.name)
    return df


def _write_cache(path: Path, df: pd.DataFrame) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    try:
        df.to_csv(path)
    except Exception as exc:  # pragma: no cover
        logger.warning("Failed to write cache %s: %s", path.name, exc)


def fetch_history(ticker: str, period: str = "2y") -> Optional[pd.DataFrame]:
    """Return daily OHLCV history for ``ticker``.

    Returns a DataFrame indexed by date with columns
    [Open, High, Low, Close, Volume], or ``None`` on any failure.
    """
    ticker = ticker.strip().upper()
    if not ticker:
        return None

    cached = _read_cache(_cache_path(ticker, period))
    if cached is not None:
        return cached

    try:
        import yfinance as yf

        df = yf.Ticker(ticker).history(period=period, auto_adjust=True)
    except Exception as exc:
        logger.error("yfinance error for %s: %s", ticker, exc)
        return None

    if df is None or df.empty:
        logger.warning("No data returned for %s", ticker)
        return None

    df = df[[c for c in _OHLCV_COLUMNS if c in df.columns]].copy()
    if not set(_OHLCV_COLUMNS).issubset(df.columns):
        logger.warning("Incomplete columns for %s: %s", ticker, list(df.columns))
        return None
    df.index = pd.to_datetime(df.index).tz_localize(None)
    df = df.dropna()
    if df.empty:
        return None

    _write_cache(_cache_path(ticker, period), df)
    return df


def fetch_universe(
    tickers: list[str], period: str = "2y", max_workers: int = 8
) -> dict[str, pd.DataFrame]:
    """Fetch many tickers in parallel. Failed tickers are omitted."""
    results: dict[str, pd.DataFrame] = {}
    unique = sorted({t.strip().upper() for t in tickers if t.strip()})
    if not unique:
        return results

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(fetch_history, t, period): t for t in unique
        }
        for fut in as_completed(futures):
            ticker = futures[fut]
            try:
                df = fut.result()
            except Exception as exc:  # pragma: no cover - defensive
                logger.error("Unexpected error fetching %s: %s", ticker, exc)
                continue
            if df is not None:
                results[ticker] = df

    logger.info(
        "Fetched %d/%d tickers successfully", len(results), len(unique)
    )
    return results
