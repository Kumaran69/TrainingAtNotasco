"""
Storage layer for ScholarLedger.

Design goals (this is the "enhanced performance" part of the brief):

  1. FAST READS: the original exercises re-read and re-parse the whole
     file on every single operation (view, total, search). That's fine
     for a CLI toy but becomes a real bottleneck under web traffic --
     every page load would mean a disk read + string parsing. Instead,
     we load each file ONCE at startup into an in-memory list, and keep
     that list in sync on every write ("write-through cache"). All reads
     (list, search, totals) hit memory only -- no disk I/O at all.

  2. SAFE CONCURRENT WRITES: a web app can receive multiple requests at
     the same instant (two browser tabs, or just fast double-clicks).
     Appending to a file and updating an in-memory list are each two
     separate steps -- without a lock, two concurrent "add" requests
     could interleave and corrupt the file or lose an update. An
     asyncio.Lock serializes writes so this can't happen, while reads
     stay lock-free and instant.

  3. STILL PLAIN FILES: expenses.txt (plain text) and scores.csv (via
     the csv module) are kept exactly as the original exercises
     specified -- this only changes *how fast* they're read, not *how*
     the data is stored.
"""
import asyncio
import csv
import os

EXPENSES_FILE = "expenses.txt"
SCORES_FILE = "scores.csv"
SCORES_HEADERS = ["Name", "Subject", "Score"]


class ExpenseStore:
    def __init__(self, filename=EXPENSES_FILE):
        self.filename = filename
        self._lock = asyncio.Lock()
        self._cache = []  # list of dicts: {id, category, amount, date}
        self._load()

    def _load(self):
        """One-time read from disk into memory at startup."""
        self._cache = []
        if not os.path.exists(self.filename):
            return
        with open(self.filename, "r") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                category, amount, date = line.split(",")
                self._cache.append({
                    "id": i, "category": category, "amount": float(amount), "date": date,
                })

    async def add(self, category: str, amount: float, date: str) -> dict:
        async with self._lock:  # only writers wait; concurrent adds queue safely
            with open(self.filename, "a") as f:
                f.write(f"{category},{amount},{date}\n")
            entry = {"id": len(self._cache), "category": category, "amount": amount, "date": date}
            self._cache.append(entry)
            return entry

    def list_all(self, category: str | None = None, limit: int = 100, skip: int = 0) -> list[dict]:
        """Reads from memory only -- no disk access, so this is effectively instant
        even with thousands of rows."""
        rows = self._cache
        if category:
            rows = [r for r in rows if r["category"].lower() == category.lower()]
        return rows[skip: skip + limit]

    def total(self) -> float:
        return round(sum(r["amount"] for r in self._cache), 2)

    def total_by_category(self) -> dict[str, float]:
        totals: dict[str, float] = {}
        for r in self._cache:
            totals[r["category"]] = round(totals.get(r["category"], 0) + r["amount"], 2)
        return totals

    def count(self) -> int:
        return len(self._cache)


class ScoreStore:
    def __init__(self, filename=SCORES_FILE):
        self.filename = filename
        self._lock = asyncio.Lock()
        self._cache = []  # list of dicts: {id, name, subject, score}
        self._ensure_file()
        self._load()

    def _ensure_file(self):
        if not os.path.exists(self.filename):
            with open(self.filename, "w", newline="") as f:
                csv.writer(f).writerow(SCORES_HEADERS)

    def _load(self):
        self._cache = []
        with open(self.filename, "r", newline="") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                self._cache.append({
                    "id": i, "name": row["Name"], "subject": row["Subject"], "score": float(row["Score"]),
                })

    async def add(self, name: str, subject: str, score: float) -> dict:
        async with self._lock:
            with open(self.filename, "a", newline="") as f:
                csv.writer(f).writerow([name, subject, score])
            entry = {"id": len(self._cache), "name": name, "subject": subject, "score": score}
            self._cache.append(entry)
            return entry

    def list_all(self, limit: int = 100, skip: int = 0) -> list[dict]:
        return self._cache[skip: skip + limit]

    def search_by_name(self, name: str) -> list[dict]:
        needle = name.lower()
        return [r for r in self._cache if needle in r["name"].lower()]

    def average(self) -> float:
        if not self._cache:
            return 0.0
        return round(sum(r["score"] for r in self._cache) / len(self._cache), 2)

    def average_by_subject(self) -> dict[str, float]:
        buckets: dict[str, list[float]] = {}
        for r in self._cache:
            buckets.setdefault(r["subject"], []).append(r["score"])
        return {subj: round(sum(vals) / len(vals), 2) for subj, vals in buckets.items()}

    def count(self) -> int:
        return len(self._cache)
