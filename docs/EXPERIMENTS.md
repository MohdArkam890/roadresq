# Experiment guide — Full Stack Development Lab (NITPL52)

For each experiment: **what it is in RoadResQ**, **where the code is**, **how to demonstrate it**, and **viva points**.
All commands assume the Quick start in the README has been done (backend + frontend running, `npm run seed` executed).

---
## 1 · Responsive and interactive UIs with Tailwind CSS
**In the project:** the whole interface — landing page, dashboards, forms — is built with Tailwind utility classes and a custom
design-token theme (colours, fonts, animations) in `tailwind.config.js` / `src/index.css`.
**Code:** `roadresq/src/pages/*.jsx`, `src/components/*.jsx`, `tailwind.config.js`.
**Demo:** open the landing page and shrink the browser (or DevTools device toolbar) — the nav collapses, grids reflow
(`sm:` `md:` breakpoints). Hover/focus states, the blinking status dot and dashed route animation are Tailwind + CSS keyframes.
**Viva:** utility-first vs component CSS · breakpoints are mobile-first · why design tokens in the config · purging unused CSS at build.

## 2 · React Hooks (useEffect, useContext, custom hooks)
**In the project:** `useEffect` for fetching, timers, socket subscriptions and cleanup; `useContext` for Auth/Socket/Request;
custom hooks for reusable behaviour.
**Code:** `src/hooks/` — `useCountdown`, `useElapsedTime`, `useOnlineStatus`, `useGeolocation`, `useSocketEvent`,
`useLiveLocationSharing`, `useMechanicMatch`. Contexts in `src/context/`.
**Demo:** mechanic dashboard shows an elapsed-online timer (`useElapsedTime`) and an offline banner when you disable the network
(`useOnlineStatus`). Tests: `src/hooks/*.test.jsx`.
**Viva:** dependency arrays · cleanup functions (clearInterval / socket.off — see `useSocketEvent`) · storing the latest callback in a
ref to avoid re-subscribing · rules of hooks.

