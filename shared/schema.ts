import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===== USERS =====
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ===== BOOKS =====
export const books = pgTable("books", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  promoCode: text("promo_code"),
  coverImage: text("cover_image").notNull(),
  theme: text("theme").notNull(),
  category: text("category").notNull(), // 'family' | 'theme' | 'activity' | 'occasion'
  badgeText: text("badge_text"),
  associatedPaths: jsonb("associated_paths").$type<string[]>(),
  oldPrice: decimal("old_price", { precision: 10, scale: 2 }),
  isHidden: integer("is_hidden").default(0), // 0 = false, 1 = true
  features: jsonb("features"),
  wizardConfig: jsonb("wizard_config").notNull(),
  contentConfig: jsonb("content_config").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookSchema = createInsertSchema(books).omit({
  createdAt: true,
});

export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

// ===== CUSTOMERS =====
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: jsonb("address").$type<{
    street: string;
    city: string;
    zipCode: string;
    country: string;
  }>(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0").notNull(),
  orderCount: integer("order_count").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  createdAt: true,
  totalSpent: true,
  orderCount: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ===== ORDERS =====
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  status: text("status").notNull(), // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: jsonb("items").notNull().$type<Array<{
    id: string;
    bookId: string;
    bookTitle: string;
    quantity: number;
    price: number;
    configuration: any;
  }>>(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull().$type<{
    street: string;
    city: string;
    zipCode: string;
    country: string;
  }>(),
  trackingNumber: text("tracking_number"),
  logs: jsonb("logs").$type<Array<{
    id: string;
    date: string;
    type: 'status_change' | 'comment' | 'system';
    message: string;
    author?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  createdAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ===== SHIPPING ZONES =====
export const shippingZones = pgTable("shipping_zones", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  countries: jsonb("countries").notNull().$type<string[]>(),
  methods: jsonb("methods").notNull().$type<Array<{
    id: string;
    name: string;
    price: number;
    description?: string;
    estimatedDelay?: string;
    condition?: {
      type: 'weight' | 'price' | 'quantity' | 'none';
      operator: 'greater_than' | 'less_than' | 'between';
      value: number;
      maxValue?: number;
    };
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShippingZoneSchema = createInsertSchema(shippingZones).omit({
  createdAt: true,
});

export type InsertShippingZone = z.infer<typeof insertShippingZoneSchema>;
export type ShippingZone = typeof shippingZones.$inferSelect;

// ===== PRINTERS =====
export const printers = pgTable("printers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  contactEmail: text("contact_email"),
  countryCodes: jsonb("country_codes").notNull().$type<string[]>(),
  productionDelayDays: integer("production_delay_days"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPrinterSchema = createInsertSchema(printers).omit({
  createdAt: true,
});

export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printers.$inferSelect;

// ===== MENUS =====
export const menus = pgTable("menus", {
  id: varchar("id").primaryKey(),
  label: text("label").notNull(),
  type: text("type").notNull(), // 'simple' | 'columns' | 'grid'
  basePath: text("base_path").notNull(),
  items: jsonb("items").$type<string[]>(),
  columns: jsonb("columns").$type<Array<{
    title: string;
    items: string[];
  }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMenuSchema = createInsertSchema(menus).omit({
  createdAt: true,
});

export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menus.$inferSelect;

// ===== SETTINGS =====
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
