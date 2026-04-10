import { Router } from "express";
import { db, housesTable, assignmentsTable } from "@workspace/db";
import { CreateHouseBody, UpdateHouseBody, GetHouseParams, UpdateHouseParams, DeleteHouseParams } from "@workspace/api-zod";
import { eq, count, and, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const all = await db.select().from(housesTable);
    const active = all.filter((h) => h.status === "active").length;
    const inactive = all.filter((h) => h.status === "inactive").length;
    const weekly = all.filter((h) => h.cleaningFrequency === "weekly").length;
    const biweekly = all.filter((h) => h.cleaningFrequency === "biweekly").length;
    const monthly = all.filter((h) => h.cleaningFrequency === "monthly").length;
    const todayAssignments = await db
      .select({ count: count() })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.date, today));
    res.json({
      total: all.length,
      active,
      inactive,
      weekly,
      biweekly,
      monthly,
      totalAssignmentsToday: todayAssignments[0]?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get house stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const houses = await db.select().from(housesTable).orderBy(housesTable.name);
    res.json(
      houses.map((h) => ({
        id: h.id,
        name: h.name,
        address: h.address,
        city: h.city,
        state: h.state,
        zipCode: h.zipCode,
        latitude: h.latitude,
        longitude: h.longitude,
        ownerName: h.ownerName,
        ownerPhone: h.ownerPhone,
        ownerEmail: h.ownerEmail,
        notes: h.notes,
        cleaningFrequency: h.cleaningFrequency,
        size: h.size,
        bedrooms: h.bedrooms,
        bathrooms: h.bathrooms,
        status: h.status,
        createdAt: h.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list houses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateHouseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }
    const [h] = await db.insert(housesTable).values(parsed.data).returning();
    res.status(201).json({
      id: h.id,
      name: h.name,
      address: h.address,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
      latitude: h.latitude,
      longitude: h.longitude,
      ownerName: h.ownerName,
      ownerPhone: h.ownerPhone,
      ownerEmail: h.ownerEmail,
      notes: h.notes,
      cleaningFrequency: h.cleaningFrequency,
      size: h.size,
      bedrooms: h.bedrooms,
      bathrooms: h.bathrooms,
      status: h.status,
      createdAt: h.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create house");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const parsed = GetHouseParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [h] = await db.select().from(housesTable).where(eq(housesTable.id, parsed.data.id));
    if (!h) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    res.json({
      id: h.id,
      name: h.name,
      address: h.address,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
      latitude: h.latitude,
      longitude: h.longitude,
      ownerName: h.ownerName,
      ownerPhone: h.ownerPhone,
      ownerEmail: h.ownerEmail,
      notes: h.notes,
      cleaningFrequency: h.cleaningFrequency,
      size: h.size,
      bedrooms: h.bedrooms,
      bathrooms: h.bathrooms,
      status: h.status,
      createdAt: h.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get house");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
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
      .where(eq(housesTable.id, paramsParsed.data.id))
      .returning();
    if (!h) {
      res.status(404).json({ error: "House not found" });
      return;
    }
    res.json({
      id: h.id,
      name: h.name,
      address: h.address,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
      latitude: h.latitude,
      longitude: h.longitude,
      ownerName: h.ownerName,
      ownerPhone: h.ownerPhone,
      ownerEmail: h.ownerEmail,
      notes: h.notes,
      cleaningFrequency: h.cleaningFrequency,
      size: h.size,
      bedrooms: h.bedrooms,
      bathrooms: h.bathrooms,
      status: h.status,
      createdAt: h.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update house");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const parsed = DeleteHouseParams.safeParse({ id: Number(req.params.id) });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(housesTable).where(eq(housesTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete house");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
