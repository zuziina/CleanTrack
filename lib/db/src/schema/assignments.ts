import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { housesTable } from "./houses";
import { companiesTable } from "./companies";

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companiesTable.id),
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
  completionNotes: text("completion_notes"),
  issuePhotoCount: integer("issue_photo_count").default(0).notNull(),
  checkoutPhotoCount: integer("checkout_photo_count").default(0).notNull(),
  checkoutStatus: text("checkout_status"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
