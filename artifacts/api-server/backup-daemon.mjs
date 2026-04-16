#!/usr/bin/env node
/**
 * CleanTrack backup daemon
 * Runs the backup immediately on start, then every 24 hours.
 */

import { execFile } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_SCRIPT = path.join(__dirname, "backup.mjs");
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function runBackup() {
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
    const next = new Date(Date.now() + INTERVAL_MS).toISOString();
    console.log(`[backup-daemon] Next backup scheduled at ${next}`);
  });
}

console.log("[backup-daemon] Starting. Will back up once now, then every 24 hours.");
runBackup();
setInterval(runBackup, INTERVAL_MS);
