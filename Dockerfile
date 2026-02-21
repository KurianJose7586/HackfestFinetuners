# ============================================================
#  BRD Generation API – Production Dockerfile (GCP Cloud Run)
# ============================================================

# ---------- Stage 1: Build ----------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install only the build-time system libs needed to compile wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-full.txt .
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements-full.txt


# ---------- Stage 2: Runtime ----------
FROM python:3.11-slim

# ---------- Environment ----------
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    # Keeps signal handling sane inside containers
    PYTHONFAULTHANDLER=1

WORKDIR /app

# Install only runtime system libraries (no build toolchain)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    shared-mime-info \
    libxml2 \
    libxslt1.1 \
    libjpeg62-turbo \
    zlib1g \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pre-built wheels from the builder stage (no compiler needed)
COPY --from=builder /build/wheels /tmp/wheels
COPY requirements-full.txt .
RUN pip install --no-cache-dir --no-index --find-links=/tmp/wheels -r requirements-full.txt \
    && rm -rf /tmp/wheels

# ---------- Non-root user ----------
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# ---------- Copy Application ----------
COPY . .

# Ensure all Python packages are importable
RUN touch brd_module/__init__.py integration_module/__init__.py noise_filter_module/__init__.py 2>/dev/null || true

# Own the workdir
RUN chown -R appuser:appuser /app

USER appuser

# ---------- Health Check ----------
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Cloud Run provides PORT; default to 8080
EXPOSE ${PORT}

# ---------- Production Server ----------
# 'exec' form ensures gunicorn is PID 1 and receives SIGTERM from Cloud Run.
# --preload: validate imports at startup so failures surface immediately.
# --timeout 0:  Cloud Run manages request timeouts externally.
# --graceful-timeout 30: allows in-flight requests to finish on shutdown.
CMD exec gunicorn api.main:app \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT} \
    --workers 2 \
    --threads 2 \
    --timeout 0 \
    --graceful-timeout 30 \
    --preload \
    --access-logfile - \
    --error-logfile -