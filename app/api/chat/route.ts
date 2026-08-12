import { NextResponse } from "next/server";

type RequestBody = { model?: string; messages?: Array<{ role: string; content: string }> };

export const dynamic = "force-dynamic";

const LITEROUTER_MODELS = new Set([
  "deepseek-v4-flash-cheap:free:full-context",
  "gemini-2.5-flash:free",
  "gpt-oss-20b:free",
  "l3-8b-lunaris:free",
  "llama-3-8b-instruct:free",
  "llama-3.1-8b-instruct:free",
  "llama-3.3-70b-instruct-turbo:free",
  "ministral-3b-2512:free",
  "mistral-nemo-instruct-2407:free",
  "mistral-small-24b-instruct-2501:free",
  "mythomax-l2-13b:free",
  "nemotron-3-nano:free",
]);

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;
  if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "A model and messages are required." }, { status: 400 });
  }

  if (LITEROUTER_MODELS.has(body.model)) {
    const key = process.env.LITEROUTER_API_KEY;
    if (!key) return NextResponse.json({ error: "LiteRouter is not configured." }, { status: 503 });
    try {
      const response = await fetch("https://api.literouter.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: body.model, messages: body.messages, stream: false }),
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data?.error?.message || `LiteRouter returned ${response.status}.` }, { status: response.status });
      return NextResponse.json({ content: data?.choices?.[0]?.message?.content ?? "" });
    } catch {
      return NextResponse.json({ error: "Something went wrong while contacting LiteRouter." }, { status: 502 });
    }
  }

  const prompt = body.messages.map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`).join("\n\n") + "\n\nAssistant:";
  try {
    const submit = await fetch("https://aihorde.net/api/v2/generate/text/async", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Agent": "NextRouter:1.0:anonymous" },
      body: JSON.stringify({ prompt, models: [body.model], params: { temperature: 0.7, max_length: 1024 }, trusted_workers: false, slow_workers: true }),
    });
    if (!submit.ok) return NextResponse.json({ error: `AI service returned ${submit.status}.` }, { status: submit.status });
    const job = await submit.json() as { id?: string };
    if (!job.id) return NextResponse.json({ error: "The AI service did not return a job." }, { status: 502 });
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const statusResponse = await fetch(`https://aihorde.net/api/v2/generate/text/status/${job.id}`, { cache: "no-store" });
      if (!statusResponse.ok) continue;
      const status = await statusResponse.json() as { done?: boolean; faulted?: boolean; generations?: Array<{ text?: string }> };
      if (status.faulted) return NextResponse.json({ error: "The generation failed." }, { status: 502 });
      if (status.done) return NextResponse.json({ content: status.generations?.[0]?.text ?? "" });
    }
    return NextResponse.json({ error: "Generation timed out." }, { status: 504 });
  } catch {
    return NextResponse.json({ error: "Something went wrong while contacting the AI service." }, { status: 502 });
  }
}
