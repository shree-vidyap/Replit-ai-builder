import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/ai-agent";

// Simple in-memory rate limit (PDF: rate-limit AI requests). Use Redis + BullMQ in production.
const hits = new Map<string, number[]>();
function limited(key: string, max = 10, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });

  try {
    const { prompt, files, activeFile, errorLog } = await req.json();
    if (typeof prompt !== "string" || typeof files !== "object")
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    const result = await runAgent({ prompt, files, activeFile, errorLog });
    return NextResponse.json(result);
  } catch (e: any) {
    const bad = e?.message === "Bad AI output" || e?.message === "No JSON in AI response";
    return NextResponse.json({ error: bad ? "Bad AI output" : "AI request failed" }, { status: bad ? 422 : 500 });
  }
}
