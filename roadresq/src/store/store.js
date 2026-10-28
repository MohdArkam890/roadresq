import { configureStore } from "@reduxjs/toolkit";
import vehiclesReducer from "./vehiclesSlice";
import mechanicQueueReducer from "./mechanicQueueSlice";
import notificationsReducer from "./notificationsSlice";

/**
 * EXPERIMENT 3 — the store
 * --------------------------
 * Three independent slices combined into one store. Any component
 * wrapped in <Provider store={store}> (see main.jsx) can read from any
 * of them with useSelector and dispatch actions with useDispatch,
 * without props being threaded through the component tree.
 */
export const store = configureStore({
  reducer: {
    vehicles: vehiclesReducer,
    mechanicQueue: mechanicQueueReducer,
    notifications: notificationsReducer,
  },
});
