import { useEffect, useState } from "react";
import { Users, Wrench, Wallet, ClipboardList, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { STEP_LABELS } from "../context/RequestContext";

/**
 * EXPERIMENT 6 — the admin role in the UI. Every number comes from
 * GET /api/admin/stats, which the server only serves to admin tokens.
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.adminStats(), api.listRequests("?limit=8"), api.adminUsers("?limit=8")])
      .then(([s, r, u]) => {
        setStats(s);
        setRecent(r);
        setUsers(u.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex items-center gap-2 rounded-sm border border-flare/40 bg-flare/10 px-4 py-3 font-body text-sm text-flare">
          <AlertCircle size={16} /> {error}
        </div>
      </div>
    );
  }
  if (!stats) return <p className="px-8 py-10 font-body text-sm text-ink/40">Loading platform stats…</p>;

  const totalUsers = Object.values(stats.users).reduce((a, b) => a + b, 0);
  const totalRequests = Object.values(stats.requests).reduce((a, b) => a + b, 0);
  const cards = [
    { label: "Users", value: totalUsers, icon: Users },
    { label: "Mechanics online", value: stats.mechanicsOnline, icon: Wrench },
    { label: "Requests", value: totalRequests, icon: ClipboardList },
    { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: Wallet },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">Admin dashboard</p>
      <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">Platform overview</h1>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-md border border-ink/10 bg-white/50 p-4">
            <Icon size={18} className="text-flare" />
            <p className="mt-3 font-display text-3xl text-ink">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-md border border-ink/10 bg-white/50 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">Requests by status</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(stats.requests).map(([status, count]) => (
            <span key={status} className="rounded-full border border-ink/15 px-3 py-1 font-mono text-xs text-ink/70">
              {STEP_LABELS[status] ?? status}: <strong>{count}</strong>
            </span>
          ))}
          {totalRequests === 0 && <span className="font-body text-sm text-ink/40">No requests yet.</span>}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">Recent requests</p>
          <div className="mt-3 divide-y divide-ink/10 rounded-md border border-ink/10 bg-white/50">
            {recent.map((r) => (
              <div key={r._id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-display text-lg capitalize text-ink">{r.problemType}</p>
                  <p className="font-body text-xs text-ink/45">
                    {r.customer?.name} → {r.mechanic?.name ?? "unassigned"}
                  </p>
                </div>
                <span className="font-mono text-[11px] uppercase text-ink/60">{STEP_LABELS[r.status]}</span>
              </div>
            ))}
            {recent.length === 0 && <p className="p-4 font-body text-sm text-ink/40">Nothing yet.</p>}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/40">Newest users</p>
          <div className="mt-3 divide-y divide-ink/10 rounded-md border border-ink/10 bg-white/50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-display text-lg text-ink">{u.name}</p>
                  <p className="font-body text-xs text-ink/45">{u.email}</p>
                </div>
                <span className="font-mono text-[11px] uppercase text-ink/60">{u.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
