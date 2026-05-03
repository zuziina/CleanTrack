import { pool } from "@workspace/db";
import { clerkClient } from "@clerk/express";
import { logger } from "./lib/logger";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    logger.info("Running startup migrations...");

    await client.query(`
      ALTER TABLE assignments
        ADD COLUMN IF NOT EXISTS issue_photo_count integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completion_notes text,
        ADD COLUMN IF NOT EXISTS started_at timestamp,
        ADD COLUMN IF NOT EXISTS finished_at timestamp
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_issue_photos (
        id serial PRIMARY KEY,
        assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        company_id integer NOT NULL REFERENCES companies(id),
        uploaded_by_clerk_id text NOT NULL,
        object_path text NOT NULL,
        description text,
        uploaded_at timestamp NOT NULL DEFAULT now(),
        expires_at timestamp NOT NULL
      )
    `);

    await client.query(`
      ALTER TABLE assignments
        ADD COLUMN IF NOT EXISTS checkout_photo_count integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS checkout_status text
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_checkout_photos (
        id serial PRIMARY KEY,
        assignment_id integer NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        company_id integer NOT NULL REFERENCES companies(id),
        uploaded_by_clerk_id text NOT NULL,
        object_path text NOT NULL,
        uploaded_at timestamp NOT NULL DEFAULT now(),
        expires_at timestamp NOT NULL
      )
    `);

    logger.info("Migrations complete.");
  } finally {
    client.release();
  }
}

export async function runWipe() {
  const client = await pool.connect();
  try {
    logger.info("WIPE_ON_START=true — wiping all data...");

    await client.query(`
      TRUNCATE assignment_issue_photos, assignments, work_sessions, houses, companies
      RESTART IDENTITY CASCADE
    `);

    logger.info("Database tables wiped.");

    logger.info("Deleting all Clerk users...");
    let deletedCount = 0;
    let page = 0;
    while (true) {
      const { data: users } = await clerkClient.users.getUserList({ limit: 100, offset: page * 100 });
      if (users.length === 0) break;
      await Promise.all(users.map((u) => clerkClient.users.deleteUser(u.id)));
      deletedCount += users.length;
      if (users.length < 100) break;
      page++;
    }
    logger.info({ deletedCount }, "Clerk users deleted.");
  } finally {
    client.release();
  }
}
