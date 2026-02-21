# ---------- Base Image ----------
FROM python:3.11-slim

# ---------- Environment ----------
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# ---------- System Dependencies ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-xlib-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libxml2-dev \
    libxslt1-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# ---------- Install Python Dependencies ----------
COPY requirements-full.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements-full.txt

# ---------- Copy Application ----------
COPY . .

# Cloud Run requires fixed port exposure
EXPOSE 8080

# ---------- Production Server ----------
# IMPORTANT: Do NOT hardcode PORT.
# Cloud Run injects it automatically.
CMD exec gunicorn -k uvicorn.workers.UvicornWorker \
    api.main:app \
    --bind 0.0.0.0:$PORT \
    --workers 1 \
    --timeout 0