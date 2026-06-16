"""Detector must catch a textbook cup-and-handle and reject other shapes."""

import numpy as np
import pandas as pd

from src.pattern_detector import detect_cup_handle


def _frame(closes: np.ndarray, volume: np.ndarray) -> pd.DataFrame:
    idx = pd.date_range("2022-01-03", periods=len(closes), freq="B")
    df = pd.DataFrame(
        {
            "Open": closes,
            "High": closes * 1.01,
            "Low": closes * 0.99,
            "Close": closes,
            "Volume": volume,
        },
        index=idx,
    )
    df.ticker_symbol = "TEST"
    return df


def _textbook_cup_handle() -> pd.DataFrame:
    flat = np.full(100, 35.0)
    run_up = np.linspace(35, 50, 60)            # +43% prior uptrend
    x = np.linspace(-1, 1, 80)
    cup = 40 + 10 * x**2                        # U-shape, 50 -> 40 -> 50
    handle = np.array(
        [50, 49.6, 49.2, 48.8, 48.5, 48.4, 48.6, 48.8, 49.0, 49.1, 49.2, 49.2]
    )
    closes = np.concatenate([flat, run_up, cup, handle])
    volume = np.concatenate(
        [
            np.full(100 + 60, 1_000_000.0),
            np.full(80, 1_200_000.0),          # heavier through the cup
            np.full(len(handle), 600_000.0),   # drying up in the handle
        ]
    )
    return _frame(closes, volume)


def _head_and_shoulders() -> pd.DataFrame:
    flat = np.full(120, 35.0)
    run_up = np.linspace(35, 45, 60)
    left = np.concatenate([np.linspace(45, 52, 20), np.linspace(52, 46, 20)])
    head = np.concatenate([np.linspace(46, 60, 20), np.linspace(60, 46, 20)])
    right = np.concatenate([np.linspace(46, 51, 20), np.linspace(51, 44, 20)])
    closes = np.concatenate([flat, run_up, left, head, right])
    volume = np.full(len(closes), 1_000_000.0)
    return _frame(closes, volume)


def test_detects_textbook_cup_handle():
    setup = detect_cup_handle(_textbook_cup_handle())
    assert setup is not None, "textbook cup-and-handle was not detected"
    assert setup.confidence_score >= 0.7
    assert setup.buy_point > setup.current_price
    assert setup.stop_loss < setup.handle_low_price
    assert setup.measured_target > setup.buy_point
    assert 5 <= setup.days_in_handle <= 30


def test_rejects_head_and_shoulders():
    assert detect_cup_handle(_head_and_shoulders()) is None


def test_rejects_short_series():
    closes = np.linspace(10, 12, 40)
    assert detect_cup_handle(_frame(closes, np.full(40, 1e6))) is None


def test_rejects_illiquid_name():
    df = _textbook_cup_handle()
    df["Volume"] = 100.0  # ~5k$ daily dollar volume
    assert detect_cup_handle(df) is None
