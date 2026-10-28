import { describe, it, expect, vi, afterEach } from "vitest";
import { timeAgo, isToday } from "./date";
import { haversineKm, etaMinutes } from "./geo";

afterEach(() => vi.useRealTimers());

describe("date utils", () => {
  it("timeAgo formats minutes, hours and days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00Z"));
    expect(timeAgo("2026-01-10T11:59:40Z")).toBe("just now");
    expect(timeAgo("2026-01-10T11:45:00Z")).toBe("15 min ago");
    expect(timeAgo("2026-01-10T09:00:00Z")).toBe("3 hr ago");
    expect(timeAgo("2026-01-07T12:00:00Z")).toBe("3 d ago");
  });

  it("isToday compares calendar days", () => {
    expect(isToday(new Date())).toBe(true);
    expect(isToday(new Date(Date.now() - 3 * 86400000))).toBe(false);
  });
});

describe("geo utils", () => {
  it("haversine: Mumbai → Pune is roughly 120 km", () => {
    const d = haversineKm({ lat: 19.076, lng: 72.8777 }, { lat: 18.5204, lng: 73.8567 });
    expect(d).toBeGreaterThan(115);
    expect(d).toBeLessThan(125);
  });

  it("haversine: same point is 0 and missing data is null", () => {
    expect(haversineKm({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
    expect(haversineKm(null, { lat: 1, lng: 1 })).toBeNull();
    expect(haversineKm({ lat: 1, lng: 1 }, {})).toBeNull();
  });

  it("etaMinutes assumes 30 km/h and never drops below a minute", () => {
    expect(etaMinutes(15)).toBe(30);
    expect(etaMinutes(0.01)).toBe(1);
    expect(etaMinutes(null)).toBeNull();
  });
});
