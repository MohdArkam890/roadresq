import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../lib/api";
import { isToday } from "../utils/date";

/**
 * EXPERIMENT 3 + 4/6/8 — mechanic's job queue, backed by real data and
 * kept live by WebSocket events.
 *
 * fetchAssignedRequests loads every Request assigned to the logged-in
 * mechanic (the API already scopes GET /requests by role). The socket
 * handlers in MechanicDashboard dispatch `upsertRequest` / `removeRequest`
 * as `request:new`, `request:update` and `request:removed` arrive, so the
 * list updates instantly with no polling. Derived selectors compute the
 * daily stats straight from that one list.
 */
export const fetchAssignedRequests = createAsyncThunk("mechanicQueue/fetch", () =>
  api.listRequests("?limit=50")
);

export const acceptRequest = createAsyncThunk("mechanicQueue/accept", (id) =>
  api.updateRequestStatus(id, "on_the_way")
);

// advance an in-flight job: arrived → in_progress → completed
export const advanceRequest = createAsyncThunk("mechanicQueue/advance", ({ id, status }) =>
  api.updateRequestStatus(id, status)
);

export const declineRequest = createAsyncThunk("mechanicQueue/decline", (id) => api.declineRequest(id));

const initialState = {
  list: [],
  status: "idle",
  error: null,
};

const replace = (state, updated) => {
  const i = state.list.findIndex((r) => r._id === updated._id);
  if (i === -1) state.list.unshift(updated);
  else state.list[i] = updated;
};

const mechanicQueueSlice = createSlice({
  name: "mechanicQueue",
  initialState,
  reducers: {
    // pushed in from socket events
    upsertRequest(state, action) {
      replace(state, action.payload);
    },
    removeRequest(state, action) {
      state.list = state.list.filter((r) => r._id !== action.payload);
    },
    resetQueue: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignedRequests.pending, (state) => {
        if (state.status === "idle") state.status = "loading";
      })
      .addCase(fetchAssignedRequests.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.list = action.payload;
      })
      .addCase(fetchAssignedRequests.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(acceptRequest.fulfilled, (state, action) => replace(state, action.payload))
      .addCase(advanceRequest.fulfilled, (state, action) => replace(state, action.payload))
      .addCase(declineRequest.fulfilled, (state, action) => {
        // declined requests are re-assigned server-side — drop them from this mechanic's list
        state.list = state.list.filter((r) => r._id !== action.payload._id);
      });
  },
});

export const { upsertRequest, removeRequest, resetQueue } = mechanicQueueSlice.actions;

export const selectAllAssigned = (state) => state.mechanicQueue.list;
export const selectQueueStatus = (state) => state.mechanicQueue.status;

export const selectPendingRequests = (state) =>
  state.mechanicQueue.list.filter((r) => r.status === "matched");

export const selectActiveRequests = (state) =>
  state.mechanicQueue.list.filter((r) => ["on_the_way", "arrived", "in_progress"].includes(r.status));

// derived/computed selectors — same idea as Experiment 3, now over real documents
export const selectCompletedToday = (state) =>
  state.mechanicQueue.list.filter((r) => r.status === "completed" && isToday(r.updatedAt)).length;

export const selectEarningsToday = (state) =>
  state.mechanicQueue.list
    .filter((r) => r.status === "completed" && isToday(r.updatedAt))
    .reduce((sum, r) => sum + (r.fare || 0), 0);

export default mechanicQueueSlice.reducer;
