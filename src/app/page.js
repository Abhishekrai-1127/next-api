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

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/telemetry`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
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
  const heartRateInterval = latest
    ? 60 / latest.heartRate // in seconds per beat
    : 1;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>MAX30100 Live Dashboard</h1>

      {!latest ? (
        <p style={{ color: "#666" }}>Waiting for data...</p>
      ) : (
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div
            className="heart"
            style={{
              width: 40,
              height: 40,
              color: "crimson",
              animation: `pulse ${heartRateInterval}s infinite`,
            }}
          >
            ❤️
          </div>
          <div>
            <h3>
              Current SpO₂:{" "}
              <span style={{ color: "crimson" }}>{latest.spo2?.toFixed(1)} %</span>{" "}
              | Heart Rate:{" "}
              <span style={{ color: "royalblue" }}>
                {latest.heartRate?.toFixed(1)} bpm
              </span>
            </h3>
            <small>
              Updated at {new Date(latest.serverTimestamp).toLocaleTimeString()}
            </small>
          </div>
        </div>
      )}

      <div style={{ width: "100%", height: 400 }}>
        <ResponsiveContainer>
          <LineChart
            data={data.map((d) => ({
              time: new Date(d.serverTimestamp).toLocaleTimeString(),
              spo2: d.spo2,
              heartRate: d.heartRate,
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
            />
            <Line
              type="monotone"
              dataKey="heartRate"
              stroke="#2563eb"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Heart pulse animation */}
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
