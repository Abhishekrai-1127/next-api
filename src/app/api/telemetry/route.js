import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Telemetry from "@/models/Telemetry";

export async function GET() {
  try {
    await connectDB();
    const latest = await Telemetry.findOne().sort({ createdAt: -1 });

    if (!latest) {
      console.warn("⚠️ No data found — returning mock data.");

      const mockData = {
        heartRate: 75,
        spo2: 98,
        tempC: 36.8,
        tempF: 98.2,
        validHR: true,
        validSPO2: true,
        device: "mock-device",
        deviceTimestamp: Date.now(),
        mock: true,
      };

      await Telemetry.create(mockData);

      return NextResponse.json({ ok: true, latest: mockData });
    }

    return NextResponse.json({ ok: true, latest });
  } catch (error) {
    console.error("❌ GET API Error:", error);

    const mockData = {
      heartRate: 70,
      spo2: 97,
      tempC: 36.5,
      tempF: 97.7,
      validHR: true,
      validSPO2: true,
      device: "mock-device",
      deviceTimestamp: Date.now(),
      mock: true,
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
