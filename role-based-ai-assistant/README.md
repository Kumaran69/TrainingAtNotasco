# Rule-Based AI Assistant — Full Stack (React + FastAPI + MongoDB)

A chat-style rule-based assistant: keyword-matched Q&A, a calculator,
number/text analysis, a to-do list, and a 5-question Python quiz — all
persisted in MongoDB so conversations and stats survive a restart.

```
assistant_fullstack/
├── backend/
│   ├── main.py             <- FastAPI app: session/chat/stats endpoints
│   ├── database.py          <- MongoDB connection setup
│   ├── rules.py              <- the rule engine (knowledge base + multi-step flows)
│   ├── docker-compose.yml    <- local MongoDB for development
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx           <- chat UI + sidebar
        ├── api.js            <- fetch() wrapper for the backend
        └── index.css
```

## How the multi-step conversation works

A console app can just call `input()` three times in a row to run the
calculator. A web chat can't pause mid-request — so each session's
MongoDB document has an optional `pending` field like
`{"type": "calculator", "step": "op", "data": {...}}`. Every new message
either continues that in-progress flow or, if there's no flow active,
starts a new one based on keyword matching. This is what lets "calculate"
→ "10" → "+" → "5" work as four separate messages instead of one blocking
function call.

## Run it locally

### 1. Start MongoDB

**Fastest option — zero setup:** in `backend/.env`, set:
```
MONGODB_URL=mongomock
```
This runs an in-memory MongoDB-compatible store — perfect for trying the
app immediately. Data resets whenever the backend restarts.

**Real persistence:**
```bash
cd backend
docker compose up -d
```
then in `.env`:
```
MONGODB_URL=mongodb://localhost:27017
```

### 2. Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

uvicorn main:app --reload --port 8000
```

Docs: http://localhost:8000/docs

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — enter your name and start chatting.

## API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/start` | Create a new session with a name |
| `POST` | `/api/chat` | Send a message, get the assistant's reply |
| `GET` | `/api/messages/{session_id}` | Full chat history (for reload persistence) |
| `GET` | `/api/tasks/{session_id}` | Current to-do list |
| `GET` | `/api/stats/{session_id}` | Session statistics |
| `GET` | `/api/session/{session_id}` | Verify a session still exists |

## Try these in the chat

- `hello` / `hi`
- `what is machine learning`, `what is a list`, `what is recursion` (17 built-in Q&A)
- `calculate` → walks you through two numbers and an operator
- `analyze number` → even/odd, sign, square
- `analyze text` → character/word/vowel counts
- `add task: buy milk` (instant) or `add task` (asks for the task text)
- `view tasks`, `remove task`
- `quiz` → 5 Python questions, scored live
- `stats` → your session statistics
- `help` → the feature menu

## Deploying to a live URL

Same three-piece pattern as before, swapped for MongoDB:

1. **Database** — [MongoDB Atlas](https://www.mongodb.com/atlas) has a
   permanently free tier (M0 cluster). Create a cluster, add a database
   user, allow network access from anywhere (`0.0.0.0/0`) for simplicity,
   and copy the connection string.
2. **Backend** — deploy `backend/` to [Render](https://render.com) as a
   Web Service. Build command: `pip install -r requirements.txt`. Start
   command: `uvicorn main:app --host 0.0.0.0 --port $PORT`. Set env vars
   `MONGODB_URL` (your Atlas string) and `CORS_ORIGINS`.
3. **Frontend** — update `API_URL` in `frontend/src/api.js` to your
   Render URL, then deploy `frontend/` to [Vercel](https://vercel.com)
   (root directory `frontend`, build command `npm run build`, output
   `dist`).
4. Update `CORS_ORIGINS` on Render to your real Vercel URL once both are live.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| `MONGODB_URL is not set` | Copy `.env.example` to `.env` in `backend/` |
| Backend can't connect to MongoDB | If using Docker, confirm `docker ps` shows the `db` container running; if using Atlas, check your connection string and that your IP is allowed |
| Frontend shows "Could not reach the assistant" | Backend isn't running, or `API_URL` in `frontend/src/api.js` doesn't match where it's actually running |
| Chat forgets you after refresh | The session ID is stored in the browser's `localStorage` — clearing site data will start a fresh session |
