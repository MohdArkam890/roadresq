# RoadResQ — real-time roadside assistance (MERN)

Full Stack Development Lab (NITPL52) · all 10 experiments implemented in one app.

Customers report a breakdown → the server **matches the best nearby mechanic** (distance, rating, specialty, availability) →
the mechanic accepts, drives over, and completes the job while the customer **tracks, chats and rates in real time**.
Admins see platform stats.

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Redux Toolkit + Context API, Socket.IO client |
| Backend | Node.js, Express, MongoDB + Mongoose, JWT, Socket.IO, express-validator, helmet, rate limiting |
| Quality | Jest + Supertest (real MongoDB), Vitest + Testing Library, Postman/Newman, oxlint |
| DevOps | Docker, Docker Compose, Nginx, GitHub Actions, Render, Vercel |

## Quick start

### A) Docker — one command (Experiment 10)
```bash
docker compose up --build            # frontend http://localhost:8080 · API http://localhost:5000/api
docker compose run --rm seed         # optional: load demo accounts
```

### B) Local development
```bash
# 1. MongoDB running locally (or use an Atlas URI)
# 2. backend
cd roadresq-backend && cp .env.example .env && npm install
npm run seed                          # demo users (idempotent)
npm run dev                           # http://localhost:5000
# 3. frontend (new terminal)
cd roadresq && cp .env.example .env && npm install
npm run dev                           # http://localhost:5173
```

### Demo accounts (after `npm run seed`) — password `Password@123`
| Role | Email |
|---|---|
| Customer | `customer@roadresq.dev` |
| Mechanic | `vikram@roadresq.dev` (battery) · `ayesha@roadresq.dev` (puncture) · `suresh@roadresq.dev` (engine) … |
| Admin | `admin@roadresq.dev` |

**60-second demo:** open two browser windows (one normal, one incognito). Log in as the customer in one and as
`vikram@roadresq.dev` in the other → customer requests a *battery* job → the mechanic's screen pops the request instantly →
Accept → "I've arrived" → "Start service" → "Complete job" while the customer watches each step arrive live, chats, and rates.

## Tests & checks
```bash
cd roadresq-backend && npm run lint && npm test            # 43 tests · needs MongoDB (see below)
cd roadresq-backend && npm run test:api                    # Postman collection via Newman (API must be running)
cd roadresq && npm run lint && npm test && npm run build   # 58 tests
```
Backend tests use a real MongoDB: set `MONGO_URI_TEST=mongodb://localhost:27017/roadresq_test`, or leave it unset and
`mongodb-memory-server` starts a throw-away instance for you. CI uses a MongoDB service container.

## Project layout
```
roadresq/                 React app (Vite + Tailwind)       Dockerfile · nginx.conf · vercel.json
  src/{pages,components,context,hooks,store,lib,utils}
roadresq-backend/         Express API + Socket.IO           Dockerfile
  src/{models,controllers,routes,middleware,sockets,utils}
  scripts/seed.js         demo data
  postman/                collection + environment (Experiment 7)
  tests/                  Jest + Supertest + socket tests
.github/workflows/        ci.yml (test/build/smoke) · deploy.yml (GHCR + Render + Vercel)
docker-compose.yml        mongo + backend + frontend (+ seed)
render.yaml               Render blueprint
docs/EXPERIMENTS.md       experiment-by-experiment guide  ← start here for the lab journal
```

## API overview (`/api`)
| Method & path | Who | What |
|---|---|---|
| `POST /auth/register` · `POST /auth/login` · `GET /auth/me` | public / any | JWT auth, bcrypt-hashed passwords |
| `GET/POST/DELETE /vehicles` | customer | own vehicles only |
| `POST /requests` | customer | create + auto-match nearest mechanic |
| `GET /requests` · `GET /requests/:id` | participants | role-scoped list (filter `?status=`, paginate `?page&limit`) |
| `PATCH /requests/:id/status` | mechanic/admin | `on_the_way → arrived → in_progress → completed` (validated state machine) |
| `PATCH /requests/:id/decline` · `/cancel` · `/rate` | mechanic · customer · customer | decline re-matches; cancel only before work starts; rate once |
| `GET /requests/:id/messages` | participants | chat history |
| `GET /mechanics/nearby` · `PATCH /mechanics/availability` | customer · mechanic | ranked matches · online/offline + location |
| `GET /admin/stats` · `GET /admin/users` | admin | platform overview |
| `GET /health` | public | liveness + DB state |

**Socket.IO events** — server→client: `request:new`, `request:update`, `request:removed`, `chat:message`, `mechanic:location`;
client→server: `chat:message`, `mechanic:location`, `request:join`. Connections are JWT-authenticated and room joins are
authorised against the database.

## Deployment (Experiment 9)
1. **MongoDB Atlas** (free) → copy the connection string.
2. **Render** → New → Blueprint → select this repo (`render.yaml`). Set `MONGO_URI` (Atlas) and `CORS_ORIGIN` (Vercel URL).
   Copy the service's *Deploy Hook* URL.
3. **Vercel** → import the repo with *Root Directory* `roadresq`; set env `VITE_API_URL=https://<render-app>.onrender.com/api`.
   Run `vercel link` once locally to get the org/project ids.
4. **GitHub → Settings → Secrets**: `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   (optional variable `API_HEALTH_URL` for a post-deploy health check). Every push to `main` now runs CI, then deploys.
   Jobs with missing secrets are skipped, not failed.

> Free-tier Render sleeps when idle — the first request after a pause takes ~30 s. Real-time features need the backend
> to be awake.

## Known limitations (deliberate scope)
- Pricing is a flat fare per problem type; there is no payment integration.
- "Live map" is a schematic route card, not a tile map; the position data (GPS → server → customer) is real.
- Matching runs when a request is created; a request with no mechanic available stays `requested` until the customer cancels
  and retries (no background re-matching queue).
- Admins are created by the seed script only (self-registration as admin is blocked on purpose).
