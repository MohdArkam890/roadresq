const { scoreOf, rankMechanics } = require("../src/utils/matchMechanic");

const origin = { lat: 19.076, lng: 72.8777 }; // Mumbai

const mechanics = [
  { _id: "1", name: "Vikram", specialty: "battery", rating: 4.9, available: true, location: { lat: 19.08, lng: 72.88 } },
  { _id: "2", name: "Ayesha", specialty: "puncture", rating: 4.8, available: true, location: { lat: 19.2, lng: 73.0 } },
  { _id: "3", name: "Neha", specialty: "puncture", rating: 4.6, available: false, location: { lat: 19.081, lng: 72.879 } },
];

describe("matchMechanic scoring", () => {
  it("ranks an available, specialty-matched, nearby mechanic first", () => {
    const ranked = rankMechanics(mechanics, "battery", origin);
    expect(ranked[0].name).toBe("Vikram");
  });

  it("gives an available mechanic a positive score even without a specialty match", () => {
    const scored = scoreOf(mechanics[1], "puncture", origin);
    expect(scored.score).toBeGreaterThan(0);
  });

  it("scores unavailable mechanics lower than an otherwise-identical available one", () => {
    const unavailable = { ...mechanics[2], available: false };
    const available = { ...mechanics[2], available: true };
    const scoredUnavailable = scoreOf(unavailable, "puncture", origin);
    const scoredAvailable = scoreOf(available, "puncture", origin);
    expect(scoredUnavailable.score).toBeLessThan(scoredAvailable.score);
  });
});
