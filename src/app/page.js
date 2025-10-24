"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Page() {
  const [data, setData] = useState([]);
  const [latest, setLatest] = useState(null);

  const API_BASE =
    typeof window !== "undefined" &&
    window.location.hostname.includes("localhost")
      ? "http://localhost:3000"
      : "https://abhi.schema.cv";

  // Fetch from backend every 2 seconds
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (json.ok) {
        setData(json.history || []);
        setLatest(json.latest || null);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Calculate heartbeat interval for animation
  const heartRateInterval = latest?.heartRate
    ? 60 / latest.heartRate
    : 1;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>💓 MAX30102 Live Dashboard</h1>

      {!latest ? (
        <p style={{ color: "#666" }}>Waiting for sensor data...</p>
      ) : (
        <div
          style={{
            marginBottom: 20,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 20,
            background: "#f8fafc",
            padding: 16,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          {/* Animated heart */}
          <div
            style={{
              fontSize: 48,
              animation: `pulse ${heartRateInterval}s infinite ease-in-out`,
            }}
          >
            ❤️
          </div>

          <div>
            <h3 style={{ margin: 0 }}>
              SpO₂:{" "}
              <span style={{ color: "crimson", fontWeight: "bold" }}>
                {latest.spo2?.toFixed(1)} %
              </span>
              {" | "}
              HR:{" "}
              <span style={{ color: "royalblue", fontWeight: "bold" }}>
                {latest.heartRate?.toFixed(1)} bpm
              </span>
            </h3>
            <p style={{ margin: "4px 0" }}>
              🌡 Temp:{" "}
              <span style={{ color: "#16a34a", fontWeight: "bold" }}>
                {latest.tempC?.toFixed(2)} °C / {latest.tempF?.toFixed(2)} °F
              </span>
            </p>
            <p style={{ fontSize: 12, color: "#555" }}>
              ✅ HR valid: {latest.validHR ? "Yes" : "No"} | ✅ SpO₂ valid:{" "}
              {latest.validSPO2 ? "Yes" : "No"}
              <br />
              ⏱ Updated:{" "}
              {new Date(latest.serverTimestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={data.map((d) => ({
              time: new Date(d.serverTimestamp).toLocaleTimeString(),
              spo2: d.spo2,
              heartRate: d.heartRate,
              tempC: d.tempC,
            }))}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="spo2"
              stroke="#dc2626"
              dot={false}
              strokeWidth={2}
              name="SpO₂ (%)"
            />
            <Line
              type="monotone"
              dataKey="heartRate"
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
              name="Heart Rate (bpm)"
            />
            <Line
              type="monotone"
              dataKey="tempC"
              stroke="#16a34a"
              dot={false}
              strokeWidth={2}
              name="Temperature (°C)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CSS animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(1);
          }
          75% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
