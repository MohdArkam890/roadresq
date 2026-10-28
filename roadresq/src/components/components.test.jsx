import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { createFakeSocket } from "../test/fakeSocket";

const state = vi.hoisted(() => ({ socket: null, connected: true, user: null }));
vi.mock("../context/SocketContext", () => ({
  useSocket: () => ({ socket: state.socket, connected: state.connected }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock("../lib/api", () => ({
  default: { listMessages: vi.fn(() => Promise.resolve([])) },
}));

import api from "../lib/api";
import ChatPanel from "./ChatPanel";
import RatingForm from "./RatingForm";
import ProtectedRoute from "./ProtectedRoute";
import RouteTracker from "./RouteTracker";

beforeEach(() => {
  state.socket = createFakeSocket();
  state.connected = true;
  vi.clearAllMocks();
  api.listMessages.mockResolvedValue([]);
});

describe("ChatPanel (Exp 8)", () => {
  it("loads history, sends via the socket, and renders incoming messages", async () => {
    api.listMessages.mockResolvedValue([{ id: "m0", requestId: "r1", from: "them", text: "On my way", at: "" }]);
    render(<ChatPanel requestId="r1" myId="me" />);

    expect(await screen.findByText("On my way")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Message"), "Blue Swift, hazard lights on");
    await userEvent.click(screen.getByLabelText("Send message"));
    expect(state.socket.emitted.at(-1)).toMatchObject({
      event: "chat:message",
      payload: { requestId: "r1", text: "Blue Swift, hazard lights on" },
    });

    act(() => state.socket.serverEmit("chat:message", { id: "m1", requestId: "r1", from: "them", text: "See you in 5" }));
    expect(screen.getByText("See you in 5")).toBeInTheDocument();
  });

  it("ignores messages for other requests and de-duplicates by id", async () => {
    render(<ChatPanel requestId="r1" myId="me" />);
    await screen.findByText(/No messages yet/);
    act(() => state.socket.serverEmit("chat:message", { id: "x", requestId: "OTHER", from: "a", text: "leak" }));
    act(() => state.socket.serverEmit("chat:message", { id: "d", requestId: "r1", from: "a", text: "once" }));
    act(() => state.socket.serverEmit("chat:message", { id: "d", requestId: "r1", from: "a", text: "once" }));
    expect(screen.queryByText("leak")).not.toBeInTheDocument();
    expect(screen.getAllByText("once")).toHaveLength(1);
  });

  it("shows the server's rejection text when a send fails", async () => {
    state.socket.emit = (event, payload, ack) => ack({ ok: false, error: "This request is closed" });
    render(<ChatPanel requestId="r1" myId="me" />);
    await userEvent.type(screen.getByLabelText("Message"), "hello");
    await userEvent.click(screen.getByLabelText("Send message"));
    expect(await screen.findByText("This request is closed")).toBeInTheDocument();
  });

  it("is read-only once the request is closed", async () => {
    render(<ChatPanel requestId="r1" myId="me" closed />);
    await act(async () => {}); // let the history fetch settle
    expect(screen.queryByLabelText("Message")).not.toBeInTheDocument();
    expect(screen.getByText(/read-only/)).toBeInTheDocument();
  });
});

describe("RatingForm", () => {
  it("requires a star rating before submitting, then passes rating + review", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    render(<RatingForm mechanicName="Vikram" onSubmit={onSubmit} onSkip={() => {}} />);
    expect(screen.getByText(/how was Vikram/)).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: /submit rating/i });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByLabelText("4 stars"));
    await userEvent.type(screen.getByPlaceholderText(/anything to add/i), "Quick fix");
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith(4, "Quick fix");
  });

  it("shows an error if submitting fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("already rated"));
    render(<RatingForm onSubmit={onSubmit} onSkip={() => {}} />);
    await userEvent.click(screen.getByLabelText("5 stars"));
    await userEvent.click(screen.getByRole("button", { name: /submit rating/i }));
    expect(await screen.findByText("already rated")).toBeInTheDocument();
  });
});

describe("ProtectedRoute (Exp 6 on the client)", () => {
  const renderAt = (role) =>
    render(
      <MemoryRouter initialEntries={["/mechanic"]}>
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/mechanic" element={<ProtectedRoute role={role}><p>secret</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );

  it("sends anonymous visitors to /login", () => {
    state.user = null;
    renderAt("mechanic");
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("bounces the wrong role to home, lets the right role in", () => {
    state.user = { role: "customer" };
    const { unmount } = renderAt("mechanic");
    expect(screen.getByText("home")).toBeInTheDocument();
    unmount();

    state.user = { role: "mechanic" };
    renderAt("mechanic");
    expect(screen.getByText("secret")).toBeInTheDocument();
  });
});

describe("RouteTracker", () => {
  it("shows a live ETA when given one, and 'On site' once arrived", () => {
    const { rerender } = render(<RouteTracker status="on_the_way" distance="1.2 km away" etaMinutes={4} />);
    expect(screen.getByText("1.2 km away")).toBeInTheDocument();
    expect(screen.getByText("~4 min")).toBeInTheDocument();

    rerender(<RouteTracker status="arrived" distance="0 km" etaMinutes={0} />);
    expect(screen.getByText("On site")).toBeInTheDocument();
  });
});
