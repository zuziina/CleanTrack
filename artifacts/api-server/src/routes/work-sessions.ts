import { Router } from "express";
import { db, workSessionsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAuthAndCompany, batchUsernames } from "../lib/auth";

const router = Router();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function clientDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return todayStr();
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

    const clerkIds = rows.map((s) => s.clerkUserId).filter(Boolean);
    const usernameMap = await batchUsernames(clerkIds);

    const enriched = rows.map((s) => ({
      id: s.id,
      clerkUserId: s.clerkUserId,
      username: usernameMap[s.clerkUserId] ?? null,
      date: s.date,
      clockedInAt: s.clockedInAt?.toISOString() ?? null,
      clockedOutAt: s.clockedOutAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list work sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Who is clocked in right now (boss only) ──────────────────────────── */
router.get("/live", requireAuthAndCompany, async (req: any, res) => {
  try {
    if (req.userRole !== "boss") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const today = clientDate(req.query.date);
    const rows = await db
      .select()
      .from(workSessionsTable)
      .where(
        and(
          eq(workSessionsTable.companyId, req.companyId),
          eq(workSessionsTable.date, today),
        )
      );

    const clerkIds = rows.map((s) => s.clerkUserId).filter(Boolean);
    const usernameMap = await batchUsernames(clerkIds);

    const enriched = rows.map((s) => ({
      clerkUserId: s.clerkUserId,
      username: usernameMap[s.clerkUserId] ?? null,
      clockedInAt: s.clockedInAt?.toISOString() ?? null,
      clockedOutAt: s.clockedOutAt?.toISOString() ?? null,
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to get live attendance");
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
          eq(workSessionsTable.date, clientDate(req.query.date)),
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
    const today = clientDate(req.body?.date);
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
    const today = clientDate(req.body?.date);
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

    const parseTimestamp = (value: string | null | undefined): Date | null => {
      if (!value) return null;
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };

    const inTs = parseTimestamp(clockedInAt);
    const outTs = parseTimestamp(clockedOutAt);

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
          eq(workSessionsTable.date, clientDate(req.query.date)),
        )
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to reset work session");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
