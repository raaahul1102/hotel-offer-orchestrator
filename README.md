# Hotel Offer Orchestrator

Aggregates overlapping hotel offers from two mock suppliers, deduplicates hotels by name, and selects the best-priced offer per hotel. The comparison is orchestrated with **Temporal**, deduplicated results are cached in **Redis** (where price filtering is performed), and everything runs via **Docker Compose**.

## Stack

- Node.js (TypeScript) + Express
- Temporal.io (workflow + activities) for orchestration
- Redis for caching and in-store price filtering
- Docker Compose for local deployment

## Architecture

```
Client ──► API (Express)
             │  GET /api/hotels?city=&minPrice=&maxPrice=
             │
             ├─ cache miss ─► Temporal Client ─► Workflow ─► [Activity A] ┐  (parallel)
             │                                              └ [Activity B] ┘
             │                                   dedupe by name + pick cheapest
             │                                   (tie → Supplier A)
             │◄──────────────────────────────── best offers
             │
             ├─ store in Redis (ZSET scored by price + HASH of offers, TTL 300s)
             └─ filter inside Redis (ZRANGEBYSCORE) ─► JSON response
```

The **API** and the **worker** run as separate processes from the same image (selected by the `ROLE` env var). The worker's activities call the API's in-service mock supplier endpoints.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/hotels?city=delhi` | Deduplicated best-priced hotels for a city |
| GET | `/api/hotels?city=delhi&minPrice=<n>&maxPrice=<n>` | Same, filtered by price range (filtering done in Redis) |
| GET | `/supplierA/hotels` | Mock Supplier A data |
| GET | `/supplierB/hotels` | Mock Supplier B data |
| GET | `/health` | Reachability of both suppliers (200 healthy / 503 degraded) |

### Response format

```json
[
  { "name": "Holtin", "price": 5340, "supplier": "Supplier B", "commissionPct": 20 },
  { "name": "Radison", "price": 5900, "supplier": "Supplier A", "commissionPct": 13 }
]
```

Results are sorted ascending by price.

## Selection rules

- Deduplicate by hotel name (case-insensitive, trimmed).
- If a name appears in both suppliers, keep the cheaper price.
- On a price tie, Supplier A wins.
- If only one supplier returns a hotel, keep that one.
- If one supplier fails (after retries), degrade gracefully using the responsive one. If both fail, return HTTP 502.

## Mock data overlaps (city = delhi)

| Hotel | Supplier A | Supplier B | Winner |
| --- | --- | --- | --- |
| Holtin | 6000 | 5340 | B |
| Radison | 5900 | 6100 | A |
| Taj | 8200 | 8200 | A (tie) |
| Oberoi Grand | 12000 | — | A |
| Leela Palace | — | 15000 | B |

## Run with Docker Compose

Requires Docker with the Compose plugin.

```bash
# From the project root
docker compose up --build
```

This starts Redis, Postgres, the Temporal server, the Temporal worker, and the API. The API is exposed on `http://localhost:3000` by default.

To use a different host port:

```bash
API_PORT=8080 docker compose up --build
```

Verify:

```bash
curl "http://localhost:3000/health"
curl "http://localhost:3000/api/hotels?city=delhi"
curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5900&maxPrice=8200"
```

Tear down:

```bash
docker compose down -v
```

## Local development (without Docker)

Requires **Node.js 18+** (the Temporal SDK's native worker does not support older versions) plus a local Redis and Temporal server.

```bash
npm install
npm run build

# Terminal 1 — Temporal worker
npm run start:worker

# Terminal 2 — API
npm run start:api
```

Environment variables (with defaults):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | API listen port |
| `REDIS_HOST` / `REDIS_PORT` | `localhost` / `6379` | Redis connection |
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal frontend |
| `TEMPORAL_TASK_QUEUE` | `hotel-orchestrator` | Task queue name |
| `SUPPLIER_BASE_URL` | `http://localhost:3000` | Base URL the worker uses to reach mock suppliers |
| `CACHE_TTL_SECONDS` | `300` | Deduplicated-list cache TTL |
| `SUPPLIER_TIMEOUT_MS` | `5000` | Per-attempt supplier timeout |
| `HEALTH_TIMEOUT_MS` | `2000` | Supplier reachability timeout for `/health` |

## Tests

Pure orchestration logic (dedupe, cheapest-price selection, price-range validation) is unit tested and runs without Docker, Redis, or Temporal:

```bash
npm test
```

## Postman

Import `postman/HotelOfferOrchestrator.postman_collection.json`. It covers:

- Valid city with overlaps (`delhi`)
- Price-range filtering
- City with no results
- Missing city (400) and invalid price range (400)
- Mock supplier endpoints
- Health check
- A note on simulating a supplier being down

## Project layout

```
src/
  api/            Express app, server, routes (hotels, suppliers, health)
  cache/          Redis cache with in-store price filtering
  core/           Pure logic: selection + price-range validation (+ unit tests)
  suppliers/      Static mock supplier datasets
  temporal/       Workflow, activities, worker, client
  config.ts       Env-driven configuration
  logger.ts       Structured logging (pino)
  types.ts        Shared domain types
Dockerfile
docker-compose.yml
postman/
```
