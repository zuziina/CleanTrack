import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, assignmentsTable, housesTable } from "@workspace/db";
import {
  CreateAssignmentBody,
  UpdateAssignmentBody,
  GetAssignmentParams,
  UpdateAssignmentParams,
  DeleteAssignmentParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = auth.userId;
  next();
}

async function getUserRole(clerkUserId: string): Promise<string> {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    return (user.publicMetadata?.role as string) || "employee";
  } catch {
    return "employee";
  }
}

async function getUsernameById(clerkId: string): Promise<string | null> {
  try {
    const user = await clerkClient.users.getUser(clerkId);
    const email = user.emailAddresses?.[0]?.emailAddress || "";
    return user.username || user.firstName || email.split("@")[0] || null;
  } catch {
    return null;
  }
}

async function formatRow(r: { assignments: typeof assignmentsTable.$inferSelect; houses: typeof housesTable.$inferSelect }) {
  let assignedToUsername: string | null = null;
  if (r.assignments.assignedToClerkId) {
    assignedToUsername = await getUsernameById(r.assignments.assignedToClerkId);
  }
  return {
    id: r.assignments.id,
    houseId: r.assignments.houseId,
    houseName: r.houses.name,
    houseAddress: `${r.houses.address}, ${r.houses.city}, ${r.houses.state}`,
    assignedToClerkId: r.assignments.assignedToClerkId,
    assignedToUsername,
    date: r.assignments.date,
    timeSlot: r.assignments.timeSlot,
    notes: r.assignments.notes,
    guestCount: r.assignments.guestCount,
    status: r.assignments.status,
    priority: r.assignments.priority,
    createdAt: r.assignments.createdAt.toISOString(),
  };
}

router.get("/today", requireAuth, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const role = await getUserRole(req.clerkUserId);
    let rows;
    if (role === "boss") {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(eq(assignmentsTable.date, today))
        .orderBy(assignmentsTable.timeSlot);
    } else {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(and(eq(assignmentsTable.date, today), eq(assignmentsTable.assignedToClerkId, req.clerkUserId)))
        .orderBy(assignmentsTable.timeSlot);
    }
    res.json(await Promise.all(rows.map(formatRow)));
  } catch (err) {
    req.log.error({ err }, "Failed to get today's assignments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const role = await getUserRole(req.clerkUserId);
    let rows;
    if (role === "boss") {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .orderBy(assignmentsTable.date, assignmentsTable.timeSlot);
    } else {
      rows = await db
        .select()
        .from(assignmentsTable)
        .innerJoin(housesTable, eq(assignmentsTable.houseId, housesTable.id))
        .where(eq(assignmentsTable.assignedToClerkId, req.clerkUserId))
        .orderBy(assignmentsTable.date, assignmentsTable.timeSlot);
    }
    res.json(await Promise.all(rows.map(formatRow)));
  } catch (err) {
    req.log.error({ err }, "Failed to list assignments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req: any, res) => {
  try {
    const role = await getUserRole(req.clerkUserId);
    if (role !== "boss") {
      res.status(403).json({ error: "Only bosses can create assignments" });
      return;
    }
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
    res.status(201).json(await formatRow({ assignments: a, houses: house }));
  } catch (err) {
    req.log.error({ err }, "Failed to create assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireAuth, async (req: any, res) => {
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
    res.json(await formatRow(rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to get assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireAuth, async (req: any, res) => {
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
    res.json(await formatRow({ assignments: a, houses: house }));
  } catch (err) {
    req.log.error({ err }, "Failed to update assignment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const role = await getUserRole(req.clerkUserId);
    if (role !== "boss") {
      res.status(403).json({ error: "Only bosses can delete assignments" });
      return;
    }
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
