import { Router } from "express";
import { db, assignmentsTable, housesTable } from "@workspace/db";
import {
  CreateAssignmentBody,
  UpdateAssignmentBody,
  GetAssignmentParams,
  UpdateAssignmentParams,
  DeleteAssignmentParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { requireAuthAndCompany, batchUsernames } from "../lib/auth";

const router = Router();

type AssignmentRow = {
  assignments: typeof assignmentsTable.$inferSelect;
  houses: typeof housesTable.$inferSelect;
};

function formatRow(
  r: AssignmentRow,
  usernameMap: Record<string, string | null>
) {
  return {
    id: r.assignments.id,
    houseId: r.assignments.houseId,
    houseName: r.houses.name,
    houseAddress: r.houses.mapLink || "",
    assignedToClerkId: r.assignments.assignedToClerkId,
    assignedToUsername: r.assignments.assignedToClerkId
      ? (usernameMap[r.assignments.assignedToClerkId] ?? null)
      : null,
    date: r.assignments.date,
    timeSlot: r.assignments.timeSlot,
    notes: r.assignments.notes,
    guestCount: r.assignments.guestCount,
    status: r.assignments.status,
    priority: r.assignments.priority,
    startedAt: r.assignments.startedAt?.toISOString() ?? null,
    finishedAt: r.assignments.finishedAt?.toISOString() ?? null,
    completionNotes: r.assignments.completionNotes ?? null,
    createdAt: r.assignments.createdAt.toISOString(),
  };
}

router.get("/today", requireAuthAndCompany, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    let rows: AssignmentRow[];
    if (req.userRole === "boss") {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(and(eq(assignmentsTable.date, today), eq(assignmentsTable.companyId, req.companyId)))
        .orderBy(assignmentsTable.timeSlot);
    } else {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(and(
          eq(assignmentsTable.date, today),
          eq(assignmentsTable.assignedToClerkId, req.clerkUserId),
          eq(assignmentsTable.companyId, req.companyId),
        ))
        .orderBy(assignmentsTable.timeSlot);
    }
    const clerkIds = rows
      .map((r) => r.assignments.assignedToClerkId)
      .filter((id): id is string => !!id);
    const usernameMap = await batchUsernames(clerkIds);
    res.json(rows.map((r) => formatRow(r, usernameMap)));
  } catch (err) {
    req.log.error({ err }, "Failed to get today's assignments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    let rows: AssignmentRow[];
    if (req.userRole === "boss") {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(eq(assignmentsTable.companyId, req.companyId))
        .orderBy(assignmentsTable.date, assignmentsTable.timeSlot);
    } else {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(and(
          eq(assignmentsTable.assignedToClerkId, req.clerkUserId),
          eq(assignmentsTable.companyId, req.companyId),
        ))
        .orderBy(assignmentsTable.date, assignmentsTable.timeSlot);
    }
    const clerkIds = rows
      .map((r) => r.assignments.assignedToClerkId)
      .filter((id): id is string => !!id);
    const usernameMap = await batchUsernames(clerkIds);
    res.json(rows.map((r) => formatRow(r, usernameMap)));
  } catch (err) {
    req.log.error({ err }, "Failed to list assignments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    if (req.userRole !== "boss") {
      res.status(403).json({ error: "Only bosses can create assignments" });
      return;
    }
    const parsed = CreateAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const values = {
      ...parsed.data,
      date: parsed.data.date ?? today,
      timeSlot: parsed.data.timeSlot ?? "",
      companyId: req.companyId,
    };
    const [a] = await db.insert(assignmentsTable).values(values).returning();
    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, a.houseId));
    if (!house) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    const clerkIds = a.assignedToClerkId ? [a.assignedToClerkId] : [];
    const usernameMap = await batchUsernames(clerkIds);
    res.status(201).json(formatRow({ assignments: a, houses: house }, usernameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to create assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuthAndCompany, async (req: any, res) => {
  try {
    const parsed = GetAssignmentParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const rows = await db
      .select()
      .from(assignmentsTable)
      .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
      .where(and(eq(assignmentsTable.id, parsed.data.id), eq(assignmentsTable.companyId, req.companyId)));
    if (!rows[0]) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const clerkIds = rows[0].assignments.assignedToClerkId
      ? [rows[0].assignments.assignedToClerkId]
      : [];
    const usernameMap = await batchUsernames(clerkIds);
    res.json(formatRow(rows[0], usernameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to get assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAuthAndCompany, async (req: any, res) => {
  try {
    const paramsParsed = UpdateAssignmentParams.safeParse({ id: Number(req.params.id) });
    if (!paramsParsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const bodyParsed = UpdateAssignmentBody.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [a] = await db
      .update(assignmentsTable)
      .set(bodyParsed.data as any)
      .where(and(eq(assignmentsTable.id, paramsParsed.data.id), eq(assignmentsTable.companyId, req.companyId)))
      .returning();
    if (!a) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, a.houseId));
    if (!house) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    const clerkIds = a.assignedToClerkId ? [a.assignedToClerkId] : [];
    const usernameMap = await batchUsernames(clerkIds);
    res.json(formatRow({ assignments: a, houses: house }, usernameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to update assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/timing", requireAuthAndCompany, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { startedAt, finishedAt } = req.body as { startedAt?: string | null; finishedAt?: string | null };
    const updates: Record<string, any> = {};
    if ("startedAt" in req.body) {
      updates.startedAt = startedAt ? new Date(startedAt) : null;
    }
    if ("finishedAt" in req.body) {
      updates.finishedAt = finishedAt ? new Date(finishedAt) : null;
    }
    const [current] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, id), eq(assignmentsTable.companyId, req.companyId)));
    if (!current) { res.status(404).json({ error: "Assignment not found" }); return; }
    const effectiveStartedAt = "startedAt" in updates ? updates.startedAt : current.startedAt;
    const effectiveFinishedAt = "finishedAt" in updates ? updates.finishedAt : current.finishedAt;
    const derivedStatus = !effectiveStartedAt ? "pending" : effectiveFinishedAt ? "completed" : "in_progress";
    updates.status = derivedStatus;
    const [a] = await db.update(assignmentsTable).set(updates).where(eq(assignmentsTable.id, id)).returning();
    if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, a.houseId));
    if (!house) { res.status(404).json({ error: "House not found" }); return; }
    const clerkIds = a.assignedToClerkId ? [a.assignedToClerkId] : [];
    const usernameMap = await batchUsernames(clerkIds);
    res.json(formatRow({ assignments: a, houses: house }, usernameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to patch timing");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/start", requireAuthAndCompany, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [a] = await db
      .update(assignmentsTable)
      .set({ startedAt: new Date(), status: "in_progress" })
      .where(and(eq(assignmentsTable.id, id), eq(assignmentsTable.companyId, req.companyId)))
      .returning();
    if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, a.houseId));
    if (!house) { res.status(404).json({ error: "House not found" }); return; }
    const clerkIds = a.assignedToClerkId ? [a.assignedToClerkId] : [];
    const usernameMap = await batchUsernames(clerkIds);
    res.json(formatRow({ assignments: a, houses: house }, usernameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to start cleaning");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/finish", requireAuthAndCompany, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const completionNotes = typeof req.body?.completionNotes === "string"
      ? req.body.completionNotes.trim() || null
      : null;
    const [a] = await db
      .update(assignmentsTable)
      .set({ finishedAt: new Date(), status: "completed", completionNotes })
      .where(and(eq(assignmentsTable.id, id), eq(assignmentsTable.companyId, req.companyId)))
      .returning();
    if (!a) { res.status(404).json({ error: "Assignment not found" }); return; }
    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, a.houseId));
    if (!house) { res.status(404).json({ error: "House not found" }); return; }
    const clerkIds = a.assignedToClerkId ? [a.assignedToClerkId] : [];
    const usernameMap = await batchUsernames(clerkIds);
    res.json(formatRow({ assignments: a, houses: house }, usernameMap));
  } catch (err) {
    req.log.error({ err }, "Failed to finish cleaning");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuthAndCompany, async (req: any, res) => {
  try {
    if (req.userRole !== "boss") {
      res.status(403).json({ error: "Only bosses can delete assignments" });
      return;
    }
    const parsed = DeleteAssignmentParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(assignmentsTable)
      .where(and(eq(assignmentsTable.id, parsed.data.id), eq(assignmentsTable.companyId, req.companyId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