## 3 · Complex state with Redux or Context API
**In the project:** both, used where each fits. **Redux Toolkit** (`src/store/`): `vehiclesSlice` and `mechanicQueueSlice` with
`createAsyncThunk`, loading/error states, and derived selectors (today's earnings, pending vs active jobs); `notificationsSlice` for
toasts. **Context** for the single active request (`RequestContext`) and auth/socket.
**Demo:** mechanic dashboard stats are selectors over one list; accept a job and watch every number update. Tests: `src/store/store.test.js`.
**Viva:** slice = reducer + actions · thunk lifecycle (pending/fulfilled/rejected) · why Context for rarely-changing/single-object
state and Redux for lists + derived data · immutability with Immer.

## 4 · REST API design with MongoDB + Mongoose
**In the project:** four Mongoose models with validation, indexes and relations (`User`, `Vehicle`, `Request`, `Message`); resource-oriented routes.
**Code:** `roadresq-backend/src/models/`, `controllers/`, `routes/`.
**Demo:** `npm run seed`, then open MongoDB Compass / `mongosh roadresq` → `db.requests.find()`. A request document embeds `statusHistory`.
**Viva:** schema vs model · `ref` + `populate` · embedded array vs reference · indexes (`customer`, `status`) · pre-save hook (password hashing) ·
a status **state machine** (`Request.TRANSITIONS`) so illegal jumps are rejected.

## 5 · Secure, production-ready RESTful APIs
**In the project:** helmet headers, CORS allow-list, body-size limit, rate limiting (stricter on auth), `express-validator` on every
mutating route, centralised error handler with consistent `{ success, error }` JSON, ObjectId validation, pagination, mass-assignment
protection, env validation + graceful shutdown, health endpoint.
**Code:** `src/app.js`, `middleware/errorHandler.js`, `middleware/validate.js`, `server.js`.
**Demo:** `curl localhost:5000/api/requests/not-an-id -H "Authorization: Bearer <t>"` → clean `422`, never a stack trace.
Send 21 bad logins → `429`. **Tests:** `tests/api.test.js`, `tests/rateLimit.test.js`.
**Viva:** why separate `app.js` from `server.js` (testability) · operational vs programmer errors · what each helmet header does ·
NoSQL-injection defence via validation · status codes (400/401/403/404/409/422/429).

## 6 · Authentication and user roles with JWT
**In the project:** register/login with bcrypt, signed JWT (7 d), `protect` middleware (verifies token + loads user), `authorize(...roles)`
for **customer / mechanic / admin**. Ownership checks (a customer can't read another's request). Frontend `ProtectedRoute` + role-aware navbar.
**Code:** `middleware/auth.js`, `controllers/authController.js`, `context/AuthContext.jsx`, `components/ProtectedRoute.jsx`, `controllers/adminController.js`.
**Demo:** log in as a customer and visit `/admin` → bounced. `GET /api/admin/stats` with a customer token → `403`; with the admin token → stats.
**Viva:** JWT = header.payload.signature (signed, not encrypted) · why never store passwords in plain text · authentication vs authorisation ·
where the token is stored and the XSS/CSRF trade-offs · why users can't register as admin.

## 7 · Validating RESTful APIs using Postman
**In the project:** `roadresq-backend/postman/RoadResQ.postman_collection.json` — **44 requests, 84 assertions**, organised in folders
(auth, mechanics, vehicles, full request lifecycle, negative/security tests, cleanup). Tokens and ids are captured into variables
automatically, each run uses unique emails/coordinates so it can be re-run endlessly.
**Demo:** Postman → Import collection + environment → select **RoadResQ Local** → *Run collection*. Or headless: `npm run test:api` (Newman; also runs in CI).
**Viva:** collection vs environment variables · pre-request vs test scripts · `pm.test` / `pm.expect` · chaining requests via saved variables ·
why negative tests (401/403/409/422) matter.

## 8 · Real-time communication via WebSockets
**In the project:** Socket.IO with JWT-authenticated connections. Events: instant new-job alerts to mechanics, live status pushes to both parties,
live **chat** (persisted), live **mechanic GPS → customer ETA**. Rooms are authorised server-side; polling is only a fallback when the socket is down.
**Code:** `src/sockets/index.js`, `src/sockets/emitter.js`, `models/Message.js`; frontend `context/SocketContext.jsx`, `hooks/useSocketEvent.js`,
`components/ChatPanel.jsx`. **Tests:** `tests/socket.test.js`, `src/context/RequestContext.test.jsx`.
**Demo:** two windows (see README demo). Header shows `● live`; stop the backend and it flips to *reconnecting* and polling resumes.
**Viva:** WebSocket vs HTTP polling vs SSE · handshake `auth` payload · rooms & per-user rooms · acknowledgements · why authorise room joins ·
what happens on disconnect/reconnect.

## 9 · CI/CD with GitHub Actions + Render/Vercel
**In the project:** `.github/workflows/ci.yml` — backend lint+tests (MongoDB service container), frontend lint+tests+build, Newman API run,
and a Docker Compose smoke test. `deploy.yml` — runs only after CI passes on `main`: publishes images to GHCR, triggers the Render deploy hook,
deploys the frontend to Vercel, then health-checks the API. `render.yaml` (infra as code) and `roadresq/vercel.json` (SPA rewrites).
**Demo:** push to a branch → *Actions* tab shows the jobs; merge to `main` → Deploy workflow. Setup steps are in the README.
**Viva:** CI vs CD · job dependencies (`needs`) · service containers · secrets vs variables · caching · why deploy is gated on CI success ·
blueprint / infrastructure as code.

## 10 · Deploy full-stack apps using DevOps tools and Docker
**In the project:** a production Dockerfile per app (backend: non-root user + `HEALTHCHECK`; frontend: multi-stage Node build → Nginx),
`docker-compose.yml` with MongoDB volume, health-gated start order (`depends_on: condition: service_healthy`), and an Nginx that serves the SPA
and **proxies `/api` and the WebSocket (`/socket.io`)** so the browser uses a single origin.
**Demo:** `docker compose up --build` → http://localhost:8080 ; `docker compose ps` shows *healthy*; `docker compose run --rm seed`;
`docker compose down -v`.
**Viva:** image vs container · layer caching (copy `package*.json` first) · multi-stage builds · volumes for DB persistence · compose networking
(service names as hostnames) · why Nginx proxies instead of exposing the API to the browser · `.dockerignore`.
