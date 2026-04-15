import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, workSessionsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

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

router.get("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: "month must be YYYY-MM" });
      return;
    }
    const firstDay = `${month}-01`;
    const lastDay = `${month}-31`;

    let rows;
    if (req.userRole === "boss") {
      rows = await db
        .select()
        .from(workSessionsTable)
        .where(
          and(
            eq(workSessionsTable.companyId, req.companyId),
            gte(workSessionsTable.date, firstDay),
            lte(workSessionsTable.date, lastDay),
          )
        )
        .orderBy(workSessionsTable.date);
    } else {
      rows = await db
        .select()
        .from(workSessionsTable)
        .where(
          and(
            eq(workSessionsTable.clerkUserId, req.clerkUserId),
            eq(workSessionsTable.companyId, req.companyId),
            gte(workSessionsTable.date, firstDay),
            lte(workSessionsTable.date, lastDay),
          )
        )
        .orderBy(workSessionsTable.date);
    }

    const enriched = await Promise.all(
      rows.map(async (s) => {
        let username: string | null = null;
        try {
          const u = await clerkClient.users.getUser(s.clerkUserId);
          username =
            (u.unsafeMetadata?.displayName as string) ||
            u.username ||
            u.firstName ||
            u.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
            null;
        } catch {}
        return {
          id: s.id,
          clerkUserId: s.clerkUserId,
          username,
          date: s.date,
          clockedInAt: s.clockedInAt?.toISOString() ?? null,
          clockedOutAt: s.clockedOutAt?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list work sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

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

router.put("/date/:date", requireAuthAndCompany, async (req: any, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date must be YYYY-MM-DD" });
      return;
    }

    const { clockedInAt, clockedOutAt } = req.body as {
      clockedInAt?: string | null;
      clockedOutAt?: string | null;
    };

    const buildTimestamp = (timeStr: string | null | undefined, date: string): Date | null => {
      if (!timeStr) return null;
      const [h, m] = timeStr.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date(`${date}T00:00:00`);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const inTs = buildTimestamp(clockedInAt, date);
    const outTs = buildTimestamp(clockedOutAt, date);

    if (inTs && outTs && outTs <= inTs) {
      res.status(400).json({ error: "Clock-out must be after clock-in" });
      return;
    }

    if (!inTs && !outTs) {
      await db
        .delete(workSessionsTable)
        .where(
          and(
            eq(workSessionsTable.clerkUserId, req.clerkUserId),
            eq(workSessionsTable.companyId, req.companyId),
            eq(workSessionsTable.date, date),
          )
        );
      res.json(null);
      return;
    }

    const [existing] = await db
      .select()
      .from(workSessionsTable)
      .where(
        and(
          eq(workSessionsTable.clerkUserId, req.clerkUserId),
          eq(workSessionsTable.companyId, req.companyId),
          eq(workSessionsTable.date, date),
        )
      );

    let result;
    if (existing) {
      [result] = await db
        .update(workSessionsTable)
        .set({ clockedInAt: inTs, clockedOutAt: outTs })
        .where(eq(workSessionsTable.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(workSessionsTable)
        .values({
          clerkUserId: req.clerkUserId,
          companyId: req.companyId,
          date,
          clockedInAt: inTs,
          clockedOutAt: outTs,
        })
        .returning();
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to upsert work session");
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
