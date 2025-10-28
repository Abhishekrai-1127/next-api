import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import Telemetry from "../../../../models/Telemetry";

export async function GET() {
  try {
    await connectDB();

    // Get latest data from DB
    const latest = await Telemetry.findOne().sort({ createdAt: -1 });

    if (!latest) {
      console.warn("⚠️ No data in DB — returning mock data");

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

      // Optionally insert mock into DB
      await Telemetry.create(mockData);

      return NextResponse.json({ ok: true, latest: mockData });
    }

    return NextResponse.json({ ok: true, latest });
  } catch (error) {
    console.error("❌ API Error:", error);

    // Return mock data on error
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

    const saved = await Telemetry.create({ ...data, mock: false });
    console.log("✅ Data stored in DB:", saved._id);

    return NextResponse.json({ ok: true, saved });
  } catch (error) {
    console.error("❌ Error saving data:", error);
    return NextResponse.json({ ok: false, error: error.message });
  }
}
