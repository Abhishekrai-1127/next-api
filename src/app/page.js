"use client";

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

// ✅ Use relative path so it works with Next.js API route
const API_URL = "/api/telemetry";

export default function RealtimeHealthDashboard({ pollInterval = 3000 }) {
  const [points, setPoints] = useState([]);
  const [latest, setLatest] = useState(null);
  const [status, setStatus] = useState("idle");
  const mounted = useRef(true);

  // ✅ Simple validation helper
  const isValidDataPoint = (data) =>
    data &&
    typeof data.heartRate === "number" &&
    typeof data.spo2 === "number" &&
    typeof data.tempC === "number";

  useEffect(() => {
    mounted.current = true;

    const poll = async () => {
      try {
        setStatus("fetching");

        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);

        const data = await res.json();

        // ✅ Handle both /api/telemetry and direct ESP32-style JSON
        const payload = data.latest || data;

        if (!payload) {
          console.warn("No data yet from API");
          return;
        }

        if (!isValidDataPoint(payload)) {
          console.warn("Invalid data format received", payload);
          return;
        }

        const point = {
          time: new Date(payload.timestamp || Date.now()).toLocaleTimeString(),
          heartRate: payload.heartRate ?? null,
          spo2: payload.spo2 ?? null,
          tempC: payload.tempC ?? null,
        };

        if (!mounted.current) return;

        setLatest(payload);
        setPoints((prev) => [...prev.slice(-60), point]);
        setStatus("ok");
      } catch (err) {
        console.error("Fetch error:", err);
        if (!mounted.current) return;
        setStatus("error");
      }
    };

    poll();
    const id = setInterval(poll, pollInterval);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [pollInterval]);

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <Header status={status} />

        {/* Metric Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card
            title="Heart Rate"
            value={latest && latest.heartRate ? latest.heartRate : "—"}
            unit="bpm"
          />
          <Card
            title="SpO₂"
            value={latest && latest.spo2 ? latest.spo2 : "—"}
            unit="%"
          />
          <Card
            title="Temperature"
            value={
              latest && latest.tempC ? latest.tempC.toFixed(2) : "—"
            }
            unit="°C"
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Heart Rate & SpO₂ (recent)">
            <ChartContainer>
              <LineChart
                data={points}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" minTickGap={20} />
                <YAxis yAxisId="left" domain={[30, 180]} />
                <YAxis yAxisId="right" orientation="right" domain={[85, 101]} />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spo2"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </Panel>

          <Panel title="Temperature (°C)">
            <ChartContainer>
              <LineChart
                data={points}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[10, 45]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="tempC"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </Panel>
        </section>

        <Footer latest={latest} />
      </div>
    </div>
  );
}

/* ───────────────────────────── Components ───────────────────────────── */

function Header({ status }) {
  return (
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
  );
}

function Card({ title, value, unit }) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold">{value}</div>
        {unit && <div className="text-sm text-gray-500">{unit}</div>}
      </div>
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

function ChartContainer({ children }) {
  return <div style={{ width: "100%", height: 300 }}>{children}</div>;
}

function Footer({ latest }) {
  return (
    <footer className="mt-6 text-sm text-gray-600">
      <div>
        Latest timestamp:{" "}
        {latest
          ? new Date(latest.timestamp || Date.now()).toLocaleString()
          : "—"}
      </div>
      <div className="mt-1">
        Note: This fetches data from your Next.js API at <b>/api/telemetry</b>.
      </div>
    </footer>
  );
}
