let store = {
  latest: null,
  history: []
};

export default function handler(req, res) {
  if (req.method === "POST") {
    try {
      const { spo2, heartRate, device, timestamp } = req.body;

      const entry = {
        spo2: Number(spo2),
        heartRate: Number(heartRate),
        device: device || "esp32-max30100",
        deviceTimestamp: timestamp || Date.now(),
        serverTimestamp: Date.now(),
      };

      store.latest = entry;
      store.history.push(entry);

      // keep only last 2000 points
      if (store.history.length > 2000) store.history.shift();

      return res.status(201).json({ ok: true });
    } catch (e) {
      return res.status(400).json({ ok: false, error: e.message });
    }
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      latest: store.latest,
      history: store.history,
    });
  }

  res.setHeader("Allow", "GET,POST");
  res.status(405).end("Method Not Allowed");
}
