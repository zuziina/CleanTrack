import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { housesTable } from "./houses";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  houseId: integer("house_id").notNull().references(() => housesTable.id),
  assignedToClerkId: text("assigned_to_clerk_id"),
  date: text("date").notNull(),
  timeSlot: text("time_slot").notNull(),
  notes: text("notes"),
  guestCount: integer("guest_count"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
