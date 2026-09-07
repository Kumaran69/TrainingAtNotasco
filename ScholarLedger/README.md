# ScholarLedger

A single dashboard combining two classic exercises into one real-world app:
an **expense tracker** (plain text file) and a **quiz score manager** (CSV
file) -- built for the same person: a student managing both money and grades.

- **Frontend:** React (Vite)
- **Backend:** FastAPI, async
- **Storage:** plain files, exactly as the original exercises specify --
  `expenses.txt` (comma-separated lines) and `scores.csv` (via the `csv`
  module) -- with a performance layer on top (see below).

## How performance was enhanced

The original exercises re-read and re-parse the whole file on every
operation (view, total, search). That's fine for a CLI toy, but under real
web traffic it means a disk read + full parse on every page load.

`storage.py` fixes this with two things:

1. **In-memory cache, write-through.** Each file is read ONCE at startup
   into a list. Every read (list, filter, search, totals, averages) hits
   memory only -- no disk I/O, no re-parsing. Writes update the file AND
   the cache together, so they never drift out of sync.
2. **`asyncio.Lock` around writes.** A web app can receive two requests at
   the same instant. Without a lock, two concurrent "add expense" calls
   could interleave and corrupt the file or silently drop one of them.
   Tested directly: 30 concurrent expense adds + 30 concurrent score adds
   fired at once, and both the cache and the on-disk files ended up with
   exactly 30 entries each -- no loss, no corruption.

## Project structure

```
scholarledger/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── storage.py        # cached, lock-safe file I/O (the perf layer)
│   ├── models.py         # Pydantic request/response models
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx
        ├── api.js
        ├── index.css
        └── components/
            ├── Dashboard.jsx     # combined summary (both trackers at once)
            ├── Expenses.jsx      # add / filter / total
            └── QuizScores.jsx    # add / search / average
```

## Run it locally

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
`expenses.txt` and `scores.csv` are created automatically in the `backend/`
folder on first run. API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/expenses` | Add an expense |
| GET | `/api/expenses?category=&limit=&skip=` | List (optionally filtered, paginated) |
| GET | `/api/expenses/summary` | Total + per-category breakdown |
| POST | `/api/scores` | Add a quiz score |
| GET | `/api/scores?limit=&skip=` | List all |
| GET | `/api/scores/search?name=` | Search by student name (partial, case-insensitive) |
| GET | `/api/scores/summary` | Average + per-subject breakdown |
| GET | `/api/dashboard` | Combined summary for the home screen, one call |
