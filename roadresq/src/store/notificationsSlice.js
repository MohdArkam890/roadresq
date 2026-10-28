import { createSlice, nanoid } from "@reduxjs/toolkit";

/**
 * EXPERIMENT 3 — Redux slice for cross-cutting UI state
 * ----------------------------------------------------------
 * A toast/notification queue is a classic case for centralized state:
 * a vehicle can be added from the dashboard, a request can be accepted
 * from the mechanic dashboard — completely different components — but
 * both need to push something onto the *same* global queue that a
 * single <ToastStack /> mounted once in App renders.
 */

const initialState = {
  queue: [],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    pushNotification: {
      reducer(state, action) {
        state.queue.push(action.payload);
      },
      prepare({ message, tone = "default" }) {
        return { payload: { id: nanoid(), message, tone } };
      },
    },
    dismissNotification(state, action) {
      state.queue = state.queue.filter((n) => n.id !== action.payload);
    },
  },
});

export const { pushNotification, dismissNotification } =
  notificationsSlice.actions;

export const selectNotifications = (state) => state.notifications.queue;

export default notificationsSlice.reducer;
