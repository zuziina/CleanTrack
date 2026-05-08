#!/usr/bin/env node
/**
 * CleanTrack backup daemon
 * Runs the backup immediately on start, then every 24 hours.
 * Also runs the issue-photo cleanup after each backup.
 */

import { execFile } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { runCleanup } from "./cleanup.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_SCRIPT = path.join(__dirname, "backup.mjs");
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function runBackup() {
  return new Promise((resolve) => {
    const now = new Date().toISOString();
    console.log(`[backup-daemon] Running backup at ${now}`);
    execFile("node", [BACKUP_SCRIPT], (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err) {
        console.error(`[backup-daemon] Backup failed: ${err.message}`);
      } else {
        console.log("[backup-daemon] Backup completed successfully.");
      }
      resolve(undefined);
    });
  });
}

async function runAll() {
  await runBackup();

  console.log("[backup-daemon] Running photo cleanup...");
  try {
    await runCleanup();
  } catch (err) {
    console.error(`[backup-daemon] Cleanup failed: ${err.message}`);
  }

  const next = new Date(Date.now() + INTERVAL_MS).toISOString();
  console.log(`[backup-daemon] Next run scheduled at ${next}`);
}

console.log("[backup-daemon] Starting. Will run once now, then every 24 hours.");
runAll();
setInterval(runAll, INTERVAL_MS);
