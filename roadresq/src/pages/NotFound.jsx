import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-flare">404</p>
      <h1 className="mt-2 font-display text-5xl text-ink">Wrong turn</h1>
      <p className="mt-3 font-body text-sm text-ink/60">That page doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block rounded-sm bg-ink px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.15em] text-paper">
        Back home
      </Link>
    </div>
  );
}
