import { NextResponse } from "next/server";
import { POST as chatPOST } from "../route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const response = await chatPOST(req);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  return NextResponse.json({
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: data.model ?? "unknown",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: data.content ?? "",
        },
        finish_reason: "stop",
      },
    ],
    usage: data.usage ?? null,
  });
}

export async function GET() {
  return NextResponse.json({
    object: "endpoint",
    endpoint: "/api/chat/completions",
    methods: ["POST"],
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "GET, POST, OPTIONS" },
  });
}
