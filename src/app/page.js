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

  const fetchData = async () => {
    try {
      const res = await fetch("/api/telemetry");
      const json = await res.json();
      if (json.ok) {
        setData(json.history);
        setLatest(json.latest);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // poll every 2s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>MAX30100 Live Dashboard</h1>

      {!latest ? (
        <p style={{ color: "#666" }}>Waiting for data...</p>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <h3>
            Current SpO₂:{" "}
            <span style={{ color: "crimson" }}>
              {latest.spo2?.toFixed(1)} %
            </span>{" "}
            | Heart Rate:{" "}
            <span style={{ color: "royalblue" }}>
              {latest.heartRate?.toFixed(1)} bpm
            </span>
          </h3>
          <small>
            Updated at{" "}
            {new Date(latest.serverTimestamp).toLocaleTimeString()}
          </small>
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
    </div>
  );
}
