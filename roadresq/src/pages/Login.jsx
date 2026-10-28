import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, TriangleAlert, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const roles = ["Customer", "Mechanic"];

export default function Login() {
  const [role, setRole] = useState("Customer");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);

  const { login, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    try {
      const user = await login({ email, password });
      // redirect based on the account's real role, not the toggle above
      navigate(user.role === "mechanic" ? "/mechanic" : user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center px-5 py-12 md:px-8">
      <div className="grid w-full overflow-hidden rounded-md border border-ink/10 md:grid-cols-2">
        {/* Side panel */}
        <div className="hidden flex-col justify-between bg-ink p-10 md:flex">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-amber text-ink">
              <TriangleAlert size={18} strokeWidth={2.5} />
            </span>
            <span className="font-display text-2xl tracking-wide text-paper">
              ROAD<span className="text-amber">RESQ</span>
            </span>
          </div>
          <div>
            <p className="font-display text-4xl leading-tight text-paper">
              Welcome back to the fastest route to roadside help.
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-paper/40">
              4,200+ breakdowns resolved
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-paper p-8 sm:p-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">
            Sign in
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">
            Log in to RoadResQ
          </h1>

          <div className="mt-6 flex rounded-sm border border-ink/15 p-1">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-sm py-2 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                  role === r ? "bg-ink text-paper" : "text-ink/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {formError && (
            <div className="mt-4 flex items-start gap-2 rounded-sm border border-flare/40 bg-flare/10 px-4 py-3 font-body text-sm text-flare">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink/30"
              />
            </label>

            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
                Password
              </span>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 pr-10 font-body text-sm text-ink placeholder:text-ink/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-body text-sm text-ink/60">
                <input type="checkbox" className="accent-flare" />
                Keep me signed in
              </label>
              <a href="#" className="font-body text-sm text-flare">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-sm bg-flare py-3 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-paper disabled:opacity-50"
            >
              {loading ? "Logging in…" : `Log in as ${role}`}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-ink/60">
            New to RoadResQ?{" "}
            <Link to="/register" className="font-semibold text-flare">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
