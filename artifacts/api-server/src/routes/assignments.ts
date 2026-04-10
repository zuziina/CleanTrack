import { Router } from "express";
import { db, assignmentsTable, housesTable } from "@workspace/db";
import {
  CreateAssignmentBody,
  UpdateAssignmentBody,
  GetAssignmentParams,
  UpdateAssignmentParams,
  DeleteAssignmentParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

async function formatAssignment(a: typeof assignmentsTable.$inferSelect, house: typeof housesTable.$inferSelect) {
  return {
    id: a.id,
    houseId: a.houseId,
    houseName: house.name,
    houseAddress: `${house.address}, ${house.city}, ${house.state}`,
    date: a.date,
    timeSlot: a.timeSlot,
    notes: a.notes,
    status: a.status,
    priority: a.priority,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const rows = await db
      .select()
      .from(assignmentsTable)
      .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
      .where(eq(assignmentsTable.date, today))
      .orderBy(assignmentsTable.timeSlot);
    res.json(rows.map((r) => ({
      id: r.assignments.id,
      houseId: r.assignments.houseId,
      houseName: r.houses.name,
      houseAddress: `${r.houses.address}, ${r.houses.city}, ${r.houses.state}`,
      date: r.assignments.date,
      timeSlot: r.assignments.timeSlot,
      notes: r.assignments.notes,
      status: r.assignments.status,
      priority: r.assignments.priority,
      createdAt: r.assignments.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get today's assignments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(assignmentsTable)
      .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
      .orderBy(assignmentsTable.date, assignmentsTable.timeSlot);
    res.json(rows.map((r) => ({
      id: r.assignments.id,
      houseId: r.assignments.houseId,
      houseName: r.houses.name,
      houseAddress: `${r.houses.address}, ${r.houses.city}, ${r.houses.state}`,
      date: r.assignments.date,
      timeSlot: r.assignments.timeSlot,
      notes: r.assignments.notes,
      status: r.assignments.status,
      priority: r.assignments.priority,
      createdAt: r.assignments.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list assignments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateAssignmentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [a] = await db.insert(assignmentsTable).values(parsed.data).returning();
    const [house] = await db.select().from(housesTable).where(eq(housesTable.id, a.houseId));
    if (!house) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    res.status(201).json(await formatAssignment(a, house));
  } catch (err) {
    req.log.error({ err }, "Failed to create assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
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
      .where(eq(assignmentsTable.id, parsed.data.id));
    if (!rows[0]) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }
    const r = rows[0];
    res.json({
      id: r.assignments.id,
      houseId: r.assignments.houseId,
      houseName: r.houses.name,
      houseAddress: `${r.houses.address}, ${r.houses.city}, ${r.houses.state}`,
      date: r.assignments.date,
      timeSlot: r.assignments.timeSlot,
      notes: r.assignments.notes,
      status: r.assignments.status,
      priority: r.assignments.priority,
      createdAt: r.assignments.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
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
      .set(bodyParsed.data)
      .where(eq(assignmentsTable.id, paramsParsed.data.id))
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
    res.json(await formatAssignment(a, house));
  } catch (err) {
    req.log.error({ err }, "Failed to update assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const parsed = DeleteAssignmentParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(assignmentsTable).where(eq(assignmentsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
