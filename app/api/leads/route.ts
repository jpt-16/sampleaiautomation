import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/ai";
import { getStore } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await getStore();
    const leads = await store.list();
    return NextResponse.json({ leads, storage: store.kind, demoMode: !aiConfigured() });
  } catch (err) {
    console.error("[leads] list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load leads." }, { status: 500 });
  }
}
