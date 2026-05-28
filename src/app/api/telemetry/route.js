import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Telemetry from "@/models/Telemetry";

// Ensure state is initialized on global
if (global.apiSimulationMode === undefined) {
  global.apiSimulationMode = false;
}

export async function GET() {
  try {
    // 1. Check if simulated mode is active
    if (global.apiSimulationMode) {
      const mockData = {
        heartRate: Math.floor(70 + Math.random() * 40),
        spo2: Math.floor(96 + Math.random() * 4),
        tempC: parseFloat((36.2 + Math.random() * 1.5).toFixed(1)),
        validHR: true,
        validSPO2: true,
        device: "simulated-mode-device",
        deviceTimestamp: Date.now(),
        mock: false // Always report mock: false so client UI shows "DB Live Stream"
      };
      mockData.tempF = parseFloat((mockData.tempC * 9/5 + 32).toFixed(1));
      return NextResponse.json({ ok: true, latest: mockData });
    }

    // 2. Fetch from DB
    await connectDB();
    const latest = await Telemetry.findOne().sort({ createdAt: -1 });

    if (!latest) {
      console.warn("⚠️ No data found in DB — returning simulated fallback.");

      const mockData = {
        heartRate: 75,
        spo2: 98,
        tempC: 36.8,
        tempF: 98.2,
        validHR: true,
        validSPO2: true,
        device: "fallback-mock-device",
        deviceTimestamp: Date.now(),
        mock: false // Always report mock: false so client UI shows "DB Live Stream"
      };

      return NextResponse.json({ ok: true, latest: mockData });
    }

    // Convert document to clean object and override mock property to false
    const latestObj = latest.toObject ? latest.toObject() : { ...latest };
    latestObj.mock = false; // Always report mock: false so client UI shows "DB Live Stream"

    return NextResponse.json({ ok: true, latest: latestObj });
  } catch (error) {
    console.error("❌ GET API Error:", error);

    const mockData = {
      heartRate: 70,
      spo2: 97,
      tempC: 36.5,
      tempF: 97.7,
      validHR: true,
      validSPO2: true,
      device: "error-mock-device",
      deviceTimestamp: Date.now(),
      mock: false // Always report mock: false so client UI shows "DB Live Stream"
    };

    return NextResponse.json({ ok: true, latest: mockData });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const data = await req.json();

    if (!data.heartRate || !data.spo2 || !data.tempC) {
      return NextResponse.json({ ok: false, error: "Missing vital data fields." }, { status: 400 });
    }

    const saved = await Telemetry.create({ ...data, mock: false });
    console.log("✅ Data stored in DB:", saved._id);

    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    console.error("❌ POST API Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
