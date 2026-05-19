"""Validate the detector against known setups and measure false positives.

This is the most important script in the project: do not trust the
scanner's output until it passes here. Network access (yfinance) is
required.

    python backtest.py
"""

from __future__ import annotations

import logging
import random

import pandas as pd

from src.data_fetcher import fetch_history
from src.pattern_detector import detect_cup_handle

logging.basicConfig(level=logging.WARNING)

# (ticker, approx breakout date). These are illustrative anchors — replace
# with breakouts you have personally verified before relying on the numbers.
KNOWN_SETUPS = [
    ("NVDA", "2024-02-12"),
    ("META", "2024-02-02"),
    ("DDOG", "2024-05-06"),
    ("AVGO", "2024-03-08"),
    ("CRWD", "2024-03-04"),
    ("AMD", "2024-01-19"),
    ("PANW", "2024-01-08"),
    ("ANET", "2024-02-13"),
    ("MU", "2024-03-21"),
    ("NFLX", "2024-01-24"),
]

PRICE_TOLERANCE = 0.02


def _within(a: float, b: float, tol: float = PRICE_TOLERANCE) -> bool:
    return b != 0 and abs(a - b) / b <= tol


def test_known_setups() -> tuple[int, int]:
    tp = fn = 0
    for ticker, breakout in KNOWN_SETUPS:
        df = fetch_history(ticker, period="5y")
        if df is None:
            print(f"  {ticker}: no data")
            fn += 1
            continue
        cutoff = pd.Timestamp(breakout) - pd.Timedelta(days=3)
        window = df[df.index <= cutoff]
        window.ticker_symbol = ticker
        setup = detect_cup_handle(window)
        if setup is None:
            print(f"  {ticker}: MISSED (breakout {breakout})")
            fn += 1
            continue
        tp += 1
        print(
            f"  {ticker}: FOUND conf={setup.confidence_score:.2f} "
            f"buy=${setup.buy_point} stop=${setup.stop_loss}"
        )
    return tp, fn


def measure_false_positives(sample: int = 100) -> float:
    try:
        url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        pool = pd.read_html(url)[0]["Symbol"].astype(str).tolist()
    except Exception:
        pool = ["AAPL", "MSFT", "JPM", "XOM", "PG", "KO", "WMT", "T", "VZ", "PFE"]
    random.seed(42)
    picks = random.sample(pool, min(sample, len(pool)))
    cutoff = "2024-06-28"
    hits = scanned = 0
    for ticker in picks:
        df = fetch_history(ticker.replace(".", "-"), period="5y")
        if df is None:
            continue
        window = df[df.index <= pd.Timestamp(cutoff)]
        window.ticker_symbol = ticker
        scanned += 1
        if detect_cup_handle(window) is not None:
            hits += 1
    return hits / scanned if scanned else 0.0


def main() -> None:
    print("== Known setups ==")
    tp, fn = test_known_setups()
    total = tp + fn
    tpr = tp / total if total else 0.0
    print(f"\nTrue positive rate: {tpr:.0%} ({tp}/{total})")

    print("\n== False-positive sweep (random S&P 500, 2024-06-28) ==")
    fpr = measure_false_positives()
    print(f"False positive rate: {fpr:.0%}")

    print("\n== Verdict ==")
    if tpr < 0.70:
        print(
            "TPR < 70%. Detector is too strict. Consider: relax CUP_MIN_R2 "
            "(0.6 -> 0.5), widen CUP_MAX_DEPTH, or widen RIGHT_RIM_MAX_GAP. "
            "Change one parameter at a time and re-run."
        )
    if fpr > 0.30:
        print(
            "FPR > 30%. Detector is too loose. Consider: raise CUP_MIN_R2, "
            "tighten CUP_LOW_CENTER_BAND, or require volume_ok. Do not "
            "blindly lower thresholds to chase hits."
        )
    if tpr >= 0.70 and fpr <= 0.30:
        print("Within target band (TPR>=70%, FPR<=30%).")


if __name__ == "__main__":
    main()
