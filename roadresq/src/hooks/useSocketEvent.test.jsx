import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createFakeSocket } from "../test/fakeSocket";

const state = vi.hoisted(() => ({ socket: null }));
vi.mock("../context/SocketContext", () => ({
  useSocket: () => ({ socket: state.socket, connected: true }),
}));

import useSocketEvent from "./useSocketEvent";
import useLiveLocationSharing from "./useLiveLocationSharing";

describe("useSocketEvent (Exp 8)", () => {
  it("subscribes, delivers events with the latest handler, and unsubscribes", () => {
    state.socket = createFakeSocket();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ fn }) => useSocketEvent("ping", fn), {
      initialProps: { fn: first },
    });
    expect(state.socket.listenerCount("ping")).toBe(1);

    state.socket.serverEmit("ping", 1);
    expect(first).toHaveBeenCalledWith(1);

    rerender({ fn: second }); // a new inline handler must not re-subscribe
    expect(state.socket.listenerCount("ping")).toBe(1);
    state.socket.serverEmit("ping", 2);
    expect(second).toHaveBeenCalledWith(2);

    unmount();
    expect(state.socket.listenerCount("ping")).toBe(0);
  });
});

describe("useLiveLocationSharing", () => {
  const base = { requestId: "r1", location: { lat: 19.1, lng: 72.9 }, isFallback: false };

  it("emits the mechanic's GPS position while enabled", () => {
    state.socket = createFakeSocket();
    renderHook(() => useLiveLocationSharing({ ...base, enabled: true }));
    expect(state.socket.emitted[0]).toEqual({
      event: "mechanic:location",
      payload: { requestId: "r1", lat: 19.1, lng: 72.9 },
    });
  });

  it("never broadcasts the fallback location, and stays quiet when disabled", () => {
    state.socket = createFakeSocket();
    renderHook(() => useLiveLocationSharing({ ...base, enabled: true, isFallback: true }));
    renderHook(() => useLiveLocationSharing({ ...base, enabled: false }));
    expect(state.socket.emitted).toHaveLength(0);
  });
});
