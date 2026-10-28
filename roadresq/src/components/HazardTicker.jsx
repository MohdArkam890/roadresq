const items = [
  "PUNCTURE",
  "BATTERY",
  "ENGINE",
  "FUEL",
  "TOWING",
  "AC / COOLANT",
  "LOCKOUT",
  "ACCIDENT",
];

export default function HazardTicker() {
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-ink-line bg-ink py-2">
      <div className="flex w-max animate-marquee gap-10">
        {loop.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-paper/60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
