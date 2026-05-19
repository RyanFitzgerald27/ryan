# Cup & Handle Scanner

Scans a watchlist of stocks daily for cup-and-handle chart patterns that
are still in the **handle** phase (pre-breakout) and emails an annotated
digest after the close.

Rule-based implementation of William O'Neil's classical criteria
("How to Make Money in Stocks"). It is a screen, not a signal — the false
positive rate of cup-and-handle detection is high by nature. **Run
`backtest.py` and trust your own numbers before trading off the output.**

## Architecture

```
data_fetcher.py    yfinance + local CSV cache (4h TTL), parallel fetch
pattern_detector.py O'Neil cup/handle math -> CupHandleSetup dataclass
chart_generator.py  annotated mplfinance PNG (buy/stop/target + markers)
email_sender.py     Gmail SMTP HTML digest with inline charts
main.py             orchestration + CLI (--dry-run/--ticker/--backtest)
backtest.py         true-positive / false-positive validation harness
.github/workflows/daily_scan.yml   scheduled run, no server
```

Data flow: load watchlist -> parallel fetch -> detect per ticker ->
filter to confidence >= 0.70 -> render charts -> email digest -> log.

## Setup

```bash
cd cup-handle-scanner
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -q                     # offline tests, no network needed
python main.py --ticker NVDA  # smoke test one name
python main.py --dry-run      # full scan, logs only, no email
python backtest.py            # validate before trusting it
```

The watchlist lives in `config/watchlist.txt` (one ticker per line,
`#` comments). If it contains no tickers, the live S&P 500 list is pulled
from Wikipedia at runtime.

## Gmail app password

Regular Gmail passwords no longer work over SMTP. You need an **app
password**:

1. Enable 2-Step Verification on the Google account
   (myaccount.google.com → Security).
2. Go to myaccount.google.com/apppasswords.
3. Create a password named e.g. "cup-handle-scanner". Google shows a
   16-character string.
4. Use that string as `GMAIL_APP_PASSWORD` (no spaces). `GMAIL_USER` is
   the full address; `DIGEST_RECIPIENT` is where the digest goes.

Run locally:

```bash
export GMAIL_USER="you@gmail.com"
export GMAIL_APP_PASSWORD="abcd efgh ijkl mnop"   # 16 chars, no spaces
export DIGEST_RECIPIENT="you@gmail.com"
python main.py
```

## GitHub Actions scheduling (no server)

The workflow runs Mon–Fri at 22:00 UTC (6 PM ET / EDT). To enable it:

1. Push this branch to GitHub.
2. Repo → **Settings → Secrets and variables → Actions →
   New repository secret**. Add three secrets: `GMAIL_USER`,
   `GMAIL_APP_PASSWORD`, `DIGEST_RECIPIENT`.
3. Repo → **Actions** tab → enable workflows if prompted.
4. Open **Daily Cup & Handle Scan** → **Run workflow** to test it
   immediately instead of waiting for the schedule.

Logs upload as a workflow artifact (14-day retention). If the workflow
itself errors, a failure-alert email is sent so silence never means
"all clear". Note GitHub's cron is UTC and does not shift for DST —
change the cron to `0 23 * * 1-5` in winter to stay at 6 PM ET.

## Tuning

All thresholds live at the top of `src/pattern_detector.py`.
`backtest.py` prints concrete tuning advice when TPR < 70% or FPR > 30%.
Change one parameter at a time and re-run — do not loosen thresholds
just to manufacture hits.
