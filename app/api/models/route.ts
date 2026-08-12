import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HordeModel = { name?: string; count?: number };

function displayName(id: string) {
  let name = id.split("/").pop() || id;
  name = name.replace(/[-_]/g, " ").replace(/\bInstruct(?:ion)?\b/gi, "").replace(/\bChat\b/gi, "").replace(/\bIT\b/g, "").replace(/\s+/g, " ").trim();
  name = name.replace(/\bMeta Llama\b/gi, "Llama").replace(/\bQwen\b/gi, "Qwen").replace(/\bDeepseek\b/gi, "DeepSeek");
  return name;
}

export async function GET() {
  try {
    const response = await fetch("https://aihorde.net/api/v2/status/models?type=text", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const models = (await response.json()) as HordeModel[];
    const seen = new Set<string>();
    const output = models
      .filter((m) => m.name)
      .map((m) => ({ id: String(m.name), name: displayName(String(m.name)), source: "Horde", type: "text", status: `${m.count ?? 0} workers` }))
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
    return NextResponse.json({ models: output });
  } catch {
    return NextResponse.json({ models: [], error: "Unable to load models right now." }, { status: 502 });
  }
}
