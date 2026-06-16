"""Annotated candlestick chart generation for detected setups."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import mplfinance as mpf  # noqa: E402
import pandas as pd  # noqa: E402

from .pattern_detector import CupHandleSetup  # noqa: E402

logger = logging.getLogger(__name__)

CHART_DIR = Path(__file__).resolve().parent.parent / "charts"


def generate_chart(setup: CupHandleSetup, df: pd.DataFrame) -> Path:
    """Render an annotated PNG for ``setup`` and return its path."""
    CHART_DIR.mkdir(parents=True, exist_ok=True)
    plot_df = df.tail(168).copy()  # ~8 months of trading days

    hlines = dict(
        hlines=[setup.buy_point, setup.stop_loss, setup.measured_target],
        colors=["green", "red", "blue"],
        linestyle=["-", "-", "--"],
        linewidths=[1.0, 1.0, 1.0],
    )

    def _marker(date_str: str, price: float) -> pd.Series:
        s = pd.Series(float("nan"), index=plot_df.index)
        ts = pd.Timestamp(date_str)
        if ts in s.index:
            s.loc[ts] = price
        return s

    addplots = []
    for date_str, price, color in (
        (setup.left_rim_date, setup.left_rim_price, "purple"),
        (setup.cup_low_date, setup.cup_low_price, "orange"),
        (setup.right_rim_date, setup.right_rim_price, "purple"),
        (setup.handle_low_date, setup.handle_low_price, "red"),
    ):
        marker = _marker(date_str, price)
        if marker.notna().any():
            addplots.append(
                mpf.make_addplot(
                    marker, type="scatter", markersize=90, marker="o", color=color
                )
            )

    fname = CHART_DIR / f"{setup.ticker}_{datetime.now():%Y%m%d}.png"
    title = (
        f"{setup.ticker}  conf={setup.confidence_score:.2f}  "
        f"day {setup.days_in_handle} of handle\n"
        f"Buy ${setup.buy_point}  Stop ${setup.stop_loss}  "
        f"Target ${setup.measured_target}"
    )

    mpf.plot(
        plot_df,
        type="candle",
        style="yahoo",
        title=title,
        mav=(50, 200),
        volume=True,
        addplot=addplots or None,
        hlines=hlines,
        figsize=(13, 8),
        savefig=dict(fname=str(fname), dpi=120, bbox_inches="tight"),
    )
    logger.info("Chart written: %s", fname.name)
    return fname
