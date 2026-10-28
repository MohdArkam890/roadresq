import { describe, it, expect, vi, beforeEach } from "vitest";
import api, { getSocketUrl } from "./api";

const okJson = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("api client (Exp 4–6 wiring)", () => {
  it("attaches the stored JWT and unwraps { data }", async () => {
    localStorage.setItem("roadresq_token", "abc.def.ghi");
    const spy = vi.spyOn(globalThis, "fetch").mockReturnValue(okJson({ success: true, data: [{ _id: "1" }] }));

    const vehicles = await api.listVehicles();

    expect(vehicles).toEqual([{ _id: "1" }]);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toMatch(/\/vehicles$/);
    expect(opts.headers.Authorization).toBe("Bearer abc.def.ghi");
  });

  it("does not send a token on login/register", async () => {
    localStorage.setItem("roadresq_token", "abc");
    const spy = vi.spyOn(globalThis, "fetch").mockReturnValue(okJson({ data: { token: "t" } }));
    await api.login({ email: "a@b.c", password: "x" });
    expect(spy.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(spy.mock.calls[0][1].method).toBe("POST");
  });

  it("throws the server's error message and status", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(okJson({ success: false, error: "Invalid email or password" }, 401));
    await expect(api.login({ email: "a@b.c", password: "bad" })).rejects.toMatchObject({
      message: "Invalid email or password",
      status: 401,
    });
  });

  it("turns a network failure into a helpful message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.me()).rejects.toThrow(/Could not reach the API/);
  });

  it("returns pagination when asked", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(okJson({ data: [1], pagination: { total: 1 } }));
    const res = await api.adminUsers("?limit=5");
    expect(res.pagination.total).toBe(1);
  });

  it("sends rating payloads to the rate endpoint", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockReturnValue(okJson({ data: {} }));
    await api.rateRequest("r1", 4, "");
    const [url, opts] = spy.mock.calls[0];
    expect(url).toMatch(/\/requests\/r1\/rate$/);
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body)).toEqual({ rating: 4 });
  });

  it("derives the socket origin from the API url", () => {
    // default BASE_URL in tests is the absolute localhost URL
    expect(getSocketUrl()).toBe("http://localhost:5000");
  });
});
