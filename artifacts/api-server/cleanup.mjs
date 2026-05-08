#!/usr/bin/env node
/**
 * CleanTrack photo cleanup
 * Deletes assignment_issue_photos and assignment_checkout_photos rows
 * (+ their GCS files) where expires_at <= NOW().
 * Also recounts issue_photo_count / checkout_photo_count on the affected assignments.
 */

import pg from "pg";

const { Pool } = pg;
const SIDECAR = "http://127.0.0.1:1106";
const PRIVATE_OBJECT_DIR = process.env.PRIVATE_OBJECT_DIR || "";

function parseObjectPathForDelete(objectPath) {
  const withoutPrefix = objectPath.replace(/^\/objects\//, "");
  let dir = PRIVATE_OBJECT_DIR;
  if (dir && !dir.endsWith("/")) dir += "/";
  const fullPath = dir + withoutPrefix;
  const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Cannot parse bucket from path: ${objectPath}`);
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

async function deleteFromGCS(objectPath) {
  let bucketName, objectName;
  try {
    ({ bucketName, objectName } = parseObjectPathForDelete(objectPath));
  } catch (e) {
    console.warn(`[cleanup] Could not parse object path "${objectPath}": ${e.message}`);
    return;
  }

  const sigRes = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "DELETE",
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!sigRes.ok) {
    console.warn(`[cleanup] Could not get signed DELETE URL for "${objectPath}": ${sigRes.status}`);
    return;
  }

  const { signed_url: signedUrl } = await sigRes.json();
  const delRes = await fetch(signedUrl, { method: "DELETE", signal: AbortSignal.timeout(15_000) });
  if (!delRes.ok && delRes.status !== 404) {
    console.warn(`[cleanup] GCS DELETE returned ${delRes.status} for "${objectPath}"`);
  }
}

async function cleanupTable(pool, { table, countColumn, label }) {
  const { rows: expired } = await pool.query(
    `SELECT id, assignment_id, object_path FROM ${table} WHERE expires_at <= NOW()`
  );

  if (expired.length === 0) {
    console.log(`[cleanup] No expired ${label} photos.`);
    return;
  }

  console.log(`[cleanup] Found ${expired.length} expired ${label} photo(s).`);

  const assignmentIds = new Set();
  for (const row of expired) {
    try {
      await deleteFromGCS(row.object_path);
      console.log(`[cleanup] Deleted GCS object for ${label} photo #${row.id}`);
    } catch (err) {
      console.warn(`[cleanup] GCS delete failed for ${label} photo #${row.id}: ${err.message}`);
    }

    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [row.id]);
    assignmentIds.add(row.assignment_id);
  }

  for (const aid of assignmentIds) {
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) AS count FROM ${table} WHERE assignment_id = $1`,
      [aid]
    );
    await pool.query(
      `UPDATE assignments SET ${countColumn} = $1 WHERE id = $2`,
      [parseInt(count, 10), aid]
    );
  }

  console.log(`[cleanup] Done with ${label} photos. Removed ${expired.length} photo(s) from ${assignmentIds.size} assignment(s).`);
}

export async function runCleanup() {
  if (!process.env.DATABASE_URL) {
    console.error("[cleanup] DATABASE_URL not set, skipping");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await cleanupTable(pool, {
      table: "assignment_issue_photos",
      countColumn: "issue_photo_count",
      label: "issue",
    });

    await cleanupTable(pool, {
      table: "assignment_checkout_photos",
      countColumn: "checkout_photo_count",
      label: "checkout",
    });
  } finally {
    await pool.end();
  }
}
