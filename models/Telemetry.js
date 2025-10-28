import mongoose from "mongoose";

const TelemetrySchema = new mongoose.Schema(
  {
    heartRate: Number,
    spo2: Number,
    tempC: Number,
    tempF: Number,
    validHR: Boolean,
    validSPO2: Boolean,
    device: String,
    deviceTimestamp: Number,
    mock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Telemetry ||
  mongoose.model("Telemetry", TelemetrySchema);
