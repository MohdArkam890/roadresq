import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TriangleAlert, Car, Wrench, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [role, setRole] = useState("customer");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("puncture");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState(null);

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    try {
      const user = await register({
        name,
        email,
        phone,
        password,
        role, // "customer" | "mechanic"
        specialty: role === "mechanic" ? specialty : undefined,
      });
      navigate(user.role === "mechanic" ? "/mechanic" : "/dashboard");
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:px-8">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-amber text-ink">
          <TriangleAlert size={18} strokeWidth={2.5} />
        </span>
        <span className="font-display text-2xl tracking-wide text-ink">
          ROAD<span className="text-flare">RESQ</span>
        </span>
      </div>

      <p className="mt-8 font-mono text-xs uppercase tracking-[0.25em] text-flare">
        Create account
      </p>
      <h1 className="mt-2 font-display text-5xl text-ink">Join RoadResQ</h1>
      <p className="mt-3 max-w-md font-body text-sm text-ink/60">
        Choose how you'll use RoadResQ — as a driver who needs help, or as a
        mechanic who provides it.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setRole("customer")}
          aria-pressed={role === "customer"}
          className={`flex flex-col items-start gap-3 rounded-md border p-5 text-left transition-colors ${
            role === "customer"
              ? "border-flare bg-flare/5"
              : "border-ink/15 hover:border-ink/30"
          }`}
        >
          <Car
            size={26}
            strokeWidth={1.75}
            className={role === "customer" ? "text-flare" : "text-ink/60"}
          />
          <div>
            <p className="font-display text-2xl text-ink">Driver</p>
            <p className="font-body text-xs text-ink/50">
              I need roadside assistance
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRole("mechanic")}
          aria-pressed={role === "mechanic"}
          className={`flex flex-col items-start gap-3 rounded-md border p-5 text-left transition-colors ${
            role === "mechanic"
              ? "border-flare bg-flare/5"
              : "border-ink/15 hover:border-ink/30"
          }`}
        >
          <Wrench
            size={26}
            strokeWidth={1.75}
            className={role === "mechanic" ? "text-flare" : "text-ink/60"}
          />
          <div>
            <p className="font-display text-2xl text-ink">Mechanic</p>
            <p className="font-body text-xs text-ink/50">
              I provide roadside service
            </p>
          </div>
        </button>
      </div>

      {formError && (
        <div className="mt-6 flex items-start gap-2 rounded-sm border border-flare/40 bg-flare/10 px-4 py-3 font-body text-sm text-flare">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
              Full name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Fernandes"
              className="mt-1.5 w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink/30"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
              Phone number
            </span>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="mt-1.5 w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink/30"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink/30"
          />
        </label>

        {role === "mechanic" && (
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
              Specialisation
            </span>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="mt-1.5 w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 font-body text-sm text-ink"
            >
              <option value="puncture">Puncture &amp; tyres</option>
              <option value="battery">Battery &amp; electrical</option>
              <option value="engine">Engine diagnostics</option>
              <option value="fuel">Fuel delivery</option>
              <option value="towing">Towing</option>
            </select>
          </label>
        )}

        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/50">
            Password
          </span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-1.5 w-full rounded-sm border border-ink/15 bg-white px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-ink/30"
          />
        </label>

        <label className="flex items-start gap-2 font-body text-sm text-ink/60">
          <input type="checkbox" required className="mt-1 accent-flare" />
          I agree to the Terms of Service and Privacy Policy.
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 rounded-sm bg-ink py-3 font-mono text-sm font-semibold uppercase tracking-[0.15em] text-paper disabled:opacity-50"
        >
          <Check size={16} />
          {loading ? "Creating account…" : `Create ${role === "customer" ? "driver" : "mechanic"} account`}
        </button>
      </form>

      <p className="mt-6 text-center font-body text-sm text-ink/60">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-flare">
          Log in
        </Link>
      </p>
    </div>
  );
}
