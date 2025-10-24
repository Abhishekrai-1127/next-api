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
      const json = await res.json();
      if (json.ok) {
        setData(json.history || []);
        setLatest(json.latest || null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>💓 MAX30102 + Temp Dashboard</h1>

      {!latest ? (
        <p>Waiting for data...</p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 40,
                animation: latest.heartRate > 0 ? `pulse ${60 / latest.heartRate}s infinite` : 'none',
              }}
            >
              ❤️
            </div>
            <div>
              <h3>
                SpO₂:{" "}
                <span style={{ color: "crimson" }}>
                  {latest.spo2?.toFixed(1)}%
                </span>{" "}
                | HR:{" "}
                <span style={{ color: "royalblue" }}>
                  {latest.heartRate?.toFixed(1)} bpm
                </span>{" "}
                | Temp:{" "}
                <span style={{ color: "orange" }}>
                  {latest.tempC?.toFixed(2)} °C /{" "}
                  {latest.tempF?.toFixed(2)} °F
                </span>
              </h3>
              <small>
                Device: {latest.device} | Updated{" "}
                {new Date(latest.serverTimestamp).toLocaleTimeString()}
              </small>
            </div>
          </div>

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
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="tempC"
                  stroke="#f59e0b"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
