import { Router } from "express";
import { db, assignmentsTable, assignmentIssuePhotosTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuthAndCompany } from "../lib/auth";
import { parseObjectPath, objectStorageClient } from "../lib/objectStorage";

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
      .from(assignmentIssuePhotosTable)
      .where(eq(assignmentIssuePhotosTable.assignmentId, assignmentId))
      .orderBy(assignmentIssuePhotosTable.uploadedAt);

    res.json(
      photos.map((p) => ({
        id: p.id,
        assignmentId: p.assignmentId,
        companyId: p.companyId,
        objectPath: p.objectPath,
        description: p.description,
        uploadedByClerkId: p.uploadedByClerkId,
        uploadedAt: p.uploadedAt.toISOString(),
        expiresAt: p.expiresAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list issue photos");
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

    const { objectPath, description } = req.body as { objectPath?: string; description?: string };
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

    if (req.userRole !== "boss" && assignment.assignedToClerkId !== req.clerkUserId) {
      res.status(403).json({ error: "Only the assigned employee or boss can add photos" });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [photo] = await db
      .insert(assignmentIssuePhotosTable)
      .values({
        assignmentId,
        companyId: req.companyId,
        uploadedByClerkId: req.clerkUserId,
        objectPath,
        description: description?.trim() || null,
        uploadedAt: now,
        expiresAt,
      })
      .returning();

    await db
      .update(assignmentsTable)
      .set({ issuePhotoCount: sql`${assignmentsTable.issuePhotoCount} + 1` })
      .where(eq(assignmentsTable.id, assignmentId));

    res.status(201).json({
      id: photo.id,
      assignmentId: photo.assignmentId,
      companyId: photo.companyId,
      objectPath: photo.objectPath,
      description: photo.description,
      uploadedByClerkId: photo.uploadedByClerkId,
      uploadedAt: photo.uploadedAt.toISOString(),
      expiresAt: photo.expiresAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add issue photo");
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
      .from(assignmentIssuePhotosTable)
      .where(
        and(
          eq(assignmentIssuePhotosTable.id, photoId),
          eq(assignmentIssuePhotosTable.assignmentId, assignmentId),
          eq(assignmentIssuePhotosTable.companyId, req.companyId),
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
      req.log.warn({ err: storageErr }, "Failed to delete file from storage, removing DB record anyway");
    }

    await db
      .delete(assignmentIssuePhotosTable)
      .where(eq(assignmentIssuePhotosTable.id, photoId));

    await db
      .update(assignmentsTable)
      .set({ issuePhotoCount: sql`GREATEST(${assignmentsTable.issuePhotoCount} - 1, 0)` })
      .where(eq(assignmentsTable.id, assignmentId));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete issue photo");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
