import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { createFakeSocket } from "../test/fakeSocket";
import { haversineKm } from "../utils/geo";
import vehicles from "../store/vehiclesSlice";
import mechanicQueue from "../store/mechanicQueueSlice";
import notifications from "../store/notificationsSlice";

const state = vi.hoisted(() => ({ socket: null, user: null }));
vi.mock("../context/SocketContext", () => ({
  useSocket: () => ({ socket: state.socket, connected: true }),
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("../hooks/useGeolocation", () => ({
  default: () => ({ location: { lat: 19.076, lng: 72.8777 }, loading: false, error: null, isFallback: true }),
}));
vi.mock("../lib/api", () => ({
  default: {
    listRequests: vi.fn(),
    listMessages: vi.fn(() => Promise.resolve([])),
    updateRequestStatus: vi.fn(),
    declineRequest: vi.fn(),
    setAvailability: vi.fn(() => Promise.resolve({})),
    me: vi.fn(),
    listVehicles: vi.fn(() => Promise.resolve([])),
    nearbyMechanics: vi.fn(() => Promise.resolve([])),
    rateRequest: vi.fn(),
    cancelRequest: vi.fn(),
  },
}));

import api from "../lib/api";
import MechanicDashboard from "./MechanicDashboard";
import CustomerDashboard from "./CustomerDashboard";
import { RequestProvider } from "../context/RequestContext";

const job = (over = {}) => ({
  _id: "j1",
  status: "matched",
  problemType: "battery",
  fare: 420,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  location: { lat: 19.07, lng: 72.87 },
  customer: { name: "Jordan Fernandes", phone: "+91 98765 43210" },
  mechanic: { _id: "m1", name: "Vikram Rao", specialty: "battery", location: { lat: 19.08, lng: 72.88 } },
  ...over,
});

function mount(ui) {
  const store = configureStore({ reducer: { vehicles, mechanicQueue, notifications } });
  render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  state.socket = createFakeSocket();
});

describe("MechanicDashboard — full job lifecycle", () => {
  beforeEach(() => {
    state.user = { id: "m1", name: "Vikram Rao", role: "mechanic", available: true, rating: 4.8 };
    api.me.mockResolvedValue({ user: { ...state.user, rating: 4.9 } });
    api.listRequests.mockResolvedValue([job()]);
  });

  it("accept → arrived → start → complete, updating earnings", async () => {
    mount(<MechanicDashboard />);
    expect(await screen.findByText("Jordan Fernandes")).toBeInTheDocument();
    expect(screen.getByText("4.9")).toBeInTheDocument(); // fresh rating from /auth/me

    api.updateRequestStatus.mockResolvedValueOnce(job({ status: "on_the_way" }));
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(api.updateRequestStatus).toHaveBeenLastCalledWith("j1", "on_the_way");

    api.updateRequestStatus.mockResolvedValueOnce(job({ status: "arrived" }));
    await userEvent.click(await screen.findByRole("button", { name: /I've arrived/ }));
    expect(api.updateRequestStatus).toHaveBeenLastCalledWith("j1", "arrived");

    api.updateRequestStatus.mockResolvedValueOnce(job({ status: "in_progress" }));
    await userEvent.click(await screen.findByRole("button", { name: /Start service/ }));
    expect(api.updateRequestStatus).toHaveBeenLastCalledWith("j1", "in_progress");

    api.updateRequestStatus.mockResolvedValueOnce(job({ status: "completed" }));
    await userEvent.click(await screen.findByRole("button", { name: /Complete job/ }));
    expect(api.updateRequestStatus).toHaveBeenLastCalledWith("j1", "completed");

    await waitFor(() => expect(screen.queryByRole("button", { name: /Complete job/ })).not.toBeInTheDocument());
    expect(screen.getByText("₹420")).toBeInTheDocument(); // today's earnings
  });

  it("shows navigation + call links for an active job", async () => {
    api.listRequests.mockResolvedValue([job({ status: "on_the_way" })]);
    mount(<MechanicDashboard />);
    const nav = await screen.findByRole("link", { name: /Navigate/ });
    expect(nav).toHaveAttribute("href", expect.stringContaining("19.07,72.87"));
    expect(screen.getByRole("link", { name: /98765/ })).toHaveAttribute("href", "tel:+91 98765 43210");
  });

  it("new requests arrive over the socket and removed ones disappear — no polling", async () => {
    api.listRequests.mockResolvedValue([]);
    mount(<MechanicDashboard />);
    await screen.findByText(/No pending requests/);

    act(() => state.socket.serverEmit("request:new", job({ _id: "j9", customer: { name: "Priya Shah" } })));
    expect(await screen.findByText("Priya Shah")).toBeInTheDocument();

    act(() => state.socket.serverEmit("request:removed", { id: "j9" }));
    await waitFor(() => expect(screen.queryByText("Priya Shah")).not.toBeInTheDocument());
    expect(api.listRequests).toHaveBeenCalledTimes(1);
  });

  it("decline calls the API and drops the job", async () => {
    api.declineRequest.mockResolvedValue(job({ status: "requested" }));
    mount(<MechanicDashboard />);
    await userEvent.click(await screen.findByRole("button", { name: "Decline" }));
    expect(api.declineRequest).toHaveBeenCalledWith("j1");
    await waitFor(() => expect(screen.queryByText("Jordan Fernandes")).not.toBeInTheDocument());
  });
});

describe("CustomerDashboard — live request, chat, rating", () => {
  beforeEach(() => {
    state.user = { id: "c1", name: "Jordan Fernandes", role: "customer" };
  });

  const mountCustomer = (restored) => {
    api.listRequests.mockImplementation((q) =>
      Promise.resolve(q.includes("status=completed") ? [] : restored ? [restored] : [])
    );
    return mount(
      <RequestProvider>
        <CustomerDashboard />
      </RequestProvider>
    );
  };

  it("restores the active request after a refresh and follows live status pushes", async () => {
    mountCustomer(job({ status: "matched" }));
    expect(await screen.findByText("Request status")).toBeInTheDocument();
    expect(screen.getByText(/Live — updates arrive instantly/)).toBeInTheDocument();

    act(() => state.socket.serverEmit("request:update", job({ status: "on_the_way" })));
    await waitFor(() => expect(screen.getAllByText("On the way").length).toBeGreaterThan(0));
    const km = haversineKm({ lat: 19.08, lng: 72.88 }, { lat: 19.07, lng: 72.87 }).toFixed(1);
    expect(screen.getByText(`${km} km away`)).toBeInTheDocument(); // computed from mechanic.location
  });

  it("opens the chat panel for a matched request", async () => {
    mountCustomer(job({ status: "on_the_way" }));
    await userEvent.click(await screen.findByRole("button", { name: /Chat/ }));
    expect(await screen.findByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByText(/Chat with Vikram/)).toBeInTheDocument();
  });

  it("can cancel before work starts but not once service is in progress", async () => {
    mountCustomer(job({ status: "arrived" }));
    expect(await screen.findByRole("button", { name: "Cancel" })).toBeInTheDocument();
    act(() => state.socket.serverEmit("request:update", job({ status: "in_progress" })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument());
  });

  it("asks for a rating when the job completes, submits it, then offers a fresh start", async () => {
    mountCustomer(job({ status: "in_progress" }));
    await screen.findByText("Request status");
    act(() => state.socket.serverEmit("request:update", job({ status: "completed" })));

    expect(await screen.findByText(/how was Vikram/)).toBeInTheDocument();
    api.rateRequest.mockResolvedValue(job({ status: "completed", rating: 5 }));
    await userEvent.click(screen.getByLabelText("5 stars"));
    await userEvent.click(screen.getByRole("button", { name: /submit rating/i }));
    expect(api.rateRequest).toHaveBeenCalledWith("j1", 5, "");

    expect(await screen.findByText(/thanks for rating/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(await screen.findByText("No active request")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New request/ })).toBeInTheDocument();
  });

  it("shows a cancelled request with a way to start over", async () => {
    mountCustomer(job({ status: "cancelled" }));
    await userEvent.click(await screen.findByRole("button", { name: /Start a new request/ }));
    expect(await screen.findByText("No active request")).toBeInTheDocument();
  });
});
