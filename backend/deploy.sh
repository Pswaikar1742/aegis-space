#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AegiSpace Backend — Local Docker Build & Run
# Usage:  ./deploy.sh [build|run|push|all]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

IMAGE_NAME="aegispace-api"
IMAGE_TAG="latest"
CONTAINER_NAME="aegispace-api-local"
PORT="${PORT:-8080}"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

log()   { echo -e "${CYAN}[aegis]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ✓ ]${NC} $*"; }
fail()  { echo -e "${RED}[  ✗ ]${NC} $*" >&2; exit 1; }

# ── Functions ─────────────────────────────────────────────────────────────────
build() {
    log "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    ok "Image built successfully"
}

run() {
    log "Starting container: ${CONTAINER_NAME} on port ${PORT}"
    # Stop existing container if running
    docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true

    docker run -d \
        --name "${CONTAINER_NAME}" \
        --env-file .env \
        -p "${PORT}:${PORT}" \
        -e PORT="${PORT}" \
        "${IMAGE_NAME}:${IMAGE_TAG}"

    ok "Container started → http://localhost:${PORT}/health"
    ok "API docs       → http://localhost:${PORT}/docs"
}

stop() {
    log "Stopping container: ${CONTAINER_NAME}"
    docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
    ok "Container stopped"
}

logs() {
    docker logs -f "${CONTAINER_NAME}"
}

# ── Entrypoint ────────────────────────────────────────────────────────────────
case "${1:-all}" in
    build) build ;;
    run)   run   ;;
    stop)  stop  ;;
    logs)  logs  ;;
    all)   build && run ;;
    *)     echo "Usage: $0 {build|run|stop|logs|all}" ;;
esac
