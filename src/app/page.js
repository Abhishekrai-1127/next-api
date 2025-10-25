import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";


const API_URL = "https://abhi.schema.cv/api/telemetry";

export default function RealtimeHealthDashboard({ pollInterval = 3000 }) {
  const [points, setPoints] = useState([]); // history for charts
  const [latest, setLatest] = useState(null);
  const [status, setStatus] = useState("idle");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const poll = async () => {
      try {
        setStatus("fetching");
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Expecting object like { heartRate, spo2, tempC, tempF, validHR, validSPO2, timestamp }
        const point = {
          time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
          heartRate: Number(data.heartRate) || null,
          spo2: Number(data.spo2) || null,
          tempC: Number(data.tempC) || null,
        };

        if (!mounted.current) return;
        setLatest(data);
        setPoints((prev) => {
          const next = [...prev, point].slice(-60); // keep last 60 points
          return next;
        });
        setStatus("ok");
      } catch (err) {
        console.error("Fetch error", err);
        if (!mounted.current) return;
        setStatus("error");
      }
    };

    poll(); // initial poll immediately
    const id = setInterval(poll, pollInterval);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [pollInterval]);

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold">Realtime Health Dashboard</h1>
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                status === "ok"
                  ? "bg-green-500"
                  : status === "fetching"
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-red-500"
              }`}
              title={`status: ${status}`}
            />
            <div className="text-sm text-gray-600">{status}</div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card title="Heart Rate" value={latest && latest.heartRate ? latest.heartRate : "—"} unit="bpm" valid={latest && latest.validHR} />
          <Card title="SpO₂" value={latest && latest.spo2 ? latest.spo2 : "—"} unit="%" valid={latest && latest.validSPO2} />
          <Card title="Temperature" value={latest && latest.tempC ? latest.tempC.toFixed(2) : "—"} unit="°C" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Heart Rate & SpO₂ (last points)">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" minTickGap={20} />
                  <YAxis yAxisId="left" domain={[30, 180]} />
                  <YAxis yAxisId="right" orientation="right" domain={[85, 101]} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#ff6b6b" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="spo2" stroke="#4f46e5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Temperature (°C)">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[10, 45]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="tempC" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        <footer className="mt-6 text-sm text-gray-600">
          <div>
            Latest timestamp: {latest ? new Date(latest.timestamp || Date.now()).toLocaleString() : "—"}
          </div>
          <div className="mt-1">
            Note: Ensure your API allows CORS for this dashboard (Access-Control-Allow-Origin).
          </div>
        </footer>
      </div>
    </div>
  );
}

function Card({ title, value, unit, valid }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold">{value}</div>
        {unit && <div className="text-sm text-gray-500">{unit}</div>}
      </div>
      {typeof valid !== "undefined" && (
        <div className="mt-2 text-xs">
          <span className={`px-2 py-1 rounded ${valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {valid ? "Valid" : "Not validated"}
          </span>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-3">{title}</div>
      {children}
    </div>
  );
}
