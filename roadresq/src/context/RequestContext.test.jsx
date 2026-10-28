import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createFakeSocket } from "../test/fakeSocket";
import notifications, { selectNotifications } from "../store/notificationsSlice";

const state = vi.hoisted(() => ({ socket: null, connected: true, user: null }));
vi.mock("./SocketContext", () => ({
  useSocket: () => ({ socket: state.socket, connected: state.connected }),
}));
vi.mock("./AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("../lib/api", () => ({
  default: {
    listRequests: vi.fn(),
    getRequest: vi.fn(),
    createRequest: vi.fn(),
    cancelRequest: vi.fn(),
    rateRequest: vi.fn(),
  },
}));

import api from "../lib/api";
import { RequestProvider, useRequest } from "./RequestContext";

const req = (over = {}) => ({
  _id: "r1",
  status: "matched",
  problemType: "battery",
  location: { lat: 19.07, lng: 72.87 },
  mechanic: { name: "Vikram Rao" },
  ...over,
});

let ctx;
function Probe() {
  ctx = useRequest();
  return (
    <div>
      <p data-testid="status">{ctx.request?.status ?? "none"}</p>
      <p data-testid="loc">{ctx.mechanicLocation ? `${ctx.mechanicLocation.lat},${ctx.mechanicLocation.lng}` : "no-loc"}</p>
    </div>
  );
}

let store;
function mount() {
  store = configureStore({ reducer: { notifications } });
  return render(
    <Provider store={store}>
      <RequestProvider>
        <Probe />
      </RequestProvider>
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.socket = createFakeSocket();
  state.connected = true;
  state.user = { id: "u1", role: "customer" };
  api.listRequests.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe("RequestProvider — restore after refresh", () => {
  it("brings back the customer's active request", async () => {
    api.listRequests.mockResolvedValueOnce([req({ status: "on_the_way" })]);
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("on_the_way"));
    expect(api.listRequests.mock.calls[0][0]).toContain("status=requested,matched,on_the_way,arrived,in_progress");
  });

  it("restores a completed-but-unrated job so it can still be rated", async () => {
    api.listRequests.mockResolvedValueOnce([]).mockResolvedValueOnce([req({ status: "completed" })]);
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("completed"));
  });

  it("does not restore a job that was already rated", async () => {
    api.listRequests.mockResolvedValueOnce([]).mockResolvedValueOnce([req({ status: "completed", rating: 5 })]);
    mount();
    await waitFor(() => expect(api.listRequests).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("status")).toHaveTextContent("none");
  });

  it("does nothing for mechanics", async () => {
    state.user = { id: "m1", role: "mechanic" };
    mount();
    await act(async () => {});
    expect(api.listRequests).not.toHaveBeenCalled();
  });
});

describe("RequestProvider — real-time (Exp 8)", () => {
  beforeEach(() => api.listRequests.mockResolvedValueOnce([req()]));

  it("applies server-pushed status changes instantly and toasts them", async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("matched"));

    act(() => state.socket.serverEmit("request:update", req({ status: "on_the_way" })));
    expect(screen.getByTestId("status")).toHaveTextContent("on_the_way");
    expect(selectNotifications(store.getState()).map((n) => n.message)).toContain("Vikram is on the way");
    expect(document.title).toContain("On the way");

    act(() => state.socket.serverEmit("request:update", req({ status: "arrived" })));
    expect(screen.getByTestId("status")).toHaveTextContent("arrived");
  });

  it("ignores updates for a different request", async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("matched"));
    act(() => state.socket.serverEmit("request:update", req({ _id: "OTHER", status: "completed" })));
    expect(screen.getByTestId("status")).toHaveTextContent("matched");
  });

  it("tracks the mechanic's live location for this request only", async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("matched"));
    act(() => state.socket.serverEmit("mechanic:location", { requestId: "OTHER", lat: 1, lng: 1 }));
    expect(screen.getByTestId("loc")).toHaveTextContent("no-loc");
    act(() => state.socket.serverEmit("mechanic:location", { requestId: "r1", lat: 19.08, lng: 72.88 }));
    expect(screen.getByTestId("loc")).toHaveTextContent("19.08,72.88");
  });

  it("does NOT poll while the socket is connected", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("matched"));
    await act(async () => vi.advanceTimersByTime(30000));
    expect(api.getRequest).not.toHaveBeenCalled();
  });

  it("falls back to polling when the socket is down", async () => {
    state.connected = false;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.getRequest.mockResolvedValue(req({ status: "arrived" }));
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("matched"));
    await act(async () => vi.advanceTimersByTime(8100));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("arrived"));
  });
});

describe("RequestProvider — actions", () => {
  it("start → cancel → dismiss", async () => {
    mount();
    await act(async () => {});

    api.createRequest.mockResolvedValue(req({ status: "matched" }));
    await act(async () => {
      await ctx.startRequest({ problemType: "battery", location: { lat: 1, lng: 2 }, vehicleId: "v1" });
    });
    expect(api.createRequest).toHaveBeenCalledWith({ problemType: "battery", location: { lat: 1, lng: 2 }, vehicle: "v1" });
    expect(screen.getByTestId("status")).toHaveTextContent("matched");

    api.cancelRequest.mockResolvedValue(req({ status: "cancelled" }));
    await act(async () => ctx.cancelRequest());
    expect(screen.getByTestId("status")).toHaveTextContent("cancelled");

    act(() => ctx.dismissRequest());
    expect(screen.getByTestId("status")).toHaveTextContent("none");
  });

  it("surfaces a failed create (e.g. already have an active request)", async () => {
    mount();
    await act(async () => {});
    api.createRequest.mockRejectedValue(new Error("You already have an active request"));
    await act(async () => {
      await ctx.startRequest({ problemType: "battery", location: { lat: 1, lng: 2 } }).catch(() => {});
    });
    expect(ctx.error).toBe("You already have an active request");
    expect(screen.getByTestId("status")).toHaveTextContent("none");
  });

  it("rating updates the request and thanks the user", async () => {
    api.listRequests.mockResolvedValueOnce([]).mockResolvedValueOnce([req({ status: "completed" })]);
    mount();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("completed"));
    api.rateRequest.mockResolvedValue(req({ status: "completed", rating: 5 }));
    await act(async () => ctx.rateRequest(5, "great"));
    expect(api.rateRequest).toHaveBeenCalledWith("r1", 5, "great");
    expect(ctx.request.rating).toBe(5);
    expect(selectNotifications(store.getState()).some((n) => /Thanks/.test(n.message))).toBe(true);
  });
});
