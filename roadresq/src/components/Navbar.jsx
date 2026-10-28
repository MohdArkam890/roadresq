import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, TriangleAlert, WifiOff, LogOut } from "lucide-react";
import { useRequest, STEP_LABELS } from "../context/RequestContext";
import { useAuth } from "../context/AuthContext";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { useDispatch } from "react-redux";
import { resetQueue } from "../store/mechanicQueueSlice";
import { resetVehicles } from "../store/vehiclesSlice";

// links depend on who is signed in — nobody sees a page their role can't open
function linksFor(user) {
  const home = { to: "/", label: "Home" };
  if (user?.role === "customer") return [home, { to: "/dashboard", label: "Dashboard" }];
  if (user?.role === "mechanic") return [home, { to: "/mechanic", label: "Dashboard" }];
  if (user?.role === "admin") return [home, { to: "/admin", label: "Admin" }];
  return [home];
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  // useContext — reads the same live request state the dashboard writes to,
  // with no props passed down from App at all.
  const { request, setRequest } = useRequest();
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const links = linksFor(user);
  // custom hook — device connectivity, independent of the request state
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setRequest(null);
    dispatch(resetQueue()); // don't leave this account's cached data around for the next login
    dispatch(resetVehicles());
    setOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-line bg-ink/95 backdrop-blur">
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-flare px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-paper">
          <WifiOff size={13} /> You're offline — updates will resume when reconnected
        </div>
      )}

      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-amber text-ink">
            <TriangleAlert size={20} strokeWidth={2.5} />
          </span>
          <span className="font-display text-3xl leading-none tracking-wide text-paper">
            ROAD<span className="text-amber">RESQ</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                  isActive ? "text-amber" : "text-paper/70 hover:text-paper"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}

          {request && user?.role === "customer" && (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 rounded-full border border-signal/40 bg-signal/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-signal"
            >
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-signal" />
              {STEP_LABELS[request.status]}
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-paper/60">
                {user.name?.split(" ")[0]} · {user.role}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.15em] text-paper/70 hover:text-paper"
              >
                <LogOut size={14} /> Log out
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="font-mono text-xs uppercase tracking-[0.15em] text-paper/70 hover:text-paper"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-sm bg-flare px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-paper transition-colors hover:bg-flare/90"
              >
                Get Help Now
              </Link>
            </>
          )}
        </nav>

        <button
          className="text-paper md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-line bg-ink px-5 pb-5 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {request && user?.role === "customer" && (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="mb-1 flex items-center gap-2 rounded-sm bg-signal/10 px-2 py-3 font-mono text-xs uppercase tracking-wide text-signal"
              >
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-signal" />
                {STEP_LABELS[request.status]}
              </Link>
            )}
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-sm px-2 py-3 font-mono text-sm uppercase tracking-wide ${
                    isActive ? "text-amber" : "text-paper/80"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}

            {user ? (
              <button
                onClick={handleLogout}
                className="mt-2 flex items-center justify-center gap-2 rounded-sm border border-paper/20 px-4 py-3 font-mono text-sm uppercase tracking-wide text-paper/80"
              >
                <LogOut size={15} /> Log out ({user.name?.split(" ")[0]})
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-sm px-2 py-3 font-mono text-sm uppercase tracking-wide text-paper/80"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-sm bg-flare px-4 py-3 text-center font-mono text-sm font-semibold uppercase tracking-wide text-paper"
                >
                  Get Help Now
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
