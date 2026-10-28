import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useCountdown from "./useCountdown";
import useElapsedTime from "./useElapsedTime";
import useOnlineStatus from "./useOnlineStatus";

afterEach(() => vi.useRealTimers());

describe("useCountdown (Exp 2 custom hook)", () => {
  it("ticks down each second and formats mm:ss", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(65, { loop: false }));
    expect(result.current.label).toBe("01:05");
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.label).toBe("01:00");
  });

  it("stops at zero when loop is off", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(2, { loop: false }));
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.secondsLeft).toBe(0);
  });

  it("clears its interval on unmount", () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useCountdown(10));
    unmount();
    expect(clear).toHaveBeenCalled();
  });
});

describe("useElapsedTime", () => {
  it("counts up only while active and resets when re-activated", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ active }) => useElapsedTime(active), {
      initialProps: { active: true },
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.label).toBe("00:00:03");

    rerender({ active: false });
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.seconds).toBe(3); // frozen while inactive

    rerender({ active: true });
    expect(result.current.seconds).toBe(0); // reset on going online again
  });
});

describe("useOnlineStatus", () => {
  it("follows the browser's online/offline events and removes listeners", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current).toBe(true);

    unmount();
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
