import { TriangleAlert } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-ink-line bg-ink">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-amber text-ink">
                <TriangleAlert size={16} strokeWidth={2.5} />
              </span>
              <span className="font-display text-2xl tracking-wide text-paper">
                ROAD<span className="text-amber">RESQ</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs font-body text-sm text-paper/50">
              Real-time roadside assistance and service management. Built for
              the Full Stack Development lab, MERN + Socket.IO.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm text-paper/70">
                <li>How it works</li>
                <li>For mechanics</li>
                <li>Coverage areas</li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
                Company
              </p>
              <ul className="mt-3 space-y-2 text-sm text-paper/70">
                <li>About</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper/40">
                Emergency
              </p>
              <ul className="mt-3 space-y-2 text-sm text-paper/70">
                <li>24/7 helpline</li>
                <li>Safety guide</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-ink-line pt-6 text-xs text-paper/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} RoadResQ. Academic mini-project.</p>
          <p className="font-mono uppercase tracking-[0.2em]">
            Exp 01 — Tailwind CSS UI
          </p>
        </div>
      </div>
    </footer>
  );
}
