# Weather Alert System – Submission Guide

This guide explains how to run and evaluate the project quickly. It’s written to be practical, human-readable, and focused on what matters for review.

---

## What this is
A full‑stack Weather Alert System that:
- Fetches realtime weather from Tomorrow.io
- Lets you create alerts with thresholds per location
- Evaluates alerts on a schedule and via an event stream
- Shows status in a web UI (and a simple mobile app)
- Handles API limits gracefully (429) with retries, backoff, caching, and degradation

---

## Prerequisites
- Docker and Docker Compose
- Node.js 20+ (only if running server/mobile locally without Docker)

---

## One‑command run (recommended)
From the repo root:

```bash
# Build and start all services (API, Web, DB, Redis, Kafka, Zookeeper)
docker compose up -d

# Open the web app
open http://localhost:3000

# API health
curl http://localhost:4000/health
```

What’s included:
- API (Express, TypeScript): `http://localhost:4000`
- Web (React, Vite): `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kafka & Zookeeper (event stream): `localhost:9092`, `localhost:2181`

---

## Environment
The compose file provides sane defaults for local use. If you need custom values, add a `.env` file in `server/` (e.g., `TOMORROW_API_KEY`, `UNITS=metric`). The app will still run with graceful degradation if the API is rate‑limited.

---

## What to test first (5 minutes)
1) Open Web: `http://localhost:3000` → see current weather for a preset location.
2) Create an alert (e.g., temperature > 30°C for Boston) → Alerts page.
3) Watch Current State → shows triggered/not triggered; updates periodically.
4) Hammer refresh or add multiple alerts → you should still see responsive UI even if Tomorrow.io rate‑limits; the app retries with backoff, uses caching, and gracefully degrades (returns demo data instead of failing hard).

---

## Key endpoints (manual testing)
- Health: `GET /health`
- Realtime weather: `GET /api/weather/realtime?lat=42.3601&lon=-71.0589`
- Alerts:
  - Create: `POST /api/alerts` (name, description, latitude/longitude OR cityName, parameter, operator, threshold)
  - List (paginated): `GET /api/alerts?page=1&pageSize=10`
  - Current State: `GET /api/alerts/state`
  - Delete: `DELETE /api/alerts/:id`
  - Clear all: `DELETE /api/alerts`

---

## How the system handles scaling & 429s
- Client (web/mobile): retries on failure with exponential backoff + jitter; shows a friendly “Too many requests” message and avoids hot loops.
- API:
  - Circuit breaker around external calls
  - Request de‑duplication per location (coalesces in‑flight requests)
  - Adaptive retry with exponential backoff + jitter; respects `Retry-After` when present
  - Short‑term in‑memory cache per location (configurable TTL)
  - Graceful degradation: realistic demo data on persistent 429s, so the product remains usable
- Infra:
  - Stateless API → horizontal scaling friendly
  - Kafka event stream for real‑time alert evaluation (consumers scale out)
  - Redis for queues/caching (can be extended to persistent cache)
  - DB indexed for typical queries (by time and geo fields)

---

## Architecture (quick overview)
- Hexagonal/Clean: ports (`business-logic/ports`) and adapters (`infrastructure/*`)
- API layer: minimal controllers + DTO validation
- Weather provider: Tomorrow.io integration with circuit breaker, retries, caching, dedupe
- Event‑driven: Kafka publishes weather/alerts; consumer evaluates triggers
- Background: cron‑based scheduler kept for comparison (event‑driven is the primary path)
- Observability: structured logs with correlation IDs; simple health/status endpoint

---

## Mobile app (optional bonus)
Run the mobile web build (fastest way to verify):

```bash
cd mobile
npm run web
# opens http://localhost:8081
```

If you have a simulator set up:
- `npm run ios` (macOS + Xcode)
- `npm run android` (Android Studio)

The mobile app mirrors the web (current weather + alert state) with the same resilient API client.

---

## Common issues & fixes
- 429 Too Many Requests
  - Expected under heavy use; UI shows clear feedback; API backoff is automatic.
- API health is OK but weather 400
  - Use `lat` and `lon` query parameters (not `latitude`/`longitude`).
- Kafka unavailable
  - The API and UI still work; events/logging will warn but won’t crash.
- Schema drift
  - In dev: `cd server && npx prisma migrate reset --force` (drops data) or `npx prisma db push`.

---

## Notes on trade‑offs
- A short in‑memory cache is used for simplicity; swap to Redis cache for cross‑instance sharing.
- Notifications are mocked; wiring to SES/SendGrid/Twilio is straightforward via the notification port.
- The event‑driven evaluator runs alongside a cron evaluator for comparison; in production, choose one.

---

## Command cheat‑sheet
```bash
# All services
docker compose up -d

# Logs
docker compose logs -f api

# Rebuild API only
docker compose up --build -d --force-recreate api

# Stop all
docker compose down

# API health
curl http://localhost:4000/health

# Create alert example
curl -X POST http://localhost:4000/api/alerts \
  -H 'Content-Type: application/json' \
  -d '{
        "name": "Hot Boston",
        "latitude": 42.3601,
        "longitude": -71.0589,
        "parameter": "TEMPERATURE",
        "operator": "GT",
        "threshold": 30
      }'
```

---

## What to look for during review
- Resilience: 429 handling, backoff, circuit breaker, graceful degradation
- Scalability: stateless API, queues, event streaming, caching
- Clarity: clean separation of ports/adapters, small controllers, readable code
- UX: simple, responsive, clear error states

If you want me to ship a trimmed “submission branch” that excludes non‑essential files for brevity, I can do that. Otherwise, this guide is all you need to run and evaluate the project quickly.
