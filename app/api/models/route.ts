import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type HordeModel = { name?: string; count?: number };

const LITEROUTER_MODELS = [
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
];

function displayName(id: string) {
  let name = id.split("/").pop() || id;
  name = name.replace(/:free(?::full-context)?$/i, "");
  name = name.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  name = name.replace(/\bdeepseek\s+v4\s+flash\s+cheap\b/i, "DeepSeek V4 Flash");
  name = name.replace(/\bgemini\s+2\.5\s+flash\b/i, "Gemini 2.5 Flash");
  name = name.replace(/\bgpt\s+oss\s+20b\b/i, "GPT-OSS 20B");
  name = name.replace(/\bl3\s+8b\s+lunaris\b/i, "L3 8B Lunaris");
  name = name.replace(/\bllama\s+3\.3\s+70b\s+instruct\s+turbo\b/i, "Llama 3.3 70B");
  name = name.replace(/\bllama\s+3\.1\s+8b\s+instruct\b/i, "Llama 3.1 8B");
  name = name.replace(/\bllama\s+3\s+8b\s+instruct\b/i, "Llama 3 8B");
  name = name.replace(/\bministral\s+3b\s+2512\b/i, "Ministral 3B 2512");
  name = name.replace(/\bmistral\s+nemo\s+instruct\s+2407\b/i, "Mistral Nemo");
  name = name.replace(/\bmistral\s+small\s+24b\s+instruct\s+2501\b/i, "Mistral Small 24B");
  name = name.replace(/\bmythomax\s+l2\s+13b\b/i, "MythoMax L2 13B");
  name = name.replace(/\bnemotron\s+3\s+nano\b/i, "Nemotron 3 Nano");
  return name.replace(/\b(\d+)b\b/gi, "$1B");
}

async function getHorde() {
  const response = await fetch("https://aihorde.net/api/v2/status/models?type=text", { cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  const models = (await response.json()) as HordeModel[];
  const seen = new Set<string>();
  return models.filter((m) => m.name).map((m) => ({
    id: String(m.name),
    name: displayName(String(m.name)),
    source: "Horde",
    type: "text",
    status: `${m.count ?? 0} workers`,
  })).filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

async function getLiteRouter() {
  const key = process.env.LITEROUTER_API_KEY;
  if (!key) return [];
  const response = await fetch("https://api.literouter.com/v1/models", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return [];
  const data = await response.json() as { data?: Array<{ id?: string; name?: string }> };
  const allowed = new Set(LITEROUTER_MODELS);
  return (data.data || []).filter((m) => m.id && allowed.has(m.id)).map((m) => ({
    id: String(m.id),
    name: displayName(String(m.id)),
    source: "LiteRouter",
    type: "text",
    status: "Free",
  }));
}

export async function GET() {
  try {
    const [horde, literouter] = await Promise.all([
      getHorde().catch(() => []),
      getLiteRouter(),
    ]);
    const seen = new Set<string>();
    const models = [...literouter, ...horde].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [], error: "Unable to load models right now." }, { status: 502 });
  }
}
