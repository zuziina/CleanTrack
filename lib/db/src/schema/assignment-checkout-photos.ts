import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { assignmentsTable } from "./assignments";
import { companiesTable } from "./companies";

export const assignmentCheckoutPhotosTable = pgTable("assignment_checkout_photos", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignmentsTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  uploadedByClerkId: text("uploaded_by_clerk_id").notNull(),
  objectPath: text("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type AssignmentCheckoutPhoto = typeof assignmentCheckoutPhotosTable.$inferSelect;
