# Deploying to Railway

Railway deploys **individual services**, not a `docker-compose.yml`. Your local Compose stack becomes several Railway services in one project, talking over Railway's private network. No credentials or API keys are required.

## The deploy options explained

When you create a service, Railway asks how to source it. Here's what each means for this project:

- **GitHub repo** — Railway builds from your repo (using our `Dockerfile`). Used for the **API** and the **worker**. Push your code to GitHub, connect the repo, and Railway rebuilds on every push.
- **Docker image** — Deploy a prebuilt image from a registry. Used for the **Temporal** server (`temporalio/auto-setup`).
- **Database (DB)** — Railway's one-click managed data stores. Used for **Redis** and **Postgres** (Postgres backs Temporal).

## Services to create

| Service | Source | Notes |
| --- | --- | --- |
| Redis | Database (Add → Redis) | Provides `REDIS_URL` |
| Postgres | Database (Add → Postgres) | Backs Temporal |
| Temporal | Docker image `temporalio/auto-setup:1.24.2` | Points at Postgres |
| API | GitHub repo | `ROLE=api`, public domain |
| Worker | GitHub repo (same repo) | `ROLE=worker`, no public domain |

The **API** and **worker** run from the **same image**; the `ROLE` env var (handled in the `Dockerfile` CMD) decides which process starts.

## Step by step

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Hotel Offer Orchestrator"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Add Redis and Postgres
- New Project → Add → **Redis** (gives `REDIS_URL`).
- Add → **Postgres** (gives `PGHOST`, `PGUSER`, `PGPASSWORD`, etc.).

### 3. Add the Temporal service (Docker image)
- New service → Deploy from Docker image → `temporalio/auto-setup:1.24.2`.
- Variables (reference the Postgres service):

  | Variable | Value |
  | --- | --- |
  | `DB` | `postgres12` |
  | `DB_PORT` | `5432` |
  | `POSTGRES_USER` | `${{Postgres.PGUSER}}` |
  | `POSTGRES_PWD` | `${{Postgres.PGPASSWORD}}` |
  | `POSTGRES_SEEDS` | `${{Postgres.PGHOST}}` |

- Temporal listens on gRPC port `7233`. Use the service's private domain (Settings → Networking) so the API/worker can reach it internally.

### 4. Create the API service (from GitHub repo)
- New service → Deploy from your GitHub repo. Railway detects the `Dockerfile`.
- Settings → Networking → generate a public domain.
- Variables:

  | Variable | Value |
  | --- | --- |
  | `ROLE` | `api` |
  | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
  | `TEMPORAL_ADDRESS` | `<temporal-internal-domain>:7233` |
  | `SUPPLIER_BASE_URL` | `http://localhost:3000` |

  Do **not** set `PORT` — Railway injects it and the app already reads `process.env.PORT`.

### 5. Create the Worker service (same repo)
- Add another service from the **same** GitHub repo. No public domain needed.
- Variables:

  | Variable | Value |
  | --- | --- |
  | `ROLE` | `worker` |
  | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
  | `TEMPORAL_ADDRESS` | `<temporal-internal-domain>:7233` |
  | `SUPPLIER_BASE_URL` | `http://<api-internal-domain>:${{PORT}}` |

  The worker's activities call the API's mock supplier routes, so `SUPPLIER_BASE_URL` must point at the API service's **private** Railway domain (`<service>.railway.internal`).

### 6. Verify
Once all services are green:
```bash
curl "https://<your-api-domain>/health"
curl "https://<your-api-domain>/api/hotels?city=delhi"
curl "https://<your-api-domain>/api/hotels?city=delhi&minPrice=5900&maxPrice=8200"
```

## Notes

- No API keys or certificates are needed. The hotel "suppliers" are mock endpoints served by your own API, and Temporal is self-hosted.
- The same image runs as API or worker via `ROLE`.
- `REDIS_URL` is honored automatically when set (managed Redis provides a URL); locally, host/port from Compose are used instead.
- Self-hosting Temporal is the trade-off for a credential-free deploy: it adds Temporal + Postgres services versus a managed alternative.
