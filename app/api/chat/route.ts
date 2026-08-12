import { NextResponse } from "next/server";

type RequestBody = { model?: string; messages?: Array<{ role: string; content: string }> };

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as RequestBody;
  if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "A model and messages are required." }, { status: 400 });
  }

  const prompt = body.messages.map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`).join("\n\n") + "\n\nAssistant:";

  try {
    const submit = await fetch("https://aihorde.net/api/v2/generate/text/async", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Agent": "NextRouter:1.0:anonymous" },
      body: JSON.stringify({ prompt, models: [body.model], params: { temperature: 0.7, max_length: 1024 }, trusted_workers: false, slow_workers: true })
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
      if (status.done) return NextResponse.json({ choices: [{ message: { role: "assistant", content: status.generations?.[0]?.text ?? "" } }] });
    }
    return NextResponse.json({ error: "Generation timed out." }, { status: 504 });
  } catch {
    return NextResponse.json({ error: "Something went wrong while contacting the AI service." }, { status: 502 });
  }
}
