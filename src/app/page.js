"use client";
import { useEffect, useState } from "react";

export default function page() {
  const [temperature, setTemperature] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("/api/temperature");
      const data = await res.json();
      setTemperature(data.temperature);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Temperature: {temperature ? temperature.toFixed(2) : "--"} °C</h1>
    </div>
  );
}
