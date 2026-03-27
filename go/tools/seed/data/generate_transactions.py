#!/usr/bin/env python3
"""
Generate seed transactions for kkb.
Period : 2025-01-01 – today
Target : ~1000 transactions

Leaf accounts (non-group) from ledgeraccounts.json
  ASSET     : 現金, Suica, PASMO, 普通預金, 不動産, 有価証券
  LIABILITY : 三井住友カード, 楽天カード
  EXPENSE   : 食費, 水道光熱費, 通信費, 日用品A, 日用品B, 日用品C,
              交通費, 娯楽費, 医療費, その他費用
  REVENUE   : 給与, 賞与, その他, 雑収入
  EQUITY    : 元入金
"""

import calendar
import json
import random
import string
from datetime import date, datetime
from pathlib import Path

# ── helpers ──────────────────────────────────────────────────────────────────


def rs(length: int = 6) -> str:
    """Random alphanumeric suffix."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def amount(lo: int, hi: int, step: int = 100) -> int:
    steps = (hi - lo) // step
    return lo + random.randint(0, steps) * step


def entry(account: str, amt: int, kind: str) -> dict:
    return {"account": account, "amount": amt, "kind": kind}


def txn(d: date, desc: str, debit_acc: str, credit_acc: str, amt: int) -> dict:
    return {
        "date": d.isoformat(),
        "description": desc,
        "entries": [
            entry(debit_acc, amt, "DEBIT"),
            entry(credit_acc, amt, "CREDIT"),
        ],
    }


# ── date helpers ──────────────────────────────────────────────────────────────

today = datetime.today()
START = date(today.year - 1, today.month, today.day)
END = today.date()

MONTHS: list[date] = []
cur = date(START.year, START.month, 1)
while cur <= END:
    MONTHS.append(cur)
    y, m = (cur.year, cur.month + 1) if cur.month < 12 else (cur.year + 1, 1)
    cur = date(y, m, 1)


def clamp(d: date) -> date:
    """Ensure date is within [START, END]."""
    if d < START:
        return START
    if d > END:
        return END
    return d


def rand_day(month_start: date) -> date:
    y, m = month_start.year, month_start.month
    import calendar

    last = calendar.monthrange(y, m)[1]
    day = random.randint(1, last)
    return clamp(date(y, m, day))


# ── payment methods ────────────────────────────────────────────────────────────

CREDIT_CARDS = ["三井住友カード", "楽天カード"]
CASH_ASSETS = ["現金", "Suica", "PASMO"]
BANK = "普通預金"


def credit_card() -> str:
    return random.choice(CREDIT_CARDS)


def cash_or_card() -> str:
    return random.choice(CASH_ASSETS + CREDIT_CARDS + [BANK])


def cash() -> str:
    return random.choice(CASH_ASSETS)


def card_or_bank() -> str:
    return random.choice(CREDIT_CARDS + [BANK])


def prepaid_card() -> str:
    return random.choice(CASH_ASSETS)


def bank() -> str:
    return BANK


# ── transaction generators ────────────────────────────────────────────────────

transactions: list[dict] = []


# ── 1. Monthly fixed events ───────────────────────────────────────────────────

for mo in MONTHS:
    y, m = mo.year, mo.month

    # 給与振込 (5th)
    d = clamp(date(y, m, 5))
    sal = amount(280_000, 380_000, 10_000)
    transactions.append(txn(d, f"給与振込（{m}月分）", BANK, "給与", sal))

    # 賞与 (August and December only)
    if m in (8, 12):
        d_b = clamp(date(y, m, 20))
        bonus = amount(200_000, 600_000, 10_000)
        transactions.append(txn(d_b, f"賞与振込（{m}月分）", BANK, "賞与", bonus))

    # 電気代 (10th)
    elec = amount(4_000, 12_000, 500)
    transactions.append(
        txn(
            clamp(date(y, m, 10)),
            f"電力会社 電気代（{m}月分）",
            "水道光熱費",
            BANK,
            elec,
        )
    )

    # ガス代 (12th)
    gas = amount(2_000, 6_000, 500)
    transactions.append(
        txn(
            clamp(date(y, m, 12)),
            f"ガス代引き落とし（{m}月分）",
            "水道光熱費",
            BANK,
            gas,
        )
    )

    # 水道代 (every odd month, ~bimonthly)
    if m % 2 == 1:
        water = amount(2_000, 5_000, 500)
        transactions.append(
            txn(
                clamp(date(y, m, 16)),
                f"水道代（{m}月分）",
                "水道光熱費",
                BANK,
                water,
            )
        )

    # スマホ料金 (10th)
    phone = amount(3_000, 8_000, 500)
    transactions.append(
        txn(
            clamp(date(y, m, 10)),
            f"スマートフォン料金（{m}月分）",
            "通信費",
            BANK,
            phone,
        )
    )

    # インターネット (11th)
    net = amount(4_000, 6_000, 500)
    transactions.append(
        txn(
            clamp(date(y, m, 11)),
            f"インターネット回線料金（{m}月分）",
            "通信費",
            BANK,
            net,
        )
    )

    # 普通預金利息 (last day)
    last_day = calendar.monthrange(y, m)[1]
    interest = amount(100, 500, 10)
    transactions.append(
        txn(
            clamp(date(y, m, last_day)),
            f"普通預金利息（{m}月分）",
            BANK,
            "雑収入",
            interest,
        )
    )


# ── 2. Daily / variable transactions ─────────────────────────────────────────

# ATM 現金引き出し – ~6/month
for mo in MONTHS:
    for _ in range(random.randint(4, 8)):
        d = rand_day(mo)
        amt_ = amount(10_000, 50_000, 5_000)
        transactions.append(txn(d, f"ATM現金引き出し{rs(4)}", "現金", BANK, amt_))

# Food purchases – ~30/month
FOOD_DESCS = [
    "スーパーで食品購入",
    "コンビニで食品購入",
    "スーパーで食料品購入",
    "業務スーパーで食品購入",
    "デパ地下で惣菜購入",
    "外食（ランチ）",
    "外食（ディナー）",
    "ファミレスで食事",
    "コンビニで昼食購入",
    "テイクアウトで夕食",
    "居酒屋で外食",
    "ラーメン屋で外食",
    "カフェでランチ",
    "弁当購入",
    "パン屋で購入",
]
for mo in MONTHS:
    for _ in range(random.randint(20, 35)):
        d = rand_day(mo)
        desc = random.choice(FOOD_DESCS) + rs(5)
        amt_ = amount(400, 8_000, 100)
        pay = cash_or_card()
        transactions.append(txn(d, desc, "食費", pay, amt_))

# Daily goods – ~20/month (use 日用品A/B/C randomly)
DAILY_DESCS = [
    "ドラッグストアで日用品購入",
    "ホームセンターで日用品購入",
    "百均で日用品購入",
    "スーパーで日用品購入",
    "ネット通販で日用品購入",
    "コンビニで日用品購入",
    "薬局で日用消耗品購入",
]
DAILY_ACCOUNTS = ["日用品A", "日用品B", "日用品C"]
for mo in MONTHS:
    for _ in range(random.randint(14, 20)):
        d = rand_day(mo)
        desc = random.choice(DAILY_DESCS) + rs(5)
        amt_ = amount(300, 5_000, 100)
        acc = random.choice(DAILY_ACCOUNTS)
        pay = cash_or_card()
        transactions.append(txn(d, desc, acc, pay, amt_))

# Transportation – ~15/month
TRANSPORT_DESCS = [
    "電車賃",
    "バス代",
    "タクシー代",
    "交通系ICカードチャージ",
    "新幹線チケット購入",
    "電車定期券購入",
    "高速道路料金",
    "駐車場代",
]
TRANSPORT_SOURCES = ["現金", "Suica", "PASMO", BANK]
for mo in MONTHS:
    for _ in range(random.randint(6, 12)):
        d = rand_day(mo)
        desc = random.choice(TRANSPORT_DESCS) + rs(4)
        amt_ = amount(200, 15_000, 100)
        pay = random.choice(TRANSPORT_SOURCES)
        transactions.append(txn(d, desc, "交通費", pay, amt_))

# Suica/PASMO チャージ – ~6/month
IC_CARDS = ["Suica", "PASMO"]
for mo in MONTHS:
    for _ in range(random.randint(4, 8)):
        d = rand_day(mo)
        ic = random.choice(IC_CARDS)
        amt_ = amount(1_000, 5_000, 500)
        # Charge: DEBIT Suica/PASMO, CREDIT 現金 or 普通預金
        src = random.choice(["現金", BANK])
        transactions.append(txn(d, f"{ic}チャージ{rs(4)}", ic, src, amt_))

# Entertainment – ~12/month
ENT_DESCS = [
    "映画鑑賞",
    "音楽ライブ",
    "書籍購入",
    "ゲーム購入",
    "動画配信サブスク",
    "スポーツ観戦",
    "美術館入場料",
    "友人との飲み会",
    "ジム月会費",
    "カラオケ",
    "ボウリング",
    "遊園地入場料",
    "マンガ購入",
    "雑誌購入",
]
for mo in MONTHS:
    for _ in range(random.randint(10, 16)):
        d = rand_day(mo)
        desc = random.choice(ENT_DESCS) + rs(4)
        amt_ = amount(500, 12_000, 100)
        pay = cash_or_card()
        transactions.append(txn(d, desc, "娯楽費", pay, amt_))

# Medical – ~4/month
MED_DESCS = [
    "内科クリニック受診",
    "歯科クリニック受診",
    "薬局で薬購入",
    "眼科受診",
    "処方薬購入",
    "整形外科受診",
    "市販薬購入",
]
for mo in MONTHS:
    for _ in range(random.randint(2, 6)):
        d = rand_day(mo)
        desc = random.choice(MED_DESCS) + rs(4)
        amt_ = amount(500, 8_000, 100)
        pay = random.choice(["現金", BANK, credit_card()])
        transactions.append(txn(d, desc, "医療費", pay, amt_))

# Other expenses – ~8/month
OTHER_DESCS = [
    "その他買い物",
    "雑費支払い",
    "宅配便送料",
    "クリーニング代",
    "理美容代",
    "保険料支払い",
    "冠婚葬祭費",
    "ペット用品購入",
    "文具購入",
    "衣料品購入",
]
for mo in MONTHS:
    for _ in range(random.randint(5, 10)):
        d = rand_day(mo)
        desc = random.choice(OTHER_DESCS) + rs(4)
        amt_ = amount(500, 20_000, 100)
        pay = cash_or_card()
        transactions.append(txn(d, desc, "その他費用", pay, amt_))

# Side income / その他収入 – ~4/month
INCOME_DESCS = [
    "副収入",
    "ポイント還元",
    "キャッシュバック入金",
    "雑収入",
]
for mo in MONTHS:
    for _ in range(random.randint(2, 5)):
        d = rand_day(mo)
        desc = random.choice(INCOME_DESCS) + rs(4)
        amt_ = amount(1_000, 50_000, 1_000)
        acc = random.choice(["雑収入", "その他"])
        transactions.append(txn(d, desc, BANK, acc, amt_))


# ── sort by date ──────────────────────────────────────────────────────────────

transactions.sort(key=lambda t: t["date"])

# ── write output ──────────────────────────────────────────────────────────────

out_path = Path(__file__).parent / "transactions.json"
out_path.write_text(json.dumps(transactions, ensure_ascii=False, indent=2))
print(f"Generated {len(transactions)} transactions → {out_path}")
