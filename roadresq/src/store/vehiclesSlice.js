import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../lib/api";

/**
 * EXPERIMENT 3 + 4 — Redux slice backed by the real API
 * ----------------------------------------------------------
 * Same slice shape as Experiment 3, but the three operations are now
 * createAsyncThunk calls that hit RoadResQ's backend instead of
 * mutating local mock data — Redux still owns the client-side cache
 * and loading/error state, the database owns the source of truth.
 */
export const fetchVehicles = createAsyncThunk("vehicles/fetch", () => api.listVehicles());

export const addVehicle = createAsyncThunk("vehicles/add", (payload) => api.addVehicle(payload));

export const removeVehicle = createAsyncThunk("vehicles/remove", async (id) => {
  await api.removeVehicle(id);
  return id;
});

const initialState = {
  list: [],
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

const vehiclesSlice = createSlice({
  name: "vehicles",
  initialState,
  reducers: {
    resetVehicles: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(addVehicle.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(removeVehicle.fulfilled, (state, action) => {
        state.list = state.list.filter((v) => v._id !== action.payload);
      });
  },
});

export const { resetVehicles } = vehiclesSlice.actions;

export const selectVehicles = (state) => state.vehicles.list;
export const selectVehiclesStatus = (state) => state.vehicles.status;

export default vehiclesSlice.reducer;
