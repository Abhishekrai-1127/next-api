"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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

// API URL
const API_URL = "https://abhi.schema.cv/api/telemetry";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          <h3 className="font-bold">Something went wrong</h3>
          <p className="text-sm">{this.state.error?.message || 'Unknown error occurred'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RealtimeHealthDashboard({ pollInterval = 3000 }) {
  const [points, setPoints] = useState([]);
  const [latest, setLatest] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  
  // Validate data point
  const isValidDataPoint = useCallback((data) => {
    return (
      data &&
      typeof data === 'object' &&
      (data.heartRate === undefined || (typeof data.heartRate === 'number' && data.heartRate >= 30 && data.heartRate <= 200)) &&
      (data.spo2 === undefined || (typeof data.spo2 === 'number' && data.spo2 >= 0 && data.spo2 <= 100)) &&
      (data.tempC === undefined || (typeof data.tempC === 'number' && data.tempC >= 20 && data.tempC <= 45))
    );
  }, []);

  const fetchData = useCallback(async () => {
    if (!mounted.current) return;
    
    try {
      setStatus("fetching");
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(API_URL, { 
        cache: "no-store",
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (!isValidDataPoint(data)) {
        throw new Error('Received invalid data format');
      }
      
      const point = {
        time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
        heartRate: data.heartRate !== undefined ? Number(data.heartRate) : null,
        spo2: data.spo2 !== undefined ? Number(data.spo2) : null,
        tempC: data.tempC !== undefined ? Number(data.tempC) : null,
      };

      if (!mounted.current) return;
      
      setLatest(data);
      setPoints(prev => {
        const newPoints = [...prev, point];
        // Keep only the last 60 points (5 minutes at 5s intervals)
        return newPoints.slice(-60);
      });
      setStatus("ok");
    } catch (err) {
      console.error("Fetch error:", err);
      if (!mounted.current || err.name === 'AbortError') return;
      
      setError(err.message || 'Failed to fetch data');
      setStatus("error");
    }
  }, [isValidDataPoint]);

  useEffect(() => {
    mounted.current = true;
    
    // Initial fetch
    fetchData();
    
    // Set up polling
    const poll = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    
    const id = setInterval(poll, pollInterval);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData(); // Refresh data when tab becomes visible
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    

    return () => {
      mounted.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, pollInterval]);

  // Render loading state
  if (status === 'idle' || status === 'fetching' && points.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Data</h2>
          <p className="text-red-600 mb-4">{error || 'Failed to load data from the server'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen p-6 bg-gray-50 text-gray-900">
        <div className="max-w-6xl mx-auto">
          <Header status={status} />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card title="Heart Rate" value={latest && latest.heartRate ? latest.heartRate : "—"} unit="bpm" valid />
          <Card title="SpO₂" value={latest && latest.spo2 ? latest.spo2 : "—"} unit="%" valid />
          <Card title="Temperature" value={latest && latest.tempC ? latest.tempC.toFixed(2) : "—"} unit="°C" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Heart Rate & SpO₂ (last points)">
            <ChartContainer>
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
            </ChartContainer>
          </Panel>

          <Panel title="Temperature (°C)">
            <ChartContainer>
              <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={[10, 45]} />
                <Tooltip />
                <Line type="monotone" dataKey="tempC" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </Panel>
        </section>

          <Footer latest={latest} />
        </div>
      </div>
    </ErrorBoundary>
  );
}

function Header({ status }) {
  return (
    <header className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-extrabold">Realtime Health Dashboard</h1>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${status === "ok" ? "bg-green-500" : status === "fetching" ? "bg-yellow-400 animate-pulse" : "bg-red-500"}`} title={`status: ${status}`} />
        <div className="text-sm text-gray-600">{status}</div>
      </div>
    </header>
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
      {valid && (
        <div className="mt-2 text-xs">
          <span className="px-2 py-1 rounded bg-green-100 text-green-700">Valid</span>
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

function ChartContainer({ children }) {
  return <div style={{ width: "100%", height: 300 }}>{children}</div>;
}

function Footer({ latest }) {
  return (
    <footer className="mt-6 text-sm text-gray-600">
      <div>Latest timestamp: {latest ? new Date(latest.timestamp || Date.now()).toLocaleString() : "—"}</div>
      <div className="mt-1">Note: Ensure your API allows CORS for this dashboard (Access-Control-Allow-Origin).</div>
    </footer>
  );
}
