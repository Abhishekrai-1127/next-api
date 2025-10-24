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
      validHR,
      validSPO2,
      device,
      timestamp,
    } = await req.json();

    // Only store if HR and SpO2 are valid
    if (!validHR || !validSPO2) {
      console.warn("⚠️ Ignored invalid reading");
      return Response.json({ ok: false, skipped: true });
    }

    const entry = {
      spo2: Number(spo2),
      heartRate: Number(heartRate),
      tempC: Number(tempC),
      tempF: Number(tempF),
      validHR: Boolean(validHR),
      validSPO2: Boolean(validSPO2),
      device: device || "esp32-max30102",
      deviceTimestamp: timestamp || Date.now(),
      serverTimestamp: Date.now(),
    };

    // Filter out bad values
    if (
      entry.spo2 <= 0 ||
      entry.heartRate <= 0 ||
      entry.spo2 > 100 ||
      entry.heartRate > 250
    ) {
      console.warn("⚠️ Out-of-range reading:", entry);
      return Response.json({ ok: false, skipped: true });
    }

    store.latest = entry;
    store.history.push(entry);
    if (store.history.length > 10000) store.history.shift();

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("POST Error:", e);
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    latest: store.latest,
    history: store.history.slice(-300),
  });
}
