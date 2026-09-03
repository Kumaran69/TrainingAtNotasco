# --- Course Recommender API -------------------------------------------
FROM python:3.12-slim

WORKDIR /app

# System deps kept minimal; pymongo's C extensions build fine without extras.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py recommendation.py ./

# Render/Railway inject $PORT at runtime; default to 5000 for local `docker run`.
ENV PORT=5000
EXPOSE 5000

# Basic container-level health check (both platforms also do their own
# HTTP health checks against /api/health, configured in render.yaml /
# the Railway dashboard).
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import os,urllib.request;urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",5000)}/api/health')" || exit 1

# Shell form so ${PORT} expands at container start (Render/Railway set it
# dynamically; it isn't known at build time).
CMD gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 60 app:app
