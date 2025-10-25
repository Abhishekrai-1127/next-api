// app/api/telemetry/route.js
let store = {
  latest: null,
  history: [],
};

export async function POST(req) {
  try {
    const {
      spo2,
      heartRate,
      tempC,
      tempF,
      device,
      timestamp
    } = await req.json();

    // Validate incoming data
    if (
      spo2 == null || spo2 < 0 || spo2 > 100 ||
      heartRate == null || heartRate <= 0 || heartRate > 250
    ) {
      console.warn("⚠️ Invalid or out-of-range reading ignored");
      return Response.json({ ok: false, skipped: true });
    }

    const entry = {
      spo2: Number(spo2),
      heartRate: Number(heartRate),
      tempC: Number(tempC),
      tempF: Number(tempF),
      device: device || "esp32-max30102",
      deviceTimestamp: timestamp || Date.now(),
      serverTimestamp: Date.now(),
      validHR: true,
      validSPO2: true
    };

    store.latest = entry;
    store.history.push(entry);
    if (store.history.length > 10000) store.history.shift();

    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST Error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 400 });
  }
}

export async function GET() {
  try {
    return Response.json({
      ok: true,
      latest: store.latest,
      history: store.history.slice(-300)
    }, { status: 200 });
  } catch (err) {
    console.error("GET Error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
