import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, workSessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

async function requireAuthAndCompany(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const companyId = user.publicMetadata?.companyId as number | undefined;
    if (!companyId) {
      res.status(403).json({ error: "No company setup." });
      return;
    }
    req.companyId = companyId;
    next();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

router.get("/today", requireAuthAndCompany, async (req: any, res) => {
  try {
    const [session] = await db
      .select()
      .from(workSessionsTable)
      .where(
        and(
          eq(workSessionsTable.clerkUserId, req.clerkUserId),
          eq(workSessionsTable.companyId, req.companyId),
          eq(workSessionsTable.date, todayStr()),
        )
      );
    res.json(session ?? null);
  } catch (err) {
    req.log.error({ err }, "Failed to get today's work session");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clock-in", requireAuthAndCompany, async (req: any, res) => {
  try {
    const today = todayStr();
    const [existing] = await db
      .select()
      .from(workSessionsTable)
      .where(
        and(
          eq(workSessionsTable.clerkUserId, req.clerkUserId),
          eq(workSessionsTable.companyId, req.companyId),
          eq(workSessionsTable.date, today),
        )
      );
    if (existing?.clockedInAt) {
      res.status(409).json({ error: "Already clocked in today" });
      return;
    }
    if (existing) {
      const [updated] = await db
        .update(workSessionsTable)
        .set({ clockedInAt: new Date(), clockedOutAt: null })
        .where(eq(workSessionsTable.id, existing.id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(workSessionsTable)
        .values({
          clerkUserId: req.clerkUserId,
          companyId: req.companyId,
          date: today,
          clockedInAt: new Date(),
        })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    req.log.error({ err }, "Failed to clock in");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clock-out", requireAuthAndCompany, async (req: any, res) => {
  try {
    const today = todayStr();
    const [existing] = await db
      .select()
      .from(workSessionsTable)
      .where(
        and(
          eq(workSessionsTable.clerkUserId, req.clerkUserId),
          eq(workSessionsTable.companyId, req.companyId),
          eq(workSessionsTable.date, today),
        )
      );
    if (!existing?.clockedInAt) {
      res.status(409).json({ error: "Not clocked in today" });
      return;
    }
    if (existing.clockedOutAt) {
      res.status(409).json({ error: "Already clocked out today" });
      return;
    }
    const [updated] = await db
      .update(workSessionsTable)
      .set({ clockedOutAt: new Date() })
      .where(eq(workSessionsTable.id, existing.id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to clock out");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/today", requireAuthAndCompany, async (req: any, res) => {
  try {
    await db
      .delete(workSessionsTable)
      .where(
        and(
          eq(workSessionsTable.clerkUserId, req.clerkUserId),
          eq(workSessionsTable.companyId, req.companyId),
          eq(workSessionsTable.date, todayStr()),
        )
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to reset work session");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
