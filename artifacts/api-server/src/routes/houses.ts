import { Router } from "express";
import { db, housesTable, assignmentsTable } from "@workspace/db";
import {
  CreateHouseBody,
  UpdateHouseBody,
  GetHouseParams,
  UpdateHouseParams,
  DeleteHouseParams,
  UpdateHouseNotesParams,
  UpdateHouseNotesBody,
} from "@workspace/api-zod";
import { eq, count, and } from "drizzle-orm";
import { requireAuthAndCompany } from "../lib/auth";

const router = Router();

function formatHouse(h: typeof housesTable.$inferSelect) {
  return {
    id: h.id,
    name: h.name,
    mapLink: h.mapLink,
    ownerName: h.ownerName,
    ownerPhone: h.ownerPhone,
    ownerEmail: h.ownerEmail,
    notes: h.notes,
    singleBeds: h.singleBeds,
    doubleBeds: h.doubleBeds,
    babyBeds: h.babyBeds,
    bathrooms: h.bathrooms,
    jacuzzis: h.jacuzzis,
    saunas: h.saunas,
    entryCode: h.entryCode,
    status: h.status,
    createdAt: h.createdAt.toISOString(),
  };
}

router.get("/stats", requireAuthAndCompany, async (req: any, res) => {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const all = await db.select().from(housesTable).where(eq(housesTable.companyId, req.companyId));
    const active = all.filter((h) => h.status === "active").length;
    const inactive = all.filter((h) => h.status === "inactive").length;
    const todayAssignments = await db
      .select({ count: count() })
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.date, today), eq(assignmentsTable.companyId, req.companyId)));
    res.json({
      total: all.length,
      active,
      inactive,
      weekly: 0,
      biweekly: 0,
      monthly: 0,
      totalAssignmentsToday: todayAssignments[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get house stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    const houses = await db
      .select()
      .from(housesTable)
      .where(eq(housesTable.companyId, req.companyId))
      .orderBy(housesTable.name);
    res.json(houses.map(formatHouse));
  } catch (err) {
    req.log.error({ err }, "Failed to list houses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    const parsed = CreateHouseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [h] = await db.insert(housesTable).values({
      ...parsed.data,
      ownerName: parsed.data.ownerName ?? "",
      companyId: req.companyId,
    }).returning();
    res.status(201).json(formatHouse(h));
  } catch (err) {
    req.log.error({ err }, "Failed to create house");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/notes", requireAuthAndCompany, async (req: any, res) => {
  try {
    const paramsParsed = UpdateHouseNotesParams.safeParse({ id: Number(req.params.id) });
    if (!paramsParsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const bodyParsed = UpdateHouseNotesBody.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [h] = await db
      .update(housesTable)
      .set({ notes: bodyParsed.data.notes })
      .where(and(eq(housesTable.id, paramsParsed.data.id), eq(housesTable.companyId, req.companyId)))
      .returning();
    if (!h) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    res.json(formatHouse(h));
  } catch (err) {
    req.log.error({ err }, "Failed to update house notes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuthAndCompany, async (req: any, res) => {
  try {
    const parsed = GetHouseParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [h] = await db
      .select()
      .from(housesTable)
      .where(and(eq(housesTable.id, parsed.data.id), eq(housesTable.companyId, req.companyId)));
    if (!h) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    res.json(formatHouse(h));
  } catch (err) {
    req.log.error({ err }, "Failed to get house");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAuthAndCompany, async (req: any, res) => {
  try {
    const paramsParsed = UpdateHouseParams.safeParse({ id: Number(req.params.id) });
    if (!paramsParsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const bodyParsed = UpdateHouseBody.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [h] = await db
      .update(housesTable)
      .set(bodyParsed.data)
      .where(and(eq(housesTable.id, paramsParsed.data.id), eq(housesTable.companyId, req.companyId)))
      .returning();
    if (!h) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    res.json(formatHouse(h));
  } catch (err) {
    req.log.error({ err }, "Failed to update house");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuthAndCompany, async (req: any, res) => {
  try {
    const parsed = DeleteHouseParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db
      .delete(assignmentsTable)
      .where(and(eq(assignmentsTable.houseId, parsed.data.id), eq(assignmentsTable.companyId, req.companyId)));
    await db
      .delete(housesTable)
      .where(and(eq(housesTable.id, parsed.data.id), eq(housesTable.companyId, req.companyId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete house");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
