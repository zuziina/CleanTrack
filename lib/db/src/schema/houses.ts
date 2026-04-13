import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const housesTable = pgTable("houses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  zipCode: text("zip_code").notNull().default(""),
  latitude: real("latitude").notNull().default(0),
  longitude: real("longitude").notNull().default(0),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  notes: text("notes"),
  cleaningFrequency: text("cleaning_frequency").notNull().default("biweekly"),
  size: text("size"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  entryCode: text("entry_code"),
  mapsLink: text("maps_link"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHouseSchema = createInsertSchema(housesTable).omit({ id: true, createdAt: true });
export type InsertHouse = z.infer<typeof insertHouseSchema>;
export type House = typeof housesTable.$inferSelect;
