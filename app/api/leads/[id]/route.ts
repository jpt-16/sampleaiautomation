import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { statusUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = statusUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  try {
    const store = await getStore();
    const lead = await store.setStatus(id, parsed.data.status);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("[leads] update failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't update lead." }, { status: 500 });
  }
}
