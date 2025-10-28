import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Abhishekrai1127:Abhii^1001@healthcluster.xeazxdx.mongodb.net/?appName=HealthCluster";

if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI is not defined in environment variables");
}

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log("✅ MongoDB connected:", db.connection.name);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}
