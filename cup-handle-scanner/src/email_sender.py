"""Daily HTML digest delivery over Gmail SMTP."""

from __future__ import annotations

import logging
import os
import smtplib
import time
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from .pattern_detector import CupHandleSetup

logger = logging.getLogger(__name__)

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
DEFAULT_RECIPIENT = "ryanfitzgerald5@gmail.com"


def _creds() -> tuple[str, str, str]:
    user = os.environ.get("GMAIL_USER", "")
    pw = os.environ.get("GMAIL_APP_PASSWORD", "")
    recipient = os.environ.get("DIGEST_RECIPIENT", "") or DEFAULT_RECIPIENT
    if not (user and pw):
        raise RuntimeError(
            "Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars"
        )
    return user, pw, recipient


def _build_html(setups: list[CupHandleSetup], today: str) -> str:
    if not setups:
        return f"<p>No cup-and-handle setups found for {today}. Scan ran OK.</p>"

    rows = []
    for s in sorted(setups, key=lambda x: x.confidence_score, reverse=True):
        pct_from_buy = (s.buy_point - s.current_price) / s.current_price * 100
        rows.append(
            f"<tr><td><b>{s.ticker}</b></td><td>${s.current_price}</td>"
            f"<td>${s.buy_point}</td><td>${s.stop_loss}</td>"
            f"<td>${s.measured_target}</td><td>{s.confidence_score:.2f}</td>"
            f"<td>{s.days_in_handle}</td><td>{pct_from_buy:+.1f}%</td></tr>"
        )
    imgs = "".join(
        f'<h3>{s.ticker}</h3><img src="cid:{s.ticker}" width="780"><br>'
        for s in sorted(setups, key=lambda x: x.confidence_score, reverse=True)
    )
    return f"""
    <h2>Cup &amp; Handle Scan — {today}</h2>
    <table border="1" cellpadding="6" cellspacing="0"
           style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
      <tr style="background:#eee">
        <th>Ticker</th><th>Price</th><th>Buy</th><th>Stop</th><th>Target</th>
        <th>Conf</th><th>Days in handle</th><th>% to buy</th>
      </tr>
      {''.join(rows)}
    </table>
    <p style="font-size:11px;color:#888">
      Rule-based screen. Validate before trading; false positives are expected.
    </p>
    {imgs}
    """


def send_digest(
    setups: list[CupHandleSetup],
    charts: dict[str, Path],
    max_retries: int = 4,
) -> None:
    user, pw, recipient = _creds()
    today = time.strftime("%Y-%m-%d")

    msg = MIMEMultipart("related")
    msg["Subject"] = f"Cup & Handle Scan: {len(setups)} setups — {today}"
    msg["From"] = user
    msg["To"] = recipient
    msg.attach(MIMEText(_build_html(setups, today), "html"))

    for ticker, path in charts.items():
        try:
            data = Path(path).read_bytes()
        except OSError as exc:
            logger.warning("Skipping chart %s: %s", ticker, exc)
            continue
        img = MIMEImage(data)
        img.add_header("Content-ID", f"<{ticker}>")
        img.add_header(
            "Content-Disposition", "attachment", filename=Path(path).name
        )
        msg.attach(img)

    delay = 2
    for attempt in range(1, max_retries + 1):
        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
                server.starttls()
                server.login(user, pw)
                server.send_message(msg)
            logger.info("Digest sent to %s (%d setups)", recipient, len(setups))
            return
        except Exception as exc:
            logger.error("SMTP attempt %d failed: %s", attempt, exc)
            if attempt == max_retries:
                raise
            time.sleep(delay)
            delay *= 2
