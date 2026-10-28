# RoadResQ — Experiments 1, 2 & 3

Real-Time Roadside Assistance and Service Management System.

- **Experiment 1**: *Build responsive and interactive UIs using Tailwind
  CSS.* React + Vite + Tailwind front end, no backend yet.
- **Experiment 2**: *Experiment based on React Hooks (useEffect,
  useContext, custom hooks).* Adds shared app state and reusable hook
  logic on top of the Experiment 1 UI.
- **Experiment 3**: *Manage complex state with Redux or Context API.*
  Adds Redux Toolkit for the state that's a genuine multi-item
  collection with CRUD-style operations (vehicles, the mechanic's job
  queue, a global toast queue) — Context from Experiment 2 stays in
  place for the single active-request object, since Redux would be
  overkill for that.

Still no backend/database — everything is simulated client-side so each
state-management tool has real, non-trivial state to manage.

## Pages included

- **Landing (`/`)** — hero with a live animated route tracker, a scrolling
  hazard-sign ticker of breakdown types, a clickable problem-type selector,
  a 4-step "how it works" section, and a nearby-mechanics preview.
- **Login (`/login`)** — role toggle (Customer / Mechanic), password
  show/hide.
- **Register (`/register`)** — role toggle (Driver / Mechanic) that swaps
  a form field depending on role.
- **Customer dashboard (`/dashboard`)** — tabs for active request (with
  live tracker + status stepper), my vehicles, and service history.
- **Mechanic dashboard (`/mechanic`)** — online/offline toggle, stat cards,
  and a live list of nearby job requests with accept/decline actions.

## Experiment 2 — where each hook is used

**`useContext`** — `src/context/RequestContext.jsx`
Holds the customer's active breakdown request (problem type, assigned
mechanic, status) so both the `Navbar` (top bar, any page) and the
`CustomerDashboard` can read/update the same state without passing props
down through `App`. Try it: start a request on `/dashboard`, then check
the live status pill in the navbar on every page, including `/`.

**`useEffect`**
- `RequestContext.jsx` — auto-advances the request status every 4s
  (stands in for a real WebSocket push) and syncs `document.title` to the
  current status, both with proper cleanup.
- `useOnlineStatus.js` — subscribes to the browser's `online`/`offline`
  events and cleans the listeners up on unmount.
- `useMechanicMatch.js` — re-runs an async "find nearest mechanic" call
  whenever the selected problem type changes, using a cancellation flag
  so a stale response can't overwrite newer state.

**Custom hooks** — `src/hooks/`
- `useCountdown.js` — a reusable mm:ss countdown timer (used by
  `RouteTracker`).
- `useElapsedTime.js` — counts up while a boolean is true; powers the
  mechanic's "online for HH:MM:SS" shift timer.
- `useOnlineStatus.js` — returns live `navigator.onLine` status.
- `useMechanicMatch.js` — the nearest-mechanic scoring algorithm
  (distance 35% + rating 25% + specialisation 25% + availability 15%),
  returned as a ranked, live-updating list. Used on the landing page's
  problem selector and in the dashboard's "new request" flow.

## Experiment 3 — Redux Toolkit vs. the Context from Experiment 2

**Why both exist in the same app:** Context (Experiment 2) is a good fit
for the single active breakdown request — one object, read in a couple
of places, low update frequency. Redux (Experiment 3) is a better fit
for genuine *collections* with CRUD operations and derived stats, which
is what the other state turned out to be.

**`src/store/`**
- `store.js` — `configureStore` combining three slices.
- `vehiclesSlice.js` — the driver's garage. `addVehicle` / `removeVehicle`
  reducers; a `prepare` callback generates each vehicle's id so
  components don't have to. Used in `CustomerDashboard` → *My vehicles*.
- `mechanicQueueSlice.js` — the mechanic's incoming job queue. One flat
  list with a `status` field (`pending` / `accepted` / `declined`)
  instead of three separate arrays, plus **derived selectors**
  (`selectCompletedToday`, `selectEarningsToday`) that compute stats from
  that single source of truth instead of storing them separately. Used
  in `MechanicDashboard`.
- `notificationsSlice.js` — a global toast queue. Demonstrates state that
  gets written to from *multiple, unrelated* components (adding a
  vehicle, accepting a job) and read from one (`ToastStack`, mounted
  once in `App.jsx`).

**`src/components/ToastStack.jsx`** — reads `notifications.queue` with
`useSelector` and pairs Redux with `useEffect` (Experiment 2's hook):
each toast schedules its own auto-dismiss and cleans up the timeout if
dismissed early.

Try it: accept a job on `/mechanic` and watch "Completed today" and
"Today's earnings" update together (derived from the same slice), then
watch the toast appear bottom-right and dismiss itself after ~3 seconds.

## Design system

- **Colors** — asphalt ink (`#14161B`), off-white paper (`#F5F3EC`),
  hazard amber (`#F5A623`), safety-orange flare (`#FF5A36`), signal green
  (`#33C481`) for "online/available" states.
- **Type** — `Teko` (condensed, road-signage feel) for display headings,
  `Inter` for body copy, `JetBrains Mono` for labels/stats/timers.
- **Signature element** — the animated live route tracker (dashed SVG path
  with a moving stroke + real countdown timer) that appears on the hero and
  the customer dashboard.

## Run it locally

```bash
npm install
npm run dev       # http://localhost:5173
```

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/
    Navbar.jsx          # sticky nav — useContext + useOnlineStatus
    Footer.jsx
    RouteTracker.jsx     # signature animated tracking widget — useCountdown
    HazardTicker.jsx     # scrolling problem-type ticker
    ToastStack.jsx        # reads notifications slice — useSelector + useEffect
  context/
    RequestContext.jsx   # useContext provider — active request state
  hooks/
    useCountdown.js       # custom hook — mm:ss countdown
    useElapsedTime.js     # custom hook — HH:MM:SS count-up
    useOnlineStatus.js    # custom hook — navigator.onLine + events
    useMechanicMatch.js   # custom hook — async matching algorithm
  store/
    store.js               # configureStore — combines all slices
    vehiclesSlice.js        # CRUD: driver's vehicles
    mechanicQueueSlice.js    # job queue + derived stat selectors
    notificationsSlice.js    # global toast queue
  pages/
    Landing.jsx
    Login.jsx
    Register.jsx
    CustomerDashboard.jsx
    MechanicDashboard.jsx
  App.jsx                # routes, wrapped in RequestProvider
  main.jsx                # app entry, wrapped in redux <Provider>
  index.css               # Tailwind + fonts + base styles
tailwind.config.js         # design tokens (colors, fonts, animations)
```

## Next experiments (not in this deliverable)

REST API + MongoDB + Mongoose (exp 4) → production-ready RESTful APIs
(exp 5) → JWT auth & roles (exp 6) → Postman validation (exp 7) →
WebSockets/Socket.IO for real live status &amp; chat (exp 8) → CI/CD with
GitHub Actions (exp 9) → Docker deployment (exp 10), per the lab index.
