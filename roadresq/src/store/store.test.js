import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

vi.mock("../lib/api", () => ({
  default: {
    listVehicles: vi.fn(),
    addVehicle: vi.fn(),
    removeVehicle: vi.fn(),
    listRequests: vi.fn(),
    updateRequestStatus: vi.fn(),
    declineRequest: vi.fn(),
  },
}));

import api from "../lib/api";
import vehicles, { fetchVehicles, addVehicle, removeVehicle, resetVehicles, selectVehicles } from "./vehiclesSlice";
import queue, {
  fetchAssignedRequests, acceptRequest, advanceRequest, declineRequest,
  upsertRequest, removeRequest, resetQueue,
  selectPendingRequests, selectActiveRequests, selectCompletedToday, selectEarningsToday,
} from "./mechanicQueueSlice";
import notifications, { pushNotification, dismissNotification, selectNotifications } from "./notificationsSlice";

const makeStore = () => configureStore({ reducer: { vehicles, mechanicQueue: queue, notifications } });
const job = (over) => ({ _id: "j1", status: "matched", fare: 400, updatedAt: new Date().toISOString(), ...over });

beforeEach(() => vi.clearAllMocks());

describe("vehiclesSlice (async thunks)", () => {
  it("loads, adds, removes and resets", async () => {
    const store = makeStore();
    api.listVehicles.mockResolvedValue([{ _id: "v1", name: "City" }]);
    await store.dispatch(fetchVehicles());
    expect(store.getState().vehicles.status).toBe("succeeded");
    expect(selectVehicles(store.getState())).toHaveLength(1);

    api.addVehicle.mockResolvedValue({ _id: "v2", name: "Activa" });
    await store.dispatch(addVehicle({ name: "Activa", plate: "X" }));
    expect(selectVehicles(store.getState())).toHaveLength(2);

    api.removeVehicle.mockResolvedValue({});
    await store.dispatch(removeVehicle("v1"));
    expect(selectVehicles(store.getState()).map((v) => v._id)).toEqual(["v2"]);

    store.dispatch(resetVehicles());
    expect(selectVehicles(store.getState())).toEqual([]);
  });

  it("records the error when loading fails", async () => {
    const store = makeStore();
    api.listVehicles.mockRejectedValue(new Error("boom"));
    await store.dispatch(fetchVehicles());
    expect(store.getState().vehicles).toMatchObject({ status: "failed", error: "boom" });
  });
});

describe("mechanicQueueSlice", () => {
  it("fetches and derives pending / active lists", async () => {
    const store = makeStore();
    api.listRequests.mockResolvedValue([
      job({ _id: "a", status: "matched" }),
      job({ _id: "b", status: "on_the_way" }),
      job({ _id: "c", status: "in_progress" }),
      job({ _id: "d", status: "cancelled" }),
    ]);
    await store.dispatch(fetchAssignedRequests());
    expect(selectPendingRequests(store.getState()).map((r) => r._id)).toEqual(["a"]);
    expect(selectActiveRequests(store.getState()).map((r) => r._id)).toEqual(["b", "c"]);
  });

  it("accept → advance walks a job through its lifecycle", async () => {
    const store = makeStore();
    store.dispatch(upsertRequest(job()));

    api.updateRequestStatus.mockResolvedValueOnce(job({ status: "on_the_way" }));
    await store.dispatch(acceptRequest("j1"));
    expect(api.updateRequestStatus).toHaveBeenCalledWith("j1", "on_the_way");

    api.updateRequestStatus.mockResolvedValueOnce(job({ status: "completed" }));
    await store.dispatch(advanceRequest({ id: "j1", status: "completed" }));
    expect(store.getState().mechanicQueue.list[0].status).toBe("completed");
  });

  it("decline removes the job from the list", async () => {
    const store = makeStore();
    store.dispatch(upsertRequest(job()));
    api.declineRequest.mockResolvedValue(job({ status: "requested" }));
    await store.dispatch(declineRequest("j1"));
    expect(store.getState().mechanicQueue.list).toHaveLength(0);
  });

  it("socket reducers upsert (no duplicates), remove and reset", () => {
    const store = makeStore();
    store.dispatch(upsertRequest(job()));
    store.dispatch(upsertRequest(job({ status: "on_the_way" })));
    expect(store.getState().mechanicQueue.list).toHaveLength(1);
    expect(store.getState().mechanicQueue.list[0].status).toBe("on_the_way");

    store.dispatch(removeRequest("j1"));
    expect(store.getState().mechanicQueue.list).toHaveLength(0);

    store.dispatch(upsertRequest(job()));
    store.dispatch(resetQueue());
    expect(store.getState().mechanicQueue.list).toEqual([]);
  });

  it("derives today's completed count and earnings, ignoring older jobs", () => {
    const store = makeStore();
    store.dispatch(upsertRequest(job({ _id: "1", status: "completed", fare: 350 })));
    store.dispatch(upsertRequest(job({ _id: "2", status: "completed", fare: 420 })));
    store.dispatch(upsertRequest(job({ _id: "3", status: "completed", fare: 999, updatedAt: "2020-01-01T00:00:00Z" })));
    store.dispatch(upsertRequest(job({ _id: "4", status: "matched", fare: 500 })));
    expect(selectCompletedToday(store.getState())).toBe(2);
    expect(selectEarningsToday(store.getState())).toBe(770);
  });
});

describe("notificationsSlice", () => {
  it("queues and dismisses toasts", () => {
    const store = makeStore();
    store.dispatch(pushNotification({ message: "hi", tone: "success" }));
    store.dispatch(pushNotification({ message: "again" }));
    const [first] = selectNotifications(store.getState());
    expect(first).toMatchObject({ message: "hi", tone: "success" });
    expect(selectNotifications(store.getState())[1].tone).toBe("default");
    store.dispatch(dismissNotification(first.id));
    expect(selectNotifications(store.getState())).toHaveLength(1);
  });
});
