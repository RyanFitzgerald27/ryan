"""Offline dress rehearsal: full pipeline, SMTP intercepted to a file."""
import os, smtplib
from pathlib import Path

import numpy as np

from tests.test_pattern_detector import _textbook_cup_handle, _frame
from src.pattern_detector import detect_cup_handle
from src.chart_generator import generate_chart
import src.email_sender as es

os.environ["GMAIL_USER"] = "sender@gmail.com"
os.environ["GMAIL_APP_PASSWORD"] = "dummy"
# DIGEST_RECIPIENT intentionally unset -> exercises the default.

captured = {}

class FakeSMTP:
    def __init__(self, *a, **k): pass
    def __enter__(self): return self
    def __exit__(self, *a): return False
    def starttls(self): pass
    def login(self, *a): pass
    def send_message(self, msg): captured["msg"] = msg

smtplib.SMTP = FakeSMTP

# Two synthetic setups: the textbook cup, plus a scaled second name.
df1 = _textbook_cup_handle(); df1.ticker_symbol = "ACME"
s1 = detect_cup_handle(df1); s1.ticker = "ACME"

closes = df1["Close"].to_numpy() * 3.2 + 40
df2 = _frame(closes, df1["Volume"].to_numpy()); df2.ticker_symbol = "BETA"
s2 = detect_cup_handle(df2); s2.ticker = "BETA"

setups = [s for s in (s1, s2) if s]
charts = {s.ticker: generate_chart(s, d)
          for s, d in zip(setups, (df1, df2))}

es.send_digest(setups, charts)

msg = captured["msg"]
print(f"To:      {msg['To']}")
print(f"Subject: {msg['Subject']}")
for s in setups:
    print(f"  {s.ticker}: buy ${s.buy_point}  stop ${s.stop_loss} "
          f" target ${s.measured_target}  conf {s.confidence_score}")

html = next(p.get_payload(decode=True).decode()
            for p in msg.walk() if p.get_content_type() == "text/html")
Path("practice_email.html").write_text(html)
print("\nWrote practice_email.html")
