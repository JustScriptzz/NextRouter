import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouterModel = {
  id?: string;
  name?: string;
  type?: string;
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

async function json(url: string, headers?: HeadersInit) {
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

export async function GET() {
  const output: RouterModel[] = [];

  try {
    const horde = await json("https://aihorde.net/api/v2/status/models?type=text");
    for (const model of Array.isArray(horde) ? horde : []) {
      output.push({
        id: String(model.name),
        name: String(model.name),
        source: "Horde",
        type: "text",
        status: `${model.count ?? 0} workers`,
      });
    }
  } catch {}

  const key = process.env.LITEROUTER_API_KEY;
  if (key) {
    try {
      const router = await json("https://api.literouter.com/v1/models", {
        Authorization: `Bearer ${key}`,
      });
      const models = Array.isArray(router?.data) ? router.data : [];
      for (const model of models) {
        if (!isFreeModel(model)) continue;
        output.push({
          id: String(model.id),
          name: String(model.name ?? model.id),
          source: "Router",
          type: String(model.type ?? "chat"),
          status: "free",
        });
      }
    } catch {}
  }

  const seen = new Set<string>();
  return NextResponse.json({
    models: output.filter((model) => {
      const key = `${model.source}:${model.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  });
}
