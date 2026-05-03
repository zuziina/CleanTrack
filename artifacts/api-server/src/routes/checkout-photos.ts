import { Router } from "express";
import { db, assignmentsTable, assignmentCheckoutPhotosTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuthAndCompany } from "../lib/auth";
import { parseObjectPath, objectStorageClient } from "../lib/objectStorage";

const CHECKOUT_COMPLETE_THRESHOLD = 3;

const router = Router({ mergeParams: true });

function objectPathToGCS(objectPath: string) {
  const entityId = objectPath.replace(/^\/objects\//, "");
  let dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir.endsWith("/")) dir += "/";
  const fullPath = `${dir}${entityId}`;
  return parseObjectPath(fullPath);
}

router.get("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment id" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.companyId, req.companyId)));

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    if (req.userRole !== "boss" && assignment.assignedToClerkId !== req.clerkUserId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const photos = await db
      .select()
      .from(assignmentCheckoutPhotosTable)
      .where(eq(assignmentCheckoutPhotosTable.assignmentId, assignmentId))
      .orderBy(assignmentCheckoutPhotosTable.uploadedAt);

    res.json(
      photos.map((p) => ({
        id: p.id,
        assignmentId: p.assignmentId,
        companyId: p.companyId,
        objectPath: p.objectPath,
        uploadedByClerkId: p.uploadedByClerkId,
        uploadedAt: p.uploadedAt.toISOString(),
        expiresAt: p.expiresAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list checkout photos");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auto-close", requireAuthAndCompany, async (req: any, res) => {
  try {
    if (req.userRole !== "boss") {
      res.status(403).json({ error: "Only bosses can trigger auto-close" });
      return;
    }

    const assignmentId = Number(req.params.id);
    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment id" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.companyId, req.companyId)));

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    if (assignment.checkoutStatus !== "pending_checkout") {
      res.status(409).json({ error: "Assignment is not in pending_checkout state" });
      return;
    }

    const [updated] = await db
      .update(assignmentsTable)
      .set({ checkoutStatus: "auto_closed" })
      .where(eq(assignmentsTable.id, assignmentId))
      .returning();

    res.json({ checkoutStatus: updated.checkoutStatus });
  } catch (err) {
    req.log.error({ err }, "Failed to auto-close checkout");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireAuthAndCompany, async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (isNaN(assignmentId)) {
      res.status(400).json({ error: "Invalid assignment id" });
      return;
    }

    const { objectPath } = req.body as { objectPath?: string };
    if (!objectPath || typeof objectPath !== "string") {
      res.status(400).json({ error: "objectPath is required" });
      return;
    }

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.companyId, req.companyId)));

    if (!assignment) {
      res.status(404).json({ error: "Assignment not found" });
      return;
    }

    if (assignment.assignedToClerkId !== req.clerkUserId) {
      res.status(403).json({ error: "Only the assigned employee can upload checkout photos" });
      return;
    }

    if (
      assignment.checkoutStatus !== "pending_checkout" &&
      assignment.checkoutStatus !== "checkout_complete"
    ) {
      res.status(409).json({ error: "Checkout photos can only be added after the cleaning session is finished" });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [photo] = await db
      .insert(assignmentCheckoutPhotosTable)
      .values({
        assignmentId,
        companyId: req.companyId,
        uploadedByClerkId: req.clerkUserId,
        objectPath,
        uploadedAt: now,
        expiresAt,
      })
      .returning();

    const [updated] = await db
      .update(assignmentsTable)
      .set({ checkoutPhotoCount: sql`${assignmentsTable.checkoutPhotoCount} + 1` })
      .where(eq(assignmentsTable.id, assignmentId))
      .returning();

    if ((updated.checkoutPhotoCount ?? 0) >= CHECKOUT_COMPLETE_THRESHOLD) {
      await db
        .update(assignmentsTable)
        .set({ checkoutStatus: "checkout_complete" })
        .where(eq(assignmentsTable.id, assignmentId));
    }

    res.status(201).json({
      id: photo.id,
      assignmentId: photo.assignmentId,
      companyId: photo.companyId,
      objectPath: photo.objectPath,
      uploadedByClerkId: photo.uploadedByClerkId,
      uploadedAt: photo.uploadedAt.toISOString(),
      expiresAt: photo.expiresAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add checkout photo");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:photoId", requireAuthAndCompany, async (req: any, res) => {
  try {
    const assignmentId = Number(req.params.id);
    const photoId = Number(req.params.photoId);
    if (isNaN(assignmentId) || isNaN(photoId)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [photo] = await db
      .select()
      .from(assignmentCheckoutPhotosTable)
      .where(
        and(
          eq(assignmentCheckoutPhotosTable.id, photoId),
          eq(assignmentCheckoutPhotosTable.assignmentId, assignmentId),
          eq(assignmentCheckoutPhotosTable.companyId, req.companyId),
        )
      );

    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    if (req.userRole !== "boss" && photo.uploadedByClerkId !== req.clerkUserId) {
      res.status(403).json({ error: "You can only delete your own photos" });
      return;
    }

    try {
      const { bucketName, objectName } = objectPathToGCS(photo.objectPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
      }
    } catch (storageErr) {
      req.log.warn({ err: storageErr }, "Failed to delete checkout photo from storage, removing DB record anyway");
    }

    await db
      .delete(assignmentCheckoutPhotosTable)
      .where(eq(assignmentCheckoutPhotosTable.id, photoId));

    const [updated] = await db
      .update(assignmentsTable)
      .set({ checkoutPhotoCount: sql`GREATEST(${assignmentsTable.checkoutPhotoCount} - 1, 0)` })
      .where(eq(assignmentsTable.id, assignmentId))
      .returning();

    if (
      updated.checkoutStatus === "checkout_complete" &&
      (updated.checkoutPhotoCount ?? 0) < CHECKOUT_COMPLETE_THRESHOLD
    ) {
      await db
        .update(assignmentsTable)
        .set({ checkoutStatus: "pending_checkout" })
        .where(eq(assignmentsTable.id, assignmentId));
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete checkout photo");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
