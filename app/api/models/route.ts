import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Model = { id: string; name?: string; source: string; type: string; status: string };
const LITEROUTER_MODELS = [
  "deepseek-v4-flash-cheap:free:full-context", "gemini-2.5-flash:free", "gpt-oss-20b:free", "l3-8b-lunaris:free",
  "llama-3-8b-instruct:free", "llama-3.1-8b-instruct:free", "llama-3.3-70b-instruct-turbo:free", "ministral-3b-2512:free",
  "mistral-nemo-instruct-2407:free", "mistral-small-24b-instruct-2501:free", "mythomax-l2-13b:free", "nemotron-3-nano:free",
];
const UNIPOOL_BASE_URL = "https://scriptzz.duckdns.org/v1";
function nice(id: string, name?: string) { return name || id.replace(/:free(?::full-context)?$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
async function horde(): Promise<Model[]> {
  try {
    const r = await fetch("https://aihorde.net/api/v2/status/models?type=text", { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json() as { name?: string; count?: number }[];
    return data.filter(m => m.name).map(m => ({ id: String(m.name), name: nice(String(m.name)), source: "Horde", type: "text", status: `${m.count ?? 0} workers` }));
  } catch { return []; }
}
async function literouter(): Promise<Model[]> {
  const key = process.env.LITEROUTER_API_KEY;
  if (!key) return LITEROUTER_MODELS.map(id => ({ id, name: nice(id), source: "LiteRouter", type: "text", status: "Free" }));
  try {
    const r = await fetch("https://api.literouter.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json() as { data?: { id?: string }[] };
    const allowed = new Set(LITEROUTER_MODELS);
    return (data.data ?? []).filter(m => m.id && allowed.has(m.id)).map(m => ({ id: m.id!, name: nice(m.id!), source: "LiteRouter", type: "text", status: "Free" }));
  } catch { return []; }
}
async function unipool(): Promise<Model[]> {
  const key = process.env.UNIPOOL_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch(`${UNIPOOL_BASE_URL}/models`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json() as { data?: { id?: string; name?: string }[] };
    return (data.data ?? []).filter(m => m.id).map(m => ({ id: m.id!, name: nice(m.id!, m.name), source: "UniPool", type: "text", status: "Available" }));
  } catch { return []; }
}
export async function GET() {
  try {
    const [uni, h, lite] = await Promise.all([unipool(), horde(), literouter()]);
    const seen = new Set<string>();
    const models = [...uni, ...lite, ...h].filter(m => !seen.has(m.id) && seen.add(m.id));
    return NextResponse.json({ models });
  } catch { return NextResponse.json({ models: [], error: "Unable to load models right now." }, { status: 502 }); }
}
