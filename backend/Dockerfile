# ─────────────────────────────────────────────────────────────────────────────
# AegiSpace Backend — Production Dockerfile
# Multi-stage build for minimal image size and fast cold starts on Render.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies (some Python packages need gcc for native exts)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install dependencies into a virtual-env so we can copy only what we need
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Metadata
LABEL maintainer="AegiSpace Team"
LABEL description="AegiSpace FastAPI Backend"

# Security: run as non-root
RUN groupadd --gid 1001 aegis && \
    useradd  --uid 1001 --gid aegis --shell /bin/bash --create-home aegis

WORKDIR /home/aegis/app

# Copy the virtual-env from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY ./app ./app

# Writable SQLite location for Docker/Render runs
RUN mkdir -p /home/aegis/app/data && chown -R aegis:aegis /home/aegis/app/data

# Python optimisations for containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/home/aegis/app" \
    AEGIS_DB_PATH="/home/aegis/app/data/aegispace.db"

# Switch to non-root user
USER aegis

# Render injects PORT via env; default to 8080
ENV PORT=8080
EXPOSE ${PORT}

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# Start uvicorn — bind to 0.0.0.0 so Render's load balancer can reach us
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2 --log-level info"]
