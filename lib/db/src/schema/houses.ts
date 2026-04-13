import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const housesTable = pgTable("houses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  notes: text("notes"),
  cleaningFrequency: text("cleaning_frequency").notNull().default("biweekly"),
  size: text("size"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  entryCode: text("entry_code"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHouseSchema = createInsertSchema(housesTable).omit({ id: true, createdAt: true });
export type InsertHouse = z.infer<typeof insertHouseSchema>;
export type House = typeof housesTable.$inferSelect;
