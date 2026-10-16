import { NextResponse } from "next/server";
import { aiConfigured, generateResponse } from "@/lib/ai";
import { getStore } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { fieldErrorsFrom, inquirySchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) },
      { status: 400 },
    );
  }
  const inquiry = parsed.data;

  // 1) AI response (never throws; returns mode "failed" if the model is unreachable)
  const ai = await generateResponse(inquiry);

  // 2) Persist the lead no matter what happened with the AI step
  try {
    const store = await getStore();
    const lead = await store.insert({
      ...inquiry,
      ai_response: ai.text,
      ai_mode: ai.mode,
      status: ai.text ? "Responded" : "New",
    });
    return NextResponse.json({ lead, demoMode: !aiConfigured(), aiFailed: ai.mode === "failed" }, { status: 201 });
  } catch (err) {
    console.error("[inquiries] save failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "We couldn't save your request just now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
