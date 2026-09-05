# RailCart

A full-stack app that merges two everyday flows into one journey:
**book a train seat** and **shop for journey essentials** — one cart, one
checkout, one order history.

- **Frontend:** React (Vite)
- **Backend:** FastAPI (async, Motor driver)
- **Database:** MongoDB
- **Design:** a boarding-pass/ticket-stub visual system — navy + amber,
  Fraunces + IBM Plex Sans, perforated dividers, dark mode, a punch
  animation on ticket confirmation.

## What's new in this version

| Area | What was added |
|---|---|
| **Real user accounts** | Signup/login with hashed passwords (PBKDF2-HMAC-SHA256, no external crypto dependency) and JWT session tokens. Cart, orders, and tickets are scoped to the logged-in user's id — not a guessable session string. |
| **Ticket ownership** | Only the user who booked a ticket can view or cancel it (enforced server-side, returns `403` otherwise). |
| **Two-layer auth** | API keys authenticate the *application* calling the API; JWT tokens authenticate the *individual user* within it. Both can be required at once. |
| **API keys** | Real, database-backed keys — hashed with SHA-256, never stored or shown in plain text after creation, individually revocable, with per-key usage stats. |
| **Rate limiting** | Per-key sliding window limiter (default 120 req/min, configurable). |
| **Reliability** | Structured request logging with a correlation id per request; a global exception handler so unexpected errors return a safe generic `500` instead of leaking a stack trace or crashing. |
| **Search & pagination** | `GET /api/products?search=chai&category=drinks&limit=20&skip=0` |
| **Order history** | `GET /api/orders` — scoped to the logged-in user, with timestamps. |
| **Settings panel (frontend)** | Paste an API key at runtime, test the connection, toggle dark/light mode — no rebuild needed. |
| **Dark mode** | Full theme system via CSS variables. Text on always-dark surfaces (hero, boarding pass, tab bar) uses dedicated `--on-dark`/`--on-dark-muted` tokens that stay constant across themes, so nothing goes low-contrast when switching. |
| **Responsive polish** | Fluid type sizing (`clamp()`), scrollable tab bar on narrow screens, stacked layouts under 860px/520px breakpoints. |
| **Manual key tooling** | `manage_keys.py` — create/list/revoke API keys from the command line. |

## Exception handling, carried over from the original exercises

| Original concept          | RailCart equivalent                          | HTTP status |
|----------------------------|-----------------------------------------------|-------------|
| `KeyError` (bad product)   | `ProductNotFoundError`                        | 404         |
| `ValueError` (bad input)   | `InvalidInputError`                           | 400         |
| `OutOfStockError` (custom) | `OutOfStockError`                             | 409         |
| `IndexError` (bad seat)    | `SeatTypeNotFoundError` / `TicketNotFoundError`| 404        |
| `BookingFullError` (custom)| `BookingFullError`                            | 409         |
| —                           | Invalid/missing API key                       | 401         |
| —                           | Invalid/missing/expired login token           | 401         |
| —                           | Acting on someone else's ticket               | 403         |
| —                           | Email already registered                      | 409         |
| —                           | Rate limit exceeded                           | 429         |
| —                           | Anything unexpected                           | 500 (logged, generic message to client) |

## Project structure

```
railcart/
├── backend/
│   ├── main.py            # FastAPI routes, middleware, exception handlers
│   ├── models.py          # Pydantic request/response models
│   ├── database.py        # MongoDB connection + seed data + indexes
│   ├── settings.py        # Typed config (pydantic-settings)
│   ├── security.py        # API keys, password hashing, JWT tokens
│   ├── exceptions.py      # Custom domain exceptions
│   ├── manage_keys.py     # CLI: create/list/revoke API keys manually
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js              # fetch wrapper, API key + JWT token storage
    │   ├── AuthContext.jsx     # login/signup/logout state
    │   ├── ThemeContext.jsx    # dark/light mode
    │   ├── index.css           # design system (light + dark tokens)
    │   └── components/
    │       ├── AuthPage.jsx    # login / signup screen
    │       ├── Shop.jsx        # search, filter, cart, checkout
    │       ├── Booking.jsx     # seat selection, boarding pass
    │       ├── Tickets.jsx     # active tickets, cancel
    │       ├── Orders.jsx      # order history
    │       ├── Settings.jsx    # API key entry, theme toggle
    │       └── Toast.jsx
    ├── index.html
    ├── vite.config.js       # proxies /api -> localhost:8000
    └── package.json
```

## Run it locally

### 1. MongoDB
```bash
mongod --dbpath ./data   # or: docker run -p 27017:27017 mongo
```

### 2. Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```
API docs: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

## Setting up real API keys

The API stays **open at the app level** (no key required) until you issue
the first key. Once any key exists, every `/api/*` request needs a valid
`X-API-Key` header. This is separate from user login (below) — a key
identifies the *application*, a login token identifies the *person*.

**Option A — command line (no server needed to run this):**
```bash
cd backend
python manage_keys.py create --name "frontend-dev"
# -> prints the raw key ONCE. Copy it.

python manage_keys.py list      # see all keys + usage counts
python manage_keys.py revoke --id key_00001
```

**Option B — HTTP admin endpoint (needs the server running + a master key):**
```bash
python manage_keys.py new-master
# put the output in backend/.env as RAILCART_MASTER_KEY, restart uvicorn

curl -X POST http://localhost:8000/api/admin/keys \
  -H "X-Master-Key: <your master key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "frontend-dev"}'
```

**Using the key:** open the *Settings* tab in the app, paste it, click
*Save key*. `/docs` and `/api/health` never require a key.

## User accounts

Real signup/login, separate from API keys. Passwords are hashed
(PBKDF2-HMAC-SHA256, 100k iterations, random salt per user) — never
stored in plain text. A successful login/signup returns a JWT, stored in
the browser and sent as `Authorization: Bearer <token>` on every request
after that.

- **Sign up:** open the app — you'll land on the login/signup screen
  automatically if you're not logged in. Fill in name, email, password
  (8+ characters).
- **What's scoped to your account:** your cart, your order history, and
  your booked tickets. Another user genuinely cannot see or cancel your
  tickets — this is enforced server-side, not just hidden in the UI.
- **Session length:** tokens last 24 hours by default
  (`RAILCART_JWT_EXPIRE_MINUTES`). Set `RAILCART_JWT_SECRET` in `.env` to
  a fixed value, or every server restart invalidates all logins.
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```

## Notes on scaling this further
- The rate limiter is in-memory, per-process — correct for one server
  instance. For multiple instances behind a load balancer, move the
  counter to Redis (`INCR` + `EXPIRE`) so all instances share it.
- Stock/seat updates use MongoDB's atomic `$inc`/`$push`/`$pull`, so
  concurrent requests won't oversell.
- JWTs here are hand-rolled HS256 on the standard library, for
  transparency and zero extra dependencies. Swapping in `PyJWT` is a
  drop-in change to `security.py` if you'd prefer a maintained library.
- Consider adding: email verification, password reset flow, refresh
  tokens (so sessions can outlast the access token's expiry safely),
  and per-key *scopes* (read-only vs. full access) for the API key system.
- Consider structured log shipping (e.g. to a file or a log aggregator)
  in production instead of stdout-only logging.
