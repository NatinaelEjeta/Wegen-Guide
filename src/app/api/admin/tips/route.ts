import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireOldTips } from "@/lib/tips-expiry";

export const dynamic = "force-dynamic";

/**
 * Admin endpoints for the moderation queue.
 * NOTE: no auth in this demo build — see README "Securing the admin API".
 */

/** GET /api/admin/tips?status=pending — list tips with stats */
export async function GET(req: NextRequest) {
  try {
    await expireOldTips();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const tips = await db.communityTip.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const [pending, published, rejected] = await Promise.all([
      db.communityTip.count({ where: { status: "pending" } }),
      db.communityTip.count({ where: { status: "published" } }),
      db.communityTip.count({ where: { status: "rejected" } }),
    ]);

    return NextResponse.json({
      tips,
      stats: { pending, published, rejected },
    });
  } catch (error) {
    console.error("GET /api/admin/tips failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

/** PATCH /api/admin/tips  { id, status: "published" | "rejected" | "expired" } */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = String(body?.id ?? "");
    const status = String(body?.status ?? "");
    if (!id || !["published", "rejected", "expired"].includes(status)) {
      return NextResponse.json({ error: "invalid id or status" }, { status: 400 });
    }

    const tip = await db.communityTip.update({
      where: { id },
      data: { status, moderatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, tip });
  } catch (error) {
    console.error("PATCH /api/admin/tips failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
