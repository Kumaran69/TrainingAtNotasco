# Course Recommender — full-stack demo

A small AI-course recommendation engine: **Flask + MongoDB** backend,
**React (Vite)** frontend.

```
course-recommender/
├── docker-compose.yml       Local parity test: backend + mongo + frontend
├── render.yaml               Render blueprint (backend)
├── railway.json               Railway config (backend)
├── netlify.toml                Netlify build config (frontend)
├── backend/
│   ├── app.py                Flask REST API
│   ├── recommendation.py     Core recommendation logic (pure Python, no deps)
│   ├── requirements.txt
│   ├── Dockerfile             Production image (gunicorn)
│   └── .dockerignore
└── frontend/
    ├── src/
    │   ├── App.jsx            UI
    │   ├── api.js             fetch() wrapper for the API
    │   └── index.css          styles
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── Dockerfile              Local-parity only (Netlify doesn't use this)
    └── nginx.conf
```

## How the recommender works (`backend/recommendation.py`)

- `MANDATORY_BEGINNER_COURSES` — a **frozenset**, the fixed set of courses
  every interest-less new user is pointed at (`python`, `data_science`).
- `known_courses` / `unknown_courses` — set difference against the catalog.
- `common_interests` — set intersection between two users.
- `courses_from_other_user` — what another user knows that you don't.
- `jaccard_similarity` — `|A ∩ B| / |A ∪ B|`, used to weight recommendations.
- `recommend_courses(user_id, ...)` — collaborative filtering: every other
  user "votes" (weighted by similarity) for the courses they know that the
  target doesn't; results are ranked, already-known courses are always
  excluded, and users with zero interests fall back to the mandatory
  beginner set. Returns the **top 3** by default.
- `recommend_with_explanation` — bundles the above with per-user similarity
  scores for the API/UI.

Run the logic on its own (no server needed):

```bash
cd backend
python3 -c "from recommendation import recommend_courses; print(recommend_courses('user_1'))"
```

## Running the backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
python3 app.py
```

The API starts on `http://localhost:5000`.

**MongoDB is optional.** If a MongoDB server is reachable at
`mongodb://localhost:27017` (override with the `MONGO_URI` env var), the
app stores users there and seeds the 3 demo users on first run. If Mongo
isn't running, the app automatically falls back to an in-memory store with
the same data — you'll see a log line telling you which mode it's in, and
`/api/health` reports it too. Nothing else changes.

To use MongoDB: install it locally or run `docker run -d -p 27017:27017 mongo`.

### API endpoints

| Method | Path                              | Description                              |
|--------|------------------------------------|-------------------------------------------|
| GET    | `/api/health`                     | storage backend status                    |
| GET    | `/api/courses`                    | full catalog + mandatory beginner courses |
| GET    | `/api/users`                      | all learners and their interests          |
| POST   | `/api/users`                      | create a learner `{user_id, interests}`   |
| DELETE | `/api/users/<user_id>`            | remove a (non-seed) learner               |
| GET    | `/api/recommend/<user_id>`        | recommendations + explanation             |
| GET    | `/api/compare/<a>/<b>`            | similarity + shared interests             |

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*`
requests to the Flask backend on port 5000 (see `vite.config.js`), so no
CORS configuration is needed in dev — `flask-cors` is included regardless
in case you split hosts in production.

## Production build (manual, no platform)

```bash
cd frontend
npm run build       # outputs static files to frontend/dist
```

---

## Deploying

The backend is a Docker container (deploy to **Render** or **Railway**); the
frontend is a static Vite build (deploy to **Netlify**). They're independent
deployments that talk over HTTPS.

### 1. Backend → Render

1. Push this repo to GitHub/GitLab.
2. In the Render dashboard: **New +** → **Blueprint**, point it at the repo.
   Render reads `render.yaml` and creates a Docker web service rooted at
   `backend/`. (Or skip the blueprint and create a Web Service by hand:
   environment = Docker, root directory = `backend`.)
3. Set environment variables on the service:
   - `MONGO_URI` — a MongoDB Atlas connection string (Render has no
     built-in Mongo). If you skip this, the API runs fine on in-memory
     storage — data just resets on every redeploy/restart.
   - `FRONTEND_ORIGIN` — your Netlify URL once you have it (e.g.
     `https://course-recommender.netlify.app`), or leave as `*`.
4. Render builds `backend/Dockerfile` and exposes the service at
   `https://<your-service>.onrender.com`. Health check: `/api/health`.

### 1b. Backend → Railway (alternative)

1. **New Project** → **Deploy from GitHub repo**.
2. Railway detects `railway.json` at the repo root, which points it at
   `backend/Dockerfile`. (If it doesn't auto-detect, set the service's
   **Root Directory** to `backend` in Settings, or **Dockerfile Path** to
   `backend/Dockerfile`.)
3. In **Variables**, set `MONGO_URI` (Atlas, or add Railway's own MongoDB
   plugin and reference its connection variable) and `FRONTEND_ORIGIN`.
4. Railway assigns a public domain automatically; the health check hits
   `/api/health`.

### 2. Frontend → Netlify

1. **Add new site** → **Import an existing project**, point it at the repo.
   Netlify reads `netlify.toml` at the repo root (`base = "frontend"`,
   `command = "npm run build"`, `publish = "dist"`) — no manual config
   needed.
2. In **Site settings → Environment variables**, add:
   - `VITE_API_BASE_URL` = your Render/Railway backend URL, e.g.
     `https://course-recommender-api.onrender.com` (no trailing slash, no
     `/api` suffix — the app appends that itself).
3. Deploy. Netlify serves the static build; every API call goes straight
   to the backend's HTTPS URL.
4. Go back and set the backend's `FRONTEND_ORIGIN` to this Netlify URL so
   CORS only allows your actual frontend (tightening it from `*`).

### Local parity test with Docker (optional, before deploying)

```bash
docker compose up --build
```

Spins up MongoDB, the backend on `:5000`, and an nginx-served frontend
build on `:8080` — the same containers (minus Netlify's own build
pipeline) that end up in production. Useful for catching Docker-specific
issues before pushing.
