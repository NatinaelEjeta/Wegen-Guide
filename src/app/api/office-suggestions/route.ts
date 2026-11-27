import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function opt(value: unknown, max: number): string | undefined {
  const s = String(value ?? "").trim().slice(0, max);
  return s.length ? s : undefined;
}

/** POST /api/office-suggestions
 *  Creates an office suggestion held for moderation (status "pending"). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: "name must be 2-120 characters" }, { status: 400 });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 });
    }
    // rough bounding box of Ethiopia
    if (latitude < 3 || latitude > 15.5 || longitude < 32.5 || longitude > 48.5) {
      return NextResponse.json({ error: "location must be inside Ethiopia" }, { status: 400 });
    }

    const serviceIds = Array.isArray(body?.serviceIds)
      ? body.serviceIds.map((s: unknown) => String(s).trim()).filter(Boolean).join(",").slice(0, 500)
      : "";

    const suggestion = await db.officeSuggestion.create({
      data: {
        name,
        nameAm: opt(body?.nameAm, 120),
        nameOm: opt(body?.nameOm, 120),
        providerType: opt(body?.providerType, 40) ?? "other",
        serviceIds,
        latitude,
        longitude,
        address: opt(body?.address, 200),
        landmark: opt(body?.landmark, 200),
        phone: opt(body?.phone, 40),
        workingHours: opt(body?.workingHours, 120),
        note: opt(body?.note, 400),
        region: opt(body?.region, 80),
        zone: opt(body?.zone, 80),
        woreda: opt(body?.woreda, 80),
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, id: suggestion.id, status: "pending" }, { status: 201 });
  } catch (error) {
    console.error("POST /api/office-suggestions failed", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}