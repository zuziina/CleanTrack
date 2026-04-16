#!/usr/bin/env node
/**
 * CleanTrack daily database backup
 * Dumps the PostgreSQL database, compresses it, and uploads to Cloudflare R2.
 * Automatically removes backups older than 30 days.
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createGzip } from "zlib";
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import { Writable } from "stream";

const REQUIRED_VARS = [
  "DATABASE_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
];

function checkEnv() {
  const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[backup] Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayKey() {
  const d = new Date();
  return `backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.sql.gz`;
}

function dumpDatabase() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const gzip = createGzip();
    const collector = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });

    const pg = spawn("pg_dump", [process.env.DATABASE_URL, "--no-password"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    pg.stderr.on("data", (d) => {
      const msg = d.toString().trim();
      if (msg) console.warn(`[pg_dump] ${msg}`);
    });

    pipeline(pg.stdout, gzip, collector)
      .then(() => resolve(Buffer.concat(chunks)))
      .catch(reject);

    pg.on("error", reject);
    pg.on("close", (code) => {
      if (code !== 0) reject(new Error(`pg_dump exited with code ${code}`));
    });
  });
}

async function upload(client, key, data) {
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: data,
      ContentType: "application/gzip",
      ContentEncoding: "gzip",
    })
  );
  console.log(`[backup] Uploaded ${key} (${(data.length / 1024).toFixed(1)} KB)`);
}

async function pruneOldBackups(client) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const list = await client.send(
    new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME })
  );

  const toDelete = (list.Contents ?? []).filter((obj) => {
    return obj.Key?.startsWith("backup-") && new Date(obj.LastModified) < cutoff;
  });

  if (toDelete.length === 0) {
    console.log("[backup] No old backups to prune.");
    return;
  }

  await client.send(
    new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: { Objects: toDelete.map((o) => ({ Key: o.Key })) },
    })
  );

  console.log(`[backup] Pruned ${toDelete.length} old backup(s).`);
}

async function main() {
  checkEnv();

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const key = todayKey();
  console.log(`[backup] Starting backup → ${key}`);

  const data = await dumpDatabase();
  console.log(`[backup] Dump complete (${(data.length / 1024).toFixed(1)} KB compressed)`);

  await upload(client, key, data);
  await pruneOldBackups(client);

  console.log("[backup] Done.");
}

main().catch((err) => {
  console.error("[backup] Fatal error:", err.message);
  process.exit(1);
});
