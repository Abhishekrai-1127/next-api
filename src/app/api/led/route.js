let ledState = false;

export async function GET() {
  return new Response(JSON.stringify({ state: ledState }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  const { state } = await req.json();
  if (state !== undefined) {
    ledState = !!state;
    console.log("LED state updated:", ledState);
    return new Response(JSON.stringify({ status: "success", state: ledState }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ status: "error", message: "State missing" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
