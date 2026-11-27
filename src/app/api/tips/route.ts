import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireOldTips } from "@/lib/tips-expiry";

export const dynamic = "force-dynamic";

/** GET /api/tips?targetType=service&targetId=fayda-national-id
 *  Returns published tips (most recent first). */
export async function GET(req: NextRequest) {
  try {
    await expireOldTips();
    const { searchParams } = new URL(req.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");

    const tips = await db.communityTip.findMany({
      where: {
        status: "published",
        ...(targetType ? { targetType } : {}),
        ...(targetId ? { targetId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ tips });
  } catch (error) {
    console.error("GET /api/tips failed", error);
    return NextResponse.json({ tips: [] }, { status: 200 });
  }
}

/** POST /api/tips  { targetType, targetId, text, language }
 *  Creates an anonymous tip held for moderation. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetType = String(body?.targetType ?? "service");
    const targetId = String(body?.targetId ?? "").trim();
    const text = String(body?.text ?? "").trim();
    const language = String(body?.language ?? "am");

    if (!["service", "provider"].includes(targetType)) {
      return NextResponse.json({ error: "invalid targetType" }, { status: 400 });
    }
    if (!targetId || text.length < 5 || text.length > 400) {
      return NextResponse.json(
        { error: "text must be 5–400 characters and targetId required" },
        { status: 400 }
      );
    }
    if (!["am", "om", "en"].includes(language)) {
      return NextResponse.json({ error: "invalid language" }, { status: 400 });
    }

    const tip = await db.communityTip.create({
      data: { targetType, targetId, text, language, status: "pending" },
    });

    return NextResponse.json({ ok: true, id: tip.id, status: "pending" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tips failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
