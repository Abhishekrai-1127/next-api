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
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend
} from "recharts";

const API_URL = "/api/telemetry";
const FETCH_TIMEOUT = 6000;
const MAX_POINTS = 30;

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [dataPoints, setDataPoints] = useState([]);
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState(null);
  const [simulatingDevice, setSimulatingDevice] = useState(false);
  const [simulatedApiMode, setSimulatedApiMode] = useState(false);
  const abortControllerRef = useRef(null);

  // --- Dynamic Dashboard State ---
  // 1. Steps Data (Hourly today)
  const [stepsLog, setStepsLog] = useState([
    { time: "06:00", steps: 420 },
    { time: "08:00", steps: 1200 },
    { time: "10:00", steps: 1850 },
    { time: "12:00", steps: 950 },
    { time: "14:00", steps: 600 },
    { time: "16:00", steps: 1400 },
    { time: "18:00", steps: 2100 },
    { time: "20:00", steps: 800 },
    { time: "22:00", steps: 320 }
  ]);
  const stepsGoal = 10000;
  const totalSteps = stepsLog.reduce((sum, item) => sum + item.steps, 0);

  // 2. Active Calories & Minutes (7 Days)
  const [activeLog, setActiveLog] = useState([
    { day: "Mon", kcal: 340, mins: 35 },
    { day: "Tue", kcal: 480, mins: 50 },
    { day: "Wed", kcal: 290, mins: 30 },
    { day: "Thu", kcal: 510, mins: 55 },
    { day: "Fri", kcal: 420, mins: 45 },
    { day: "Sat", kcal: 680, mins: 80 },
    { day: "Sun", kcal: 390, mins: 40 }
  ]);
  const caloriesGoal = 500;
  const activeTimeGoal = 60;
  const todayActive = activeLog[activeLog.length - 1];

  // 4. Sleep Stages (7 Days stacked)
  const [sleepLog, setSleepLog] = useState([
    { day: "Mon", deep: 1.5, rem: 1.6, light: 4.2, awake: 0.4 },
    { day: "Tue", deep: 1.8, rem: 1.5, light: 4.6, awake: 0.3 },
    { day: "Wed", deep: 1.2, rem: 1.8, light: 3.9, awake: 0.6 },
    { day: "Thu", deep: 1.6, rem: 1.7, light: 4.3, awake: 0.2 },
    { day: "Fri", deep: 2.1, rem: 1.6, light: 4.5, awake: 0.3 },
    { day: "Sat", deep: 2.4, rem: 2.1, light: 5.1, awake: 0.4 },
    { day: "Sun", deep: 1.7, rem: 1.9, light: 4.0, awake: 0.5 }
  ]);
  const sleepGoal = 8.0; // 8 hours
  const todaySleep = sleepLog[sleepLog.length - 1];
  const totalSleepTime = todaySleep.deep + todaySleep.rem + todaySleep.light;

  // 5. Stress Level Tracker (Hourly today)
  const [stressLog, setStressLog] = useState([
    { time: "08:00", stress: 45 },
    { time: "10:00", stress: 62 },
    { time: "12:00", stress: 78 },
    { time: "14:00", stress: 50 },
    { time: "16:00", stress: 35 },
    { time: "18:00", stress: 68 },
    { time: "20:00", stress: 42 },
    { time: "22:00", stress: 28 }
  ]);
  const currentStress = stressLog[stressLog.length - 1].stress;
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingText, setBreathingText] = useState("Get Ready");
  const [breathCount, setBreathCount] = useState(0);

  // 7. Hydration (Water Intake - 7 Days)
  const [waterLog, setWaterLog] = useState([
    { day: "Mon", ml: 1500 },
    { day: "Tue", ml: 2250 },
    { day: "Wed", ml: 1750 },
    { day: "Thu", ml: 2000 },
    { day: "Fri", ml: 1250 },
    { day: "Sat", ml: 2500 },
    { day: "Sun", ml: 1000 }
  ]);
  const waterGoal = 2000;
  const todayWater = waterLog[waterLog.length - 1].ml;

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Telemetry Fetching ---
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

      const point = {
        time: new Date(payload.createdAt || payload.timestamp || Date.now()).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        heartRate: payload.heartRate,
        spo2: payload.spo2,
        tempC: parseFloat(payload.tempC).toFixed(1),
        tempF: parseFloat(payload.tempF || (payload.tempC * 9/5) + 32).toFixed(1),
        mock: payload.mock
      };

      setLatest(payload);
      setDataPoints((prev) => {
        // If data points are empty, pre-populate with some mock progression so it displays nicely
        if (prev.length === 0) {
          const arr = [];
          const now = Date.now();
          for (let i = MAX_POINTS - 1; i >= 1; i--) {
            const timeStr = new Date(now - i * 5000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });
            arr.push({
              time: timeStr,
              heartRate: Math.floor(65 + Math.random() * 20),
              spo2: Math.floor(96 + Math.random() * 3),
              tempC: (36.3 + Math.random() * 0.6).toFixed(1),
              tempF: ((36.3 + Math.random() * 0.6) * 9/5 + 32).toFixed(1),
              mock: true
            });
          }
          return [...arr, point];
        }
        return [...prev, point].slice(-MAX_POINTS);
      });
      setError(null);
    } catch (err) {
      clearTimeout(timeout);
      console.warn("⚠️ Fetch telemetry failed. Using client simulation.", err.message);

      // Generate local simulator update
      const mock = {
        heartRate: Math.floor(65 + Math.random() * 35),
        spo2: Math.floor(95 + Math.random() * 5),
        tempC: parseFloat((36.4 + Math.random() * 1.2).toFixed(1)),
        mock: true,
        timestamp: Date.now()
      };
      mock.tempF = parseFloat((mock.tempC * 9/5 + 32).toFixed(1));

      const point = {
        time: new Date(mock.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
        heartRate: mock.heartRate,
        spo2: mock.spo2,
        tempC: mock.tempC.toFixed(1),
        tempF: mock.tempF.toFixed(1),
        mock: true
      };

      setLatest(mock);
      setDataPoints((prev) => {
        if (prev.length === 0) {
          const arr = [];
          const now = Date.now();
          for (let i = MAX_POINTS - 1; i >= 1; i--) {
            const temp = 36.2 + Math.random() * 0.8;
            arr.push({
              time: new Date(now - i * 5000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              }),
              heartRate: Math.floor(68 + Math.random() * 15),
              spo2: Math.floor(97 + Math.random() * 2),
              tempC: temp.toFixed(1),
              tempF: (temp * 9/5 + 32).toFixed(1),
              mock: true
            });
          }
          return [...arr, point];
        }
        return [...prev, point].slice(-MAX_POINTS);
      });
      setError(null);
    }
  }, []);

  // --- Send Simulated Telemetry to DB ---
  const sendSensorTelemetry = async () => {
    const simHR = Math.floor(70 + Math.random() * 50);
    const simSPO2 = Math.floor(96 + Math.random() * 4);
    const simTempC = parseFloat((36.2 + Math.random() * 1.5).toFixed(1));
    const simTempF = parseFloat((simTempC * 9/5 + 32).toFixed(1));

    const body = {
      heartRate: simHR,
      spo2: simSPO2,
      tempC: simTempC,
      tempF: simTempF,
      validHR: true,
      validSPO2: true,
      device: "Health-Data-Simulator",
      deviceTimestamp: Date.now()
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        console.log("🚀 Telemetry POST successfully saved to DB!");
        fetchTelemetry(); // Refresh immediately
      }
    } catch (e) {
      console.error("❌ Failed to POST telemetry to DB", e);
    }
  };

  const fetchApiToggleState = useCallback(async () => {
    try {
      const res = await fetch("/api/telemetry/toggle");
      if (res.ok) {
        const data = await res.json();
        setSimulatedApiMode(data.simulatedMode);
      }
    } catch (err) {
      console.error("Failed to fetch API toggle state", err);
    }
  }, []);

  const handleToggleApiMode = async () => {
    try {
      const res = await fetch("/api/telemetry/toggle", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSimulatedApiMode(data.simulatedMode);
        fetchTelemetry(); // Refresh data immediately
      }
    } catch (err) {
      console.error("Failed to toggle API mode", err);
    }
  };

  useEffect(() => {
    fetchApiToggleState();
  }, [fetchApiToggleState]);

  // Start telemetry loop
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchTelemetry]);

  // Simulated live telemetry POST interval
  useEffect(() => {
    let timer;
    if (simulatingDevice) {
      timer = setInterval(() => {
        sendSensorTelemetry();
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [simulatingDevice]);

  // --- Interaction Handlers ---

  // 1. Steps Incrementor
  const handleAddSteps = () => {
    setStepsLog((prev) => {
      const copy = [...prev];
      // Increment last item
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        steps: copy[copy.length - 1].steps + 1000
      };
      return copy;
    });
  };

  // 2. Active Workout Logger
  const handleLogWorkout = () => {
    setActiveLog((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      copy[lastIdx] = {
        ...copy[lastIdx],
        kcal: copy[lastIdx].kcal + 250,
        mins: copy[lastIdx].mins + 30
      };
      return copy;
    });
  };

  // 4. Sleep Incrementor/Decrementor
  const handleAdjustSleep = (amount) => {
    setSleepLog((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      const today = copy[lastIdx];
      // Add or remove sleep stages proportionally
      const multiplier = (totalSleepTime + amount) / totalSleepTime;
      if (totalSleepTime + amount <= 2) return prev; // min 2h limit

      copy[lastIdx] = {
        ...today,
        deep: parseFloat((today.deep * multiplier).toFixed(1)),
        rem: parseFloat((today.rem * multiplier).toFixed(1)),
        light: parseFloat((today.light * multiplier).toFixed(1))
      };
      return copy;
    });
  };

  // 5. Stress Level Breathing Cycle
  const triggerBreathingSession = () => {
    if (breathingActive) return;
    setBreathingActive(true);
    setBreathCount(3);
    setBreathingText("Inhale...");

    let stage = 0; // 0: inhale, 1: hold, 2: exhale
    let cycles = 3;

    const timer = setInterval(() => {
      stage = (stage + 1) % 3;
      if (stage === 0) {
        cycles -= 1;
        setBreathCount(cycles);
        if (cycles === 0) {
          clearInterval(timer);
          setBreathingActive(false);
          setBreathingText("Completed");
          // Drop Stress level today
          setStressLog((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            const newStress = Math.max(10, copy[lastIdx].stress - 20);
            copy[lastIdx] = { ...copy[lastIdx], stress: newStress };
            return copy;
          });
          return;
        }
        setBreathingText("Inhale...");
      } else if (stage === 1) {
        setBreathingText("Hold...");
      } else {
        setBreathingText("Exhale...");
      }
    }, 3000);
  };

  const handleSimulateStress = () => {
    setStressLog((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      const newStress = Math.min(100, copy[lastIdx].stress + 15);
      copy[lastIdx] = { ...copy[lastIdx], stress: newStress };
      return copy;
    });
  };

  // 7. Water Hydration Logger
  const handleAddWater = (amount) => {
    setWaterLog((prev) => {
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      copy[lastIdx] = { ...copy[lastIdx], ml: copy[lastIdx].ml + amount };
      return copy;
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wider animate-pulse text-emerald-400">
            LOADING HEALTH METRICS...
          </span>
        </div>
      </div>
    );
  }

  // Derived averages/stats for charts
  const averageHR = dataPoints.length
    ? Math.round(dataPoints.reduce((acc, p) => acc + Number(p.heartRate), 0) / dataPoints.length)
    : "—";
  const maxHR = dataPoints.length
    ? Math.max(...dataPoints.map((p) => Number(p.heartRate)))
    : "—";
  const minHR = dataPoints.length
    ? Math.min(...dataPoints.map((p) => Number(p.heartRate)))
    : "—";

  const averageSpo2 = dataPoints.length
    ? (dataPoints.reduce((acc, p) => acc + Number(p.spo2), 0) / dataPoints.length).toFixed(1)
    : "—";
  const minSpo2 = dataPoints.length
    ? Math.min(...dataPoints.map((p) => Number(p.spo2)))
    : "—";

  const avgTempC = dataPoints.length
    ? (dataPoints.reduce((acc, p) => acc + Number(p.tempC), 0) / dataPoints.length).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] p-4 md:p-8 selection:bg-emerald-500/30">
      {/* HEADER SECTION */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            Health Data
          </h1>
          <p className="text-zinc-500 text-sm mt-1 font-medium">
            Active Wellness & Realtime Telemetry Hub
          </p>
        </div>

        {/* Telemetry Control Panel */}
        <div className="flex flex-wrap items-center gap-3 bg-[#18181b] border border-zinc-800 p-3 rounded-2xl w-full md:w-auto shadow-lg shadow-black/40">
          <div className="flex items-center gap-2 mr-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-semibold text-zinc-300">
              DB Live Stream
            </span>
          </div>

          <button
            onClick={handleToggleApiMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
              simulatedApiMode
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
            }`}
          >
            {simulatedApiMode ? "🔌 Stream: Secondary" : "🔌 Stream: Primary"}
          </button>

          <button
            onClick={() => setSimulatingDevice(!simulatingDevice)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
              simulatingDevice
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
            }`}
          >
            {simulatingDevice ? "⏹️ Stop Sync" : "🔄 Auto-Sync"}
          </button>

          <button
            onClick={sendSensorTelemetry}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-md shadow-emerald-950/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            ⚡ Send Telemetry Node
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex items-center gap-3">
          <span className="text-amber-500 text-base">⚠️</span>
          <p className="text-xs font-medium text-zinc-400">{error}</p>
        </div>
      )}

      {/* TOP SUMMARY & VITAL RINGS */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Ring summary */}
        <div className="lg:col-span-2 bg-[#121214] border border-zinc-900 rounded-[28px] p-6 flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-black/30 transition-transform duration-300 hover:border-zinc-800/60">
          <ActivityRings
            steps={totalSteps}
            stepsGoal={stepsGoal}
            activeTime={todayActive.mins}
            activeTimeGoal={activeTimeGoal}
            activeCalories={todayActive.kcal}
            activeCaloriesGoal={caloriesGoal}
          />
          <div className="flex-1 w-full space-y-4">
            <h3 className="text-base font-bold text-zinc-300">Daily Goal Summary</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1c1c1f] p-3 rounded-2xl border border-zinc-800/40">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Steps</p>
                <p className="text-lg font-black mt-1 text-zinc-100">{totalSteps.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500">of {stepsGoal}</p>
              </div>
              <div className="bg-[#1c1c1f] p-3 rounded-2xl border border-zinc-800/40">
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Active</p>
                <p className="text-lg font-black mt-1 text-zinc-100">{todayActive.mins} <span className="text-xs font-normal text-zinc-400">m</span></p>
                <p className="text-[10px] text-zinc-500">of {activeTimeGoal}</p>
              </div>
              <div className="bg-[#1c1c1f] p-3 rounded-2xl border border-zinc-800/40">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Energy</p>
                <p className="text-lg font-black mt-1 text-zinc-100">{todayActive.kcal} <span className="text-xs font-normal text-zinc-400">cal</span></p>
                <p className="text-[10px] text-zinc-500">of {caloriesGoal}</p>
              </div>
            </div>
            <p className="text-xs text-zinc-500 italic">
              * Concurrently syncing active telemetry parameters from MongoDB & device local state.
            </p>
          </div>
        </div>

        {/* Real-time vitals card */}
        <div className="bg-gradient-to-br from-[#1b1212] to-[#121214] border border-red-950/20 rounded-[28px] p-6 flex flex-col justify-between shadow-xl shadow-red-950/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Realtime Pulse</span>
              <h2 className="text-4xl font-black text-zinc-100 mt-2 flex items-baseline gap-1.5">
                {latest?.heartRate || "—"}
                <span className="text-base font-normal text-zinc-500">bpm</span>
              </h2>
            </div>
            <div
              className={`h-12 w-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center ${
                latest?.heartRate ? "animate-heartbeat" : ""
              }`}
              style={{
                animationDuration: latest?.heartRate ? `${60 / latest.heartRate}s` : "0.8s"
              }}
            >
              <svg className="w-6 h-6 text-red-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/40 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Blood Oxygen</p>
              <p className="text-lg font-extrabold text-cyan-400 mt-0.5">{latest?.spo2 || "—"}%</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase">Skin Temp</p>
              <p className="text-lg font-extrabold text-amber-500 mt-0.5">{latest?.tempC || "—"}°C</p>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-zinc-500 flex justify-between items-center bg-[#09090b]/40 p-2 rounded-xl border border-zinc-800/30">
            <span>Last DB Sync:</span>
            <span className="font-mono text-zinc-400">
              {latest?.createdAt || latest?.timestamp
                ? new Date(latest.createdAt || latest.timestamp).toLocaleTimeString()
                : "Awaiting Data"}
            </span>
          </div>
        </div>
      </section>

      {/* THE 8 INTERACTIVE GRAPHS GRID */}
      <section className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* GRAPH 1: STEPS TRACKER */}
        <ChartPanel
          title="1. Daily Steps"
          description="Hourly progress today"
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          }
          actions={
            <button
              onClick={handleAddSteps}
              className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg border border-emerald-500/30 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              🏃‍♂️ +1,000 Steps
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={stepsLog} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="steps" />} cursor={{ fill: "rgba(16, 185, 129, 0.05)" }} />
              <Bar dataKey="steps" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* GRAPH 2: ACTIVE CALORIES & TIME */}
        <ChartPanel
          title="2. Active Energy"
          description="Last 7 days active levels"
          icon={
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          actions={
            <button
              onClick={handleLogWorkout}
              className="px-3 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[11px] font-bold rounded-lg border border-orange-500/30 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              🏋️‍♂️ Log 30m Run
            </button>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={activeLog} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="kcalGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="day" stroke="#52525b" fontSize={9} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="" />} />
              <Area type="monotone" dataKey="kcal" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#kcalGlow)" name="Calories (kcal)" />
              <Line type="monotone" dataKey="mins" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} name="Active Mins (m)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* GRAPH 3: HEART RATE MONITOR (REALTIME) */}
        <ChartPanel
          title="3. Heart Rate"
          description={`Range: ${minHR}-${maxHR} bpm • Avg: ${averageHR}`}
          icon={
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          }
          actions={
            <span className="text-[10px] text-zinc-500 font-mono bg-[#1c1c1f] px-2 py-0.5 rounded border border-zinc-800">
              Live Stream
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={dataPoints} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="hrGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="time" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis domain={[40, 160]} stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="bpm" />} />
              <Area type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#hrGlow)" name="Pulse" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* GRAPH 4: SLEEP ANALYSIS */}
        <ChartPanel
          title="4. Sleep Analysis"
          description={`Last night: ${Math.floor(totalSleepTime)}h ${Math.round((totalSleepTime - Math.floor(totalSleepTime)) * 60)}m`}
          icon={
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          }
          actions={
            <div className="flex gap-1">
              <button
                onClick={() => handleAdjustSleep(-0.5)}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded cursor-pointer"
              >
                -30m
              </button>
              <button
                onClick={() => handleAdjustSleep(0.5)}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded cursor-pointer"
              >
                +30m
              </button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={sleepLog} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} stackOffset="none">
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="day" stroke="#52525b" fontSize={9} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="hrs" />} />
              <Bar dataKey="deep" stackId="a" fill="#312e81" name="Deep" />
              <Bar dataKey="rem" stackId="a" fill="#7c3aed" name="REM" />
              <Bar dataKey="light" stackId="a" fill="#0ea5e9" name="Light" />
              <Bar dataKey="awake" stackId="a" fill="#f59e0b" name="Awake" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* GRAPH 5: STRESS LEVEL TRACKER */}
        <ChartPanel
          title="5. Stress Level"
          description={`Current Level: ${currentStress}/100`}
          icon={
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          actions={
            <div className="flex gap-1.5">
              <button
                onClick={handleSimulateStress}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer"
              >
                ⚡ Stress
              </button>
              <button
                onClick={triggerBreathingSession}
                disabled={breathingActive}
                className={`px-2 py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                  breathingActive
                    ? "bg-[#6366f1]/20 border-[#6366f1]/40 text-[#818cf8]"
                    : "bg-[#6366f1]/10 border-[#6366f1]/20 text-[#a5b4fc] hover:bg-[#6366f1]/20"
                }`}
              >
                {breathingActive ? "🧘 Breath" : "🧘 Breathe"}
              </button>
            </div>
          }
        >
          <div className="relative">
            {breathingActive && (
              <div className="absolute inset-0 bg-[#09090b]/90 rounded-xl flex flex-col items-center justify-center z-10 border border-zinc-800">
                <div className="w-12 h-12 bg-indigo-500/20 border-2 border-indigo-400 rounded-full animate-breathing flex items-center justify-center">
                  <span className="text-zinc-200 font-extrabold text-[10px]">{breathCount}s</span>
                </div>
                <span className="text-xs font-bold text-indigo-300 mt-2 tracking-wide uppercase">
                  {breathingText}
                </span>
              </div>
            )}
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={stressLog} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="time" stroke="#52525b" fontSize={9} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#52525b" fontSize={9} tickLine={false} />
                <Tooltip content={<CustomTooltip unit="/100" />} />
                <Area type="monotone" dataKey="stress" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#stressGrad)" name="Stress Level" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        {/* GRAPH 6: BLOOD OXYGEN (SPO2) */}
        <ChartPanel
          title="6. Blood Oxygen"
          description={`Range: ${minSpo2}-100% • Avg: ${averageSpo2}%`}
          icon={
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
            </svg>
          }
          actions={
            <span className="text-[10px] text-zinc-500 font-mono bg-[#1c1c1f] px-2 py-0.5 rounded border border-zinc-800">
              Live Stream
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={dataPoints} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="time" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis domain={[90, 100]} stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Area type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#spo2Grad)" name="SpO₂ Level" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* GRAPH 7: WATER INTAKE TRACKER */}
        <ChartPanel
          title="7. Hydration"
          description={`Today: ${todayWater}ml / ${waterGoal}ml`}
          icon={
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
            </svg>
          }
          actions={
            <div className="flex gap-1">
              <button
                onClick={() => handleAddWater(250)}
                className="px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                +250ml
              </button>
              <button
                onClick={() => handleAddWater(500)}
                className="px-2 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30 active:scale-95 transition-all duration-150 cursor-pointer"
              >
                +500ml
              </button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={waterLog} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="day" stroke="#52525b" fontSize={9} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ml" />} />
              <Bar dataKey="ml" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* GRAPH 8: SKIN TEMPERATURE */}
        <ChartPanel
          title="8. Skin Temperature"
          description={`Average: ${avgTempC}°C • ${latest?.tempF || "—"}°F`}
          icon={
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          actions={
            <span className="text-[10px] text-zinc-500 font-mono bg-[#1c1c1f] px-2 py-0.5 rounded border border-zinc-800">
              Live Stream
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={dataPoints} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="time" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis domain={[34.0, 39.0]} stroke="#52525b" fontSize={9} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="°C" />} />
              <Line type="monotone" dataKey="tempC" stroke="#fbbf24" strokeWidth={2} dot={false} name="Skin Temp (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      {/* FOOTER METADATA */}
      <footer className="max-w-7xl mx-auto mt-12 pt-6 border-t border-zinc-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
        <p className="font-semibold text-zinc-600">
          Health Data Portal • Designed to WOW
        </p>
        <p>
          Polling REST Telemetry node every 5s • MongoDB Active state
        </p>
      </footer>
    </div>
  );
}

// concentric goal progress rings
function ActivityRings({ steps, stepsGoal, activeTime, activeTimeGoal, activeCalories, activeCaloriesGoal }) {
  const stepsPercent = Math.min(100, (steps / stepsGoal) * 100);
  const activePercent = Math.min(100, (activeTime / activeTimeGoal) * 100);
  const caloriesPercent = Math.min(100, (activeCalories / activeCaloriesGoal) * 100);

  return (
    <div className="relative w-44 h-44 flex items-center justify-center bg-[#09090b]/40 rounded-full border border-zinc-800/40 p-4 shadow-inner">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Ring Backgrounds */}
        <circle cx="50" cy="50" r="40" stroke="#166534" strokeWidth="5.5" strokeOpacity="0.2" fill="transparent" />
        <circle cx="50" cy="50" r="32" stroke="#ea580c" strokeWidth="5.5" strokeOpacity="0.2" fill="transparent" />
        <circle cx="50" cy="50" r="24" stroke="#e11d48" strokeWidth="5.5" strokeOpacity="0.2" fill="transparent" />

        {/* Ring Progresses (with dash offsets) */}
        {/* Ring 1 (Steps - Green) */}
        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#10b981"
          strokeWidth="6"
          strokeDasharray={2 * Math.PI * 40}
          strokeDashoffset={2 * Math.PI * 40 * (1 - stepsPercent / 100)}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />

        {/* Ring 2 (Active Mins - Orange) */}
        <circle
          cx="50"
          cy="50"
          r="32"
          stroke="#f97316"
          strokeWidth="6"
          strokeDasharray={2 * Math.PI * 32}
          strokeDashoffset={2 * Math.PI * 32 * (1 - activePercent / 100)}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />

        {/* Ring 3 (Calories - Red) */}
        <circle
          cx="50"
          cy="50"
          r="24"
          stroke="#f43f5e"
          strokeWidth="6"
          strokeDasharray={2 * Math.PI * 24}
          strokeDashoffset={2 * Math.PI * 24 * (1 - caloriesPercent / 100)}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center Icon Indicator */}
      <div className="absolute flex flex-col items-center justify-center">
        <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Vitals</span>
      </div>
    </div>
  );
}

// Chart container wrapper
function ChartPanel({ title, description, icon, children, actions }) {
  return (
    <div className="bg-[#121214] border border-zinc-900 rounded-[28px] p-5 flex flex-col shadow-xl shadow-black/20 hover:border-zinc-800/80 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800/50 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-200">{title}</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{description}</p>
          </div>
        </div>
        <div className="flex items-center">{actions}</div>
      </div>
      <div className="flex-1 mt-2">{children}</div>
    </div>
  );
}

// Recharts Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121214] border border-zinc-800 p-2.5 rounded-xl shadow-2xl text-[10px]">
        <p className="text-zinc-500 font-bold mb-1 tracking-wider uppercase">{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} style={{ color: p.color || p.stroke }} className="font-extrabold flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
            {p.name}: {p.value}
            <span className="text-zinc-500 font-normal">{unit || p.unit || ""}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};
