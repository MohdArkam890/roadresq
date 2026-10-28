process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
process.env.NODE_ENV = "test";

const mongoose = require("mongoose");

let memoryServer;

// Uses MONGO_URI_TEST when set (CI service container / local mongod),
// otherwise spins up an in-memory MongoDB via mongodb-memory-server.
async function connect() {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connect, clear, disconnect };
