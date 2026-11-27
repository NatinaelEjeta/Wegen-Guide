import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const db = new PrismaClient();
const r = await db.officeSuggestion.deleteMany({
  where: { status: "pending", note: { startsWith: "Source: OpenStreetMap" } },
});
console.log("Deleted pending OSM rows:", r.count);
await db.$disconnect();