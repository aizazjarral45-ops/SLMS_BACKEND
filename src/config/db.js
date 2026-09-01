const dns = require("node:dns");
const mongoose = require("mongoose");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectionOptions = {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI must be configured. Refusing to start without a database connection string.",
    );
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, connectionOptions);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ MongoDB connection failed:", message);
    throw error;
  }
}

module.exports = connectDatabase;
