import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Model = { id: string; name?: string; source: string; type: string; status: string };
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
    const [uni, h] = await Promise.all([unipool(), horde()]);
    const seen = new Set<string>();
    const models = [...uni, ...h].filter(m => !seen.has(m.id) && seen.add(m.id));
    return NextResponse.json({ models });
  } catch { return NextResponse.json({ models: [], error: "Unable to load models right now." }, { status: 502 }); }
}
