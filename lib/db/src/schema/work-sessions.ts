import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { companiesTable } from "./companies";

export const workSessionsTable = pgTable("work_sessions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  companyId: integer("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  clockedInAt: timestamp("clocked_in_at"),
  clockedOutAt: timestamp("clocked_out_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WorkSession = typeof workSessionsTable.$inferSelect;
