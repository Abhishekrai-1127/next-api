"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [temperature, setTemperature] = useState(null);
  const [ledState, setLedState] = useState(false);

  // Fetch temperature every second
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/temperature");
      const data = await res.json();
      setTemperature(data.temperature);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch LED state on load
  useEffect(() => {
    const fetchLed = async () => {
      const res = await fetch("/api/led");
      const data = await res.json();
      setLedState(data.state);
    };
    fetchLed();
  }, []);

  // Toggle LED
  const toggleLed = async () => {
    const newState = !ledState;
    await fetch("/api/led", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: newState }),
    });
    setLedState(newState);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Temperature: {temperature ? temperature.toFixed(2) : "--"} °C</h1>
      <button
        onClick={toggleLed}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        {ledState ? "Turn LED Off" : "Turn LED On"}
      </button>
    </div>
  );
}
