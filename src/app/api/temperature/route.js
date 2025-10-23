let latestTemperature = null;

export async function POST(req) {
  const { temperature } = await req.json();

  if (temperature !== undefined) {
    latestTemperature = temperature;
    console.log(`Updated temperature: ${temperature}°C`);
    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new Response(JSON.stringify({ status: "error", message: "Temperature missing" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET() {
  if (latestTemperature !== null) {
    return new Response(JSON.stringify({ temperature: latestTemperature }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new Response(JSON.stringify({ message: "No temperature data yet" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
}
