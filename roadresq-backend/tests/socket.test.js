const http = require("http");
const request = require("supertest");
const { Server } = require("socket.io");
const { io: connectClient } = require("socket.io-client");
const db = require("./helpers/db");
const { registerUser, makeMechanic, auth, MUMBAI, app } = require("./helpers/factory");
const initSocket = require("../src/sockets");
const Message = require("../src/models/Message");

let server, io, port;
const clients = [];

beforeAll(async () => {
  await db.connect();
  server = http.createServer(app);
  io = new Server(server);
  initSocket(io);
  app.set("io", io);
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
});
afterEach(async () => {
  clients.splice(0).forEach((c) => c.close());
  await db.clear();
});
afterAll(async () => {
  io.close();
  await new Promise((r) => server.close(r));
  await db.disconnect();
});

function connect(token) {
  const socket = connectClient(`http://localhost:${port}`, { auth: { token }, transports: ["websocket"], forceNew: true });
  clients.push(socket);
  return new Promise((resolve, reject) => {
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });
}
const once = (socket, event) => new Promise((r) => socket.once(event, r));
const emitAck = (socket, event, payload) => new Promise((r) => socket.emit(event, payload, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setup() {
  const c = await registerUser("customer");
  const m = await makeMechanic();
  const cs = await connect(c.token);
  const ms = await connect(m.token);
  return { c, m, cs, ms };
}
const createReq = (token) =>
  request(app).post("/api/requests").set(auth(token)).send({ problemType: "battery", location: MUMBAI });

describe("WebSockets (Exp 8)", () => {
  it("rejects connections without a valid JWT", async () => {
    await expect(connect("garbage")).rejects.toThrow(/Not authenticated/);
  });

  it("pushes request:new to the matched mechanic the instant a request is created", async () => {
    const { c, ms } = await setup();
    const incoming = once(ms, "request:new");
    const res = await createReq(c.token);
    const evt = await incoming;
    expect(String(evt._id)).toBe(res.body.data._id);
    expect(evt.problemType).toBe("battery");
  });

  it("broadcasts request:update to customer AND mechanic on each status change", async () => {
    const { c, m, cs, ms } = await setup();
    const id = (await createReq(c.token)).body.data._id;

    const forCustomer = once(cs, "request:update");
    const forMechanic = once(ms, "request:update");
    await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status: "on_the_way" });
    const [a, b] = await Promise.all([forCustomer, forMechanic]);
    expect(a.status).toBe("on_the_way");
    expect(b.status).toBe("on_the_way");
  });

  it("delivers and persists chat between the two participants", async () => {
    const { c, cs, ms } = await setup();
    const id = (await createReq(c.token)).body.data._id;
    await sleep(100); // let the server auto-join both sockets to the room

    const received = once(ms, "chat:message");
    const ack = await emitAck(cs, "chat:message", { requestId: id, text: "Flat battery on Linking Road" });
    expect(ack.ok).toBe(true);
    const msg = await received;
    expect(msg.text).toBe("Flat battery on Linking Road");
    expect(msg.from).toBe(c.user.id);

    expect(await Message.countDocuments({ request: id })).toBe(1);
    const history = await request(app).get(`/api/requests/${id}/messages`).set(auth(c.token));
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].text).toBe("Flat battery on Linking Road");
  });

  it("blocks outsiders from joining a room, chatting, or reading history", async () => {
    const { c } = await setup();
    const id = (await createReq(c.token)).body.data._id;

    const intruder = await registerUser("customer");
    const is = await connect(intruder.token);

    expect((await emitAck(is, "request:join", id)).ok).toBe(false);
    expect((await emitAck(is, "chat:message", { requestId: id, text: "hi" })).ok).toBe(false);
    expect((await request(app).get(`/api/requests/${id}/messages`).set(auth(intruder.token))).statusCode).toBe(403);
    expect(await Message.countDocuments()).toBe(0);
  });

  it("rejects empty and oversized messages", async () => {
    const { c, cs } = await setup();
    const id = (await createReq(c.token)).body.data._id;
    expect((await emitAck(cs, "chat:message", { requestId: id, text: "   " })).ok).toBe(false);
    expect((await emitAck(cs, "chat:message", { requestId: id, text: "x".repeat(501) })).ok).toBe(false);
  });

  it("closes chat once the request is finished", async () => {
    const { c, cs } = await setup();
    const id = (await createReq(c.token)).body.data._id;
    await request(app).patch(`/api/requests/${id}/cancel`).set(auth(c.token));
    const ack = await emitAck(cs, "chat:message", { requestId: id, text: "hello?" });
    expect(ack).toMatchObject({ ok: false, error: "This request is closed" });
  });

  it("relays the mechanic's live location to the customer, but only from the assigned mechanic", async () => {
    const { c, m, cs, ms } = await setup();
    const id = (await createReq(c.token)).body.data._id;
    await request(app).patch(`/api/requests/${id}/status`).set(auth(m.token)).send({ status: "on_the_way" });

    const ping = once(cs, "mechanic:location");
    ms.emit("mechanic:location", { requestId: id, lat: 19.081, lng: 72.879 });
    expect(await ping).toMatchObject({ requestId: id, lat: 19.081, lng: 72.879 });

    // a customer trying to spoof the mechanic's position is ignored
    let spoofed = false;
    cs.on("mechanic:location", () => { spoofed = true; });
    cs.emit("mechanic:location", { requestId: id, lat: 0, lng: 0 });
    await sleep(200);
    expect(spoofed).toBe(false);
  });

  it("tells a mechanic their job was removed when they decline", async () => {
    const { c, m, ms } = await setup();
    const id = (await createReq(c.token)).body.data._id;
    const removed = once(ms, "request:removed");
    await request(app).patch(`/api/requests/${id}/decline`).set(auth(m.token));
    expect((await removed).id).toBe(id);
  });
});
