import { NextResponse } from "next/server";

type RequestBody = {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
};

type RouterModel = {
  id?: string;
  name?: string;
  pricing?: Record<string, unknown>;
  [key: string]: unknown;
};

function isFreeModel(model: RouterModel) {
  const id = String(model.id ?? "").toLowerCase();
  const name = String(model.name ?? "").toLowerCase();
  if (id.endsWith(":free") || name.includes("free")) return true;

  const pricing = model.pricing;
  if (!pricing || typeof pricing !== "object") return false;
  const values = Object.values(pricing).filter((value) => value !== undefined && value !== null && value !== "");
  if (!values.length) return false;
  return values.every((value) => {
    const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.eE+-]/g, ""));
    return Number.isFinite(numeric) && numeric === 0;
  });
}

export async function POST(req: Request) {
  const key = process.env.LITEROUTER_API_KEY;
  if (!key) return NextResponse.json({ error: "AI access is not configured yet." }, { status: 503 });

  const body = (await req.json()) as RequestBody;
  if (!body.model || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "A model and messages are required." }, { status: 400 });
  }

  try {
    const modelsResponse = await fetch("https://api.literouter.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!modelsResponse.ok) throw new Error("Unable to validate model");

    const models = await modelsResponse.json();
    const selected = (Array.isArray(models?.data) ? models.data : []).find((model: RouterModel) => model.id === body.model);
    if (!selected || !isFreeModel(selected)) {
      return NextResponse.json({ error: "That model is not available for free use." }, { status: 403 });
    }

    const response = await fetch("https://api.literouter.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: body.model, messages: body.messages, stream: false }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Something went wrong while contacting the AI service." }, { status: 502 });
  }
}
