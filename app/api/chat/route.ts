import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Message = { role: string; content: string };
type Body = { model?: string; messages?: Message[] };

const LITEROUTER_MODELS = new Set([
  "deepseek-v4-flash-cheap:free:full-context", "gemini-2.5-flash:free", "gpt-oss-20b:free",
  "l3-8b-lunaris:free", "llama-3-8b-instruct:free", "llama-3.1-8b-instruct:free",
  "llama-3.3-70b-instruct-turbo:free", "ministral-3b-2512:free", "mistral-nemo-instruct-2407:free",
  "mistral-small-24b-instruct-2501:free", "mythomax-l2-13b:free", "nemotron-3-nano:free"
]);

const UNIPOOL_BASE_URL = "https://scriptzz.duckdns.org/v1";

function json(error: string, status = 500) {
  return NextResponse.json({ error }, { status });
}

async function unipool(model: string, messages: Message[]) {
  const key = process.env.UNIPOOL_API_KEY;
  if (!key) return json("UniPool is not configured. Add UNIPOOL_API_KEY to the Vercel environment.", 503);
  try {
    const r = await fetch(`${UNIPOOL_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, stream: false }),
      cache: "no-store"
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json(data?.error?.message || data?.error || `UniPool returned ${r.status}`, r.status);
    return NextResponse.json({ content: data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "", provider: "unipool", model, usage: data?.usage ?? null });
  } catch {
    return json("Unable to reach UniPool.");
  }
}

async function literouter(model: string, messages: Message[]) {
  const key = process.env.LITEROUTER_API_KEY;
  if (!key) return json("LiteRouter is not configured.", 503);
  try {
    const r = await fetch("https://api.literouter.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, stream: false }), cache: "no-store"
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json(data?.error?.message || data?.error || `LiteRouter returned ${r.status}`, r.status);
    return NextResponse.json({ content: data?.choices?.[0]?.message?.content ?? "", provider: "literouter", model, usage: data?.usage ?? null });
  } catch { return json("Unable to reach LiteRouter."); }
}

async function horde(model: string, messages: Message[]) {
  const prompt = messages.map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`).join("\n\n") + "\n\nAssistant:";
  try {
    const submit = await fetch("https://aihorde.net/api/v2/generate/text/async", {
      method: "POST", headers: { "Content-Type": "application/json", "Client-Agent": "NextRouter:1.0:anonymous" },
      body: JSON.stringify({ prompt, models: [model], params: { temperature: 0.7, max_length: 1024 }, trusted_workers: false, slow_workers: true })
    });
    if (!submit.ok) return json(`AI Horde returned ${submit.status}`, submit.status);
    const job = await submit.json() as { id?: string };
    if (!job.id) return json("AI Horde did not return a job.");
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await fetch(`https://aihorde.net/api/v2/generate/text/status/${job.id}`, { cache: "no-store" });
      if (!status.ok) continue;
      const data = await status.json() as { done?: boolean; faulted?: boolean; generations?: { text?: string }[] };
      if (data.faulted) return json("The AI Horde generation failed.");
      if (data.done) return NextResponse.json({ content: data.generations?.[0]?.text ?? "", provider: "horde", model });
    }
    return json("Generation timed out.", 504);
  } catch { return json("Unable to reach AI Horde."); }
}

export async function GET() {
  return NextResponse.json({
    name: "NextRouter Chat API",
    status: "ok",
    endpoint: "/api/chat",
    methods: ["POST"],
    usage: "POST JSON { model, messages }"
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Body | null;
  if (!body?.model || !Array.isArray(body.messages) || body.messages.length === 0) return json("A model and messages are required.", 400);
  if (LITEROUTER_MODELS.has(body.model)) return literouter(body.model, body.messages);

  const key = process.env.UNIPOOL_API_KEY;
  if (key) {
    try {
      const r = await fetch(`${UNIPOOL_BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
      if (r.ok) {
        const data = await r.json() as { data?: { id?: string }[] };
        if ((data.data ?? []).some(m => m.id === body.model)) return unipool(body.model, body.messages);
      }
    } catch {}
  }
  return horde(body.model, body.messages);
}
