// app/api/telemetry/route.js
let store = {
  latest: null,
  history: [],
};

export async function POST(req) {
  try {
    const { spo2, heartRate, device, timestamp } = await req.json();

    const entry = {
      spo2: Number(spo2),
      heartRate: Number(heartRate),
      device: device || "esp32-max30100",
      deviceTimestamp: timestamp || Date.now(),
      serverTimestamp: Date.now(),
    };

    store.latest = entry;
    store.history.push(entry);

    if (store.history.length > 2000) store.history.shift();

    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 400 });
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    latest: store.latest,
    history: store.history,
  });
}
