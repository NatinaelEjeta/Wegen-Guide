import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Admin endpoints for office suggestions.
 * NOTE: no auth in this demo build, same as /api/admin/tips.
 */

/** GET /api/admin/office-suggestions?status=pending */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const suggestions = await db.officeSuggestion.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const [pending, approved, rejected] = await Promise.all([
      db.officeSuggestion.count({ where: { status: "pending" } }),
      db.officeSuggestion.count({ where: { status: "approved" } }),
      db.officeSuggestion.count({ where: { status: "rejected" } }),
    ]);

    return NextResponse.json({ suggestions, stats: { pending, approved, rejected } });
  } catch (error) {
    console.error("GET /api/admin/office-suggestions failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/** PATCH /api/admin/office-suggestions  { id, status: "approved" | "rejected" | "pending" } */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body?.id ?? "");
    const status = String(body?.status ?? "");
    if (!id || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "invalid id or status" }, { status: 400 });
    }

    const suggestion = await db.officeSuggestion.update({
      where: { id },
      data: { status, moderatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, suggestion });
  } catch (error) {
    console.error("PATCH /api/admin/office-suggestions failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}