"""Cup-and-handle scanner orchestrator.

Usage:
    python main.py                 # full scan + email digest
    python main.py --dry-run       # scan + log, no email
    python main.py --ticker NVDA   # scan a single ticker, print result
    python main.py --backtest 2024-06-01   # treat that date as "today"
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

import pandas as pd

from src.chart_generator import generate_chart
from src.data_fetcher import fetch_history, fetch_universe
from src.email_sender import send_digest
from src.pattern_detector import detect_cup_handle

BASE = Path(__file__).resolve().parent
WATCHLIST = BASE / "config" / "watchlist.txt"
LOG_DIR = BASE / "logs"
CONFIDENCE_THRESHOLD = 0.70

logger = logging.getLogger("scanner")


def _setup_logging() -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(LOG_DIR / f"{time.strftime('%Y-%m-%d')}.log"),
        ],
    )


def _sp500_tickers() -> list[str]:
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    tables = pd.read_html(url)
    syms = tables[0]["Symbol"].astype(str).str.replace(".", "-", regex=False)
    return sorted(syms.tolist())


def load_watchlist() -> list[str]:
    tickers: list[str] = []
    if WATCHLIST.exists():
        for line in WATCHLIST.read_text().splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                tickers.append(line.upper())
    if not tickers:
        logger.info("Watchlist empty — pulling live S&P 500 list")
        tickers = _sp500_tickers()
    return tickers


def _apply_backtest_cutoff(df: pd.DataFrame, cutoff: str) -> pd.DataFrame:
    return df[df.index <= pd.Timestamp(cutoff)]


def scan_one(ticker: str, backtest: str | None) -> tuple[object, pd.DataFrame] | None:
    df = fetch_history(ticker)
    if df is None:
        return None
    if backtest:
        df = _apply_backtest_cutoff(df, backtest)
        if df.empty:
            return None
    df.ticker_symbol = ticker  # consumed by detect_cup_handle
    setup = detect_cup_handle(df)
    if setup is None:
        return None
    setup.ticker = ticker
    return setup, df


def run(dry_run: bool, backtest: str | None) -> int:
    t0 = time.time()
    tickers = load_watchlist()
    logger.info("Scanning %d tickers (backtest=%s)", len(tickers), backtest)

    fetch_universe(tickers)  # warm the cache in parallel
    logger.info("Fetch phase: %.1fs", time.time() - t0)

    setups, charts = [], {}
    t1 = time.time()
    for ticker in tickers:
        try:
            result = scan_one(ticker, backtest)
        except Exception as exc:
            logger.error("Scan failed for %s: %s", ticker, exc)
            continue
        if not result:
            continue
        setup, df = result
        if setup.confidence_score < CONFIDENCE_THRESHOLD:
            logger.info(
                "%s below threshold (conf=%.2f)", ticker, setup.confidence_score
            )
            continue
        logger.info("HIT %s conf=%.2f", ticker, setup.confidence_score)
        setups.append(setup)
        try:
            charts[ticker] = generate_chart(setup, df)
        except Exception as exc:
            logger.error("Chart failed for %s: %s", ticker, exc)

    logger.info("Detection phase: %.1fs, %d setups", time.time() - t1, len(setups))

    if dry_run:
        for s in sorted(setups, key=lambda x: x.confidence_score, reverse=True):
            logger.info("DRY-RUN %s", s.as_dict())
    else:
        send_digest(setups, charts)

    logger.info("Total runtime: %.1fs", time.time() - t0)
    return len(setups)


def main() -> None:
    parser = argparse.ArgumentParser(description="Cup-and-handle scanner")
    parser.add_argument("--dry-run", action="store_true", help="no email")
    parser.add_argument("--ticker", help="scan a single ticker and print")
    parser.add_argument("--backtest", help="treat YYYY-MM-DD as today")
    args = parser.parse_args()

    _setup_logging()

    if args.ticker:
        result = scan_one(args.ticker.upper(), args.backtest)
        if result:
            print(result[0].as_dict())
        else:
            print(f"No setup for {args.ticker.upper()}")
        return

    run(dry_run=args.dry_run, backtest=args.backtest)


if __name__ == "__main__":
    main()
