#!/usr/bin/env python3
import json
from pathlib import Path

data = json.loads((Path(__file__).parent / "transactions.json").read_text())
print(f"Count: {len(data)}")
print(f"First date: {data[0]['date']}")
print(f"Last date:  {data[-1]['date']}")

valid = {
    "現金",
    "Suica",
    "PASMO",
    "普通預金",
    "不動産",
    "有価証券",
    "三井住友カード",
    "楽天カード",
    "食費",
    "水道光熱費",
    "通信費",
    "日用品A",
    "日用品B",
    "日用品C",
    "交通費",
    "娯楽費",
    "医療費",
    "その他費用",
    "給与",
    "賞与",
    "その他",
    "雑収入",
    "元入金",
}
bad = {e["account"] for t in data for e in t["entries"] if e["account"] not in valid}
print(f"Unknown accounts: {bad if bad else 'None (all valid)'}")

out_of_range = [
    t["date"] for t in data if not ("2025-08-01" <= t["date"] <= "2026-02-28")
]
print(f"Out-of-range dates: {out_of_range[:5] if out_of_range else 'None'}")

unbal = [
    t["description"] for t in data if len(set(e["amount"] for e in t["entries"])) != 1
]
print(f"Unbalanced txns: {unbal[:5] if unbal else 'None (all balanced)'}")
