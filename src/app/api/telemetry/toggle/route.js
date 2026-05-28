import { NextResponse } from "next/server";

// Ensure state is initialized on global
if (global.apiSimulationMode === undefined) {
  global.apiSimulationMode = false;
}

export async function GET() {
  return NextResponse.json({ ok: true, simulatedMode: global.apiSimulationMode });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.simulatedMode !== undefined) {
      global.apiSimulationMode = !!body.simulatedMode;
    } else {
      // Toggle if no value is explicitly passed
      global.apiSimulationMode = !global.apiSimulationMode;
    }
    return NextResponse.json({ ok: true, simulatedMode: global.apiSimulationMode });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
