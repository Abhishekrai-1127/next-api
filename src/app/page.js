"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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

const API_URL = "/api/telemetry";
const FETCH_TIMEOUT = 6000;
const MAX_POINTS = 60;

export default function Page() {
  const [dataPoints, setDataPoints] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchTelemetry = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeout = setTimeout(() => {
      if (!controller.signal.aborted) controller.abort("Fetch timeout exceeded");
    }, FETCH_TIMEOUT);

    try {
      const res = await fetch(API_URL, { cache: "no-store", signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json.latest) throw new Error("Empty payload");

      const payload = json.latest;

      if (payload.mock) console.warn("🧩 MOCK DATA USED:", payload);
      else console.log("✅ LIVE DATA RECEIVED:", payload);

      const point = {
        time: new Date(payload.timestamp || Date.now()).toLocaleTimeString(),
        heartRate: payload.heartRate,
        spo2: payload.spo2,
        tempC: payload.tempC,
        mock: payload.mock,
      };

      setLatest(payload);
      setDataPoints((prev) => [...prev, point].slice(-MAX_POINTS));
      setError(null);
    } catch (err) {
      clearTimeout(timeout);
      console.error("❌ Fetch error:", err);

      const mock = {
        heartRate: Math.floor(60 + Math.random() * 40),
        spo2: Math.floor(95 + Math.random() * 5),
        tempC: (36 + Math.random() * 1.5).toFixed(2),
        mock: true,
        timestamp: Date.now(),
      };

      console.log("🧩 Using mock data:", mock);

      const point = {
        time: new Date(mock.timestamp).toLocaleTimeString(),
        heartRate: mock.heartRate,
        spo2: mock.spo2,
        tempC: mock.tempC,
        mock: true,
      };

      setLatest(mock);
      setDataPoints((prev) => [...prev, point].slice(-MAX_POINTS));
      setError("Using mock data (network error or timeout)");
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchTelemetry]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Realtime Health Dashboard</h1>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              latest?.mock ? "bg-yellow-400" : "bg-green-500"
            }`}
          />
          <span className="text-sm font-medium">
            {latest?.mock ? "Mock Data" : "Live Data"}
          </span>
        </div>
      </header>

      {error && (
        <div className="mb-4 text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Metric title="Heart Rate" value={latest?.heartRate ?? "—"} unit="bpm" />
        <Metric title="SpO₂" value={latest?.spo2 ?? "—"} unit="%" />
        <Metric title="Temperature" value={latest?.tempC ?? "—"} unit="°C" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartPanel title="Heart Rate & SpO₂">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="left" domain={[40, 180]} />
              <YAxis yAxisId="right" orientation="right" domain={[90, 100]} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                name="Heart Rate (BPM)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="spo2"
                stroke="#3b82f6"
                name="SpO₂ (%)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Temperature (°C)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dataPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[20, 45]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="tempC"
                stroke="#f59e0b"
                name="Temperature (°C)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <footer className="mt-6 text-sm text-gray-500 text-center">
        Latest update:{" "}
        {latest?.timestamp
          ? new Date(latest.timestamp).toLocaleString()
          : "No data yet"}
      </footer>
    </div>
  );
}

function Metric({ title, value, unit }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="mt-2 text-3xl font-bold">
        {value} <span className="text-gray-400 text-lg">{unit}</span>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-gray-500 text-sm mb-2 font-medium">{title}</div>
      {children}
    </div>
  );
}
