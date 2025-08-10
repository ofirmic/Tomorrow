#!/bin/bash

set -e

# --- Configuration ---
API_PORT=${API_PORT:-4000}
WEB_PORT=${WEB_PORT:-3000}
MOBILE_WEB_PORT=${MOBILE_WEB_PORT:-8081}

# --- Colors ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- Functions ---
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

start_services() {
  log_info "Starting Docker Compose services (DB, Redis, Kafka, API)..."
  # Ensure we are in the root directory for docker compose
  (cd "$(dirname "$0")" && docker compose up -d)

  log_info "Starting React web frontend..."
  (cd "$(dirname "$0")"/web && npm install && npm run dev -- --port $WEB_PORT &) > /dev/null 2>&1
  echo $! > "$(dirname "$0")"/web.pid

  log_info "Starting Expo mobile web app..."
  (cd "$(dirname "$0")"/mobile && npm install && npm run web -- --port $MOBILE_WEB_PORT &) > /dev/null 2>&1
  echo $! > "$(dirname "$0")"/mobile.pid

  log_info "All services initiated. Please allow some time for them to become fully ready."
  log_info "Web app: http://localhost:$WEB_PORT"
  log_info "Mobile web app: http://localhost:$MOBILE_WEB_PORT"
  log_info "API health check: http://localhost:$API_PORT/health"
}

stop_services() {
  log_info "Stopping all services..."

  log_info "Stopping Docker Compose services..."
  (cd "$(dirname "$0")" && docker compose down)

  if [ -f "$(dirname "$0")"/web.pid ]; then
    log_info "Stopping React web frontend..."
    kill $(cat "$(dirname "$0")"/web.pid) || true
    rm "$(dirname "$0")"/web.pid
  fi

  if [ -f "$(dirname "$0")"/mobile.pid ]; then
    log_info "Stopping Expo mobile web app..."
    kill $(cat "$(dirname "$0")"/mobile.pid) || true
    rm "$(dirname "$0")"/mobile.pid
  fi

  log_info "All services stopped."
}

# --- Main Logic ---
case "$1" in
  --stop)
    stop_services
    ;;
  *)
    start_services
    ;;
esac
