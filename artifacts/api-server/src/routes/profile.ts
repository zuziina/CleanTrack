import { Router } from "express";
import { db, profileTable } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

async function ensureProfile() {
  const existing = await db.select().from(profileTable).limit(1);
  if (existing.length === 0) {
    await db.insert(profileTable).values({
      name: "Maria Garcia",
      email: "maria.garcia@cleantrack.com",
      phone: "(555) 234-5678",
      role: "Senior Cleaner",
      avatarUrl: null,
      companyName: "CleanTrack Co.",
      startDate: "2022-03-15",
    });
    const created = await db.select().from(profileTable).limit(1);
    return created[0];
  }
  return existing[0];
}

router.get("/", async (req, res) => {
  try {
    const profile = await ensureProfile();
    res.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      companyName: profile.companyName,
      startDate: profile.startDate,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const parsed = UpdateProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const profile = await ensureProfile();
    const updated = await db
      .update(profileTable)
      .set(parsed.data)
      .where(eq(profileTable.id, profile.id))
      .returning();
    const p = updated[0];
    res.json({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      role: p.role,
      avatarUrl: p.avatarUrl,
      companyName: p.companyName,
      startDate: p.startDate,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
