"""Cup-and-handle detection using O'Neil's classical criteria.

Reference: William O'Neil, "How to Make Money in Stocks".
The detector hunts for setups still in the *handle* phase (pre-breakout).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, asdict
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# --- Tunable thresholds (single source of truth) ---------------------------
PRIOR_UPTREND_LOOKBACK = 60
PRIOR_UPTREND_MIN_GAIN = 0.30

CUP_MIN_DAYS = 35
CUP_MAX_DAYS = 130
CUP_MIN_DEPTH = 0.12
CUP_MAX_DEPTH = 0.35
RIGHT_RIM_MAX_GAP = 0.15  # right rim within 15% of left rim
CUP_MIN_R2 = 0.6
CUP_LOW_CENTER_BAND = (0.20, 0.80)  # middle 60% of the cup window

HANDLE_MIN_DAYS = 5
HANDLE_MAX_DAYS = 30
HANDLE_MAX_DEPTH_FRAC = 0.33  # of cup depth
ATR_PERIOD = 14

MIN_DOLLAR_VOLUME = 20_000_000  # 30-day avg daily $ volume


@dataclass
class CupHandleSetup:
    ticker: str
    left_rim_date: str
    left_rim_price: float
    cup_low_date: str
    cup_low_price: float
    right_rim_date: str
    right_rim_price: float
    handle_low_date: str
    handle_low_price: float
    current_price: float
    buy_point: float
    stop_loss: float
    measured_target: float
    confidence_score: float
    days_in_handle: int

    def as_dict(self) -> dict:
        return asdict(self)


def _atr(df: pd.DataFrame, period: int = ATR_PERIOD) -> float:
    high, low, close = df["High"], df["Low"], df["Close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    val = tr.rolling(period).mean().iloc[-1]
    return float(val) if pd.notna(val) else float(tr.mean())


def _quadratic_r2(y: np.ndarray) -> tuple[float, float]:
    """Fit y = a*x^2 + b*x + c. Return (r2, a)."""
    x = np.arange(len(y), dtype=float)
    coeffs = np.polyfit(x, y, 2)
    fit = np.polyval(coeffs, x)
    ss_res = float(np.sum((y - fit) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return r2, float(coeffs[0])


def detect_cup_handle(df: pd.DataFrame) -> Optional[CupHandleSetup]:
    """Scan ``df`` for a cup-and-handle currently in its handle phase.

    Returns the best-scoring setup, or ``None`` if no valid pattern exists.
    """
    if df is None or len(df) < CUP_MIN_DAYS + HANDLE_MIN_DAYS + PRIOR_UPTREND_LOOKBACK:
        return None

    close = df["Close"]
    ticker = getattr(df, "ticker_symbol", "") or ""

    # --- Liquidity & trend filters (cheap, fail fast) -----------------------
    dollar_vol = (df["Close"] * df["Volume"]).tail(30).mean()
    if pd.isna(dollar_vol) or dollar_vol < MIN_DOLLAR_VOLUME:
        return None

    sma50 = close.rolling(50).mean()
    sma200 = close.rolling(200).mean()
    cur_price = float(close.iloc[-1])
    if (
        pd.isna(sma50.iloc[-1])
        or pd.isna(sma200.iloc[-1])
        or cur_price < sma50.iloc[-1]
        or cur_price < sma200.iloc[-1]
        or sma50.iloc[-1] < sma200.iloc[-1]  # death cross
    ):
        return None

    n = len(df)
    best: Optional[CupHandleSetup] = None
    best_score = -1.0

    # The handle ends at "now"; iterate plausible handle start points.
    for handle_len in range(HANDLE_MIN_DAYS, HANDLE_MAX_DAYS + 1):
        right_rim_idx = n - 1 - handle_len
        if right_rim_idx < CUP_MIN_DAYS + PRIOR_UPTREND_LOOKBACK:
            continue

        # Right rim must be a local max within a small neighbourhood.
        lo = max(0, right_rim_idx - 3)
        hi = min(n, right_rim_idx + 4)
        if close.iloc[right_rim_idx] < close.iloc[lo:hi].max() - 1e-9:
            continue
        right_rim_price = float(close.iloc[right_rim_idx])

        for cup_len in range(CUP_MIN_DAYS, CUP_MAX_DAYS + 1, 2):
            left_rim_idx = right_rim_idx - cup_len
            if left_rim_idx - PRIOR_UPTREND_LOOKBACK < 0:
                continue

            left_rim_price = float(close.iloc[left_rim_idx])
            if left_rim_price <= 0:
                continue

            # Right rim within 15% of left rim.
            if abs(right_rim_price - left_rim_price) / left_rim_price > RIGHT_RIM_MAX_GAP:
                continue

            cup = close.iloc[left_rim_idx : right_rim_idx + 1]
            cup_low_pos = int(cup.values.argmin())
            cup_low_price = float(cup.iloc[cup_low_pos])
            cup_depth = (left_rim_price - cup_low_price) / left_rim_price
            if not (CUP_MIN_DEPTH <= cup_depth <= CUP_MAX_DEPTH):
                continue

            # Cup low sits in the middle 60% of the window.
            frac = cup_low_pos / cup_len
            if not (CUP_LOW_CENTER_BAND[0] <= frac <= CUP_LOW_CENTER_BAND[1]):
                continue

            # U-shape: quadratic fit, good R^2, opens upward.
            r2, a = _quadratic_r2(cup.values)
            if r2 < CUP_MIN_R2 or a <= 0:
                continue

            # --- Handle validation -------------------------------------
            handle = close.iloc[right_rim_idx : n]
            handle_low_pos = int(handle.values.argmin())
            handle_low_price = float(handle.iloc[handle_low_pos])

            cup_dollar_depth = left_rim_price - cup_low_price
            handle_drop = right_rim_price - handle_low_price
            if handle_drop > HANDLE_MAX_DEPTH_FRAC * cup_dollar_depth:
                continue
            # Handle must stay in the upper half of the cup.
            if handle_low_price < (cup_low_price + right_rim_price) / 2:
                continue
            # Still in the handle: price has not broken above the right rim.
            if cur_price >= right_rim_price:
                continue

            # Declining volume through the handle vs cup average.
            cup_vol = df["Volume"].iloc[left_rim_idx : right_rim_idx + 1].mean()
            handle_vol = df["Volume"].iloc[right_rim_idx:n].tail(20).mean()
            volume_ok = handle_vol < cup_vol

            # --- Prior uptrend: +30% in the 60 bars before the left rim -
            pre = close.iloc[left_rim_idx - PRIOR_UPTREND_LOOKBACK : left_rim_idx + 1]
            prior_gain = (pre.iloc[-1] - pre.iloc[0]) / pre.iloc[0]
            if prior_gain < PRIOR_UPTREND_MIN_GAIN:
                continue

            # --- Score & record ----------------------------------------
            depth_fit = 1.0 - abs(cup_depth - 0.22) / 0.22  # ~22% is ideal
            sym = 1.0 - abs(frac - 0.5) * 2  # 1.0 when low is centred
            confidence = float(
                np.clip(
                    0.35 * r2
                    + 0.25 * max(0.0, sym)
                    + 0.20 * max(0.0, depth_fit)
                    + 0.10 * (1.0 if volume_ok else 0.0)
                    + 0.10 * min(1.0, prior_gain / 0.5),
                    0.0,
                    1.0,
                )
            )
            if confidence <= best_score:
                continue

            atr = _atr(df)
            best_score = confidence
            best = CupHandleSetup(
                ticker=ticker,
                left_rim_date=str(df.index[left_rim_idx].date()),
                left_rim_price=round(left_rim_price, 2),
                cup_low_date=str(df.index[left_rim_idx + cup_low_pos].date()),
                cup_low_price=round(cup_low_price, 2),
                right_rim_date=str(df.index[right_rim_idx].date()),
                right_rim_price=round(right_rim_price, 2),
                handle_low_date=str(df.index[right_rim_idx + handle_low_pos].date()),
                handle_low_price=round(handle_low_price, 2),
                current_price=round(cur_price, 2),
                buy_point=round(right_rim_price * 1.001, 2),
                stop_loss=round(handle_low_price - atr, 2),
                measured_target=round(right_rim_price + cup_dollar_depth, 2),
                confidence_score=round(confidence, 3),
                days_in_handle=handle_len,
            )

    return best
