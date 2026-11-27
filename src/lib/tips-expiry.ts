import { db } from "@/lib/db";

/** Published tips older than this many days are marked "expired". */
export const TIP_TTL_DAYS = Number(process.env.TIP_TTL_DAYS ?? 90) || 90;

/** Marks published tips past their lifetime as "expired". Never throws. */
export async function expireOldTips(): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - TIP_TTL_DAYS * 24 * 60 * 60 * 1000);
    const res = await db.communityTip.updateMany({
      where: {
        status: "published",
        OR: [
          { moderatedAt: { lt: cutoff } },
          { moderatedAt: null, createdAt: { lt: cutoff } },
        ],
      },
      data: { status: "expired" },
    });
    return res.count;
  } catch (error) {
    console.error("expireOldTips failed", error);
    return 0;
  }
}