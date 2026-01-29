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

// ===== CONFIGURATION TYPES =====
// Types stricts pour wizardConfig et contentConfig

export const wizardOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  imageUrl: z.string().optional(),
  price: z.number().optional(),
});

export const wizardVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['radio', 'checkbox', 'select']).optional(),
  options: z.array(wizardOptionSchema),
});

export const wizardTabSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  variants: z.array(wizardVariantSchema),
});

export const wizardConfigSchema = z.object({
  tabs: z.array(wizardTabSchema),
});

export const textStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.string().optional(),
  color: z.string().optional(),
  letterSpacing: z.string().optional(),
  textDecoration: z.string().optional(),
  textTransform: z.string().optional(),
  textAlign: z.string().optional(),
  textAlignLast: z.string().optional(),
  lineHeight: z.string().optional(),
  textIndent: z.string().optional(),
  marginTop: z.string().optional(),
  marginBottom: z.string().optional(),
});

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  layer: z.number().optional(),
  pageIndex: z.number(),
});

export const conditionSchema = z.object({
  variantId: z.string(),
  optionId: z.string(),
});

export const imageElementSchema = z.object({
  id: z.string(),
  url: z.string(),
  position: positionSchema.optional(),
  combinationKey: z.string().optional(),
  characteristics: z.record(z.string()).optional(),
  conditions: z.array(conditionSchema).optional(),
});

/**
 * Schéma pour la condition parsée d'un segment conditionnel
 * Pattern de naming IDML: (TXTCOND)tabId_variantId-optionId (même format que les images)
 */
export const parsedConditionSchema = z.object({
  tabId: z.string(),      // ex: "hero-child"
  variantId: z.string(),  // ex: "gender"
  optionId: z.string(),   // ex: "boy"
});

/**
 * Schéma pour un segment de texte conditionnel (partie d'un TextFrame)
 * Utilisé pour le texte conditionnel InDesign (AppliedConditions)
 */
export const conditionalSegmentSchema = z.object({
  text: z.string(),                              // Le texte du segment
  condition: z.string().optional(),              // Nom de la condition (ex: "(TXTCOND)hero-child_gender-boy")
  parsedCondition: parsedConditionSchema.optional(), // Condition parsée pour le matching wizard
  variables: z.array(z.string()).optional(),     // Variables dans ce segment (ex: ["name_child"])
  appliedCharacterStyle: z.string().optional(),  // Style de caractère appliqué
});

export const textElementSchema = z.object({
  id: z.string(),
  content: z.string(),
  position: positionSchema.optional(),
  style: textStyleSchema.optional(),
  fontFamily: z.string().optional(),
  // Support du texte conditionnel InDesign
  conditionalSegments: z.array(conditionalSegmentSchema).optional(),
  availableConditions: z.array(z.string()).optional(),
});

export const pageSchema = z.object({
  pageIndex: z.number(),
  width: z.number(),
  height: z.number(),
});

export const contentConfigSchema = z.object({
  pages: z.array(pageSchema).optional(),
  imageElements: z.array(imageElementSchema).optional(),
  texts: z.array(textElementSchema).optional(),
  cssContent: z.string().optional(),
  extractedFonts: z.array(z.object({
    family: z.string(),
    path: z.string(),
  })).optional(),
});

export const bookConfigurationSchema = z.object({
  childName: z.string().optional(),
  theme: z.string().optional(),
  selections: z.record(z.record(z.string())).optional(),
});

export type WizardConfig = z.infer<typeof wizardConfigSchema>;
export type ContentConfig = z.infer<typeof contentConfigSchema>;
export type BookConfiguration = z.infer<typeof bookConfigurationSchema>;
export type Position = z.infer<typeof positionSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ConditionalSegment = z.infer<typeof conditionalSegmentSchema>;
export type ParsedCondition = z.infer<typeof parsedConditionSchema>;

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
  wizardConfig: jsonb("wizard_config").notNull().$type<WizardConfig>(),
  contentConfig: jsonb("content_config").notNull().$type<ContentConfig>(),
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
  // Authentication fields
  password: text("password"), // nullable - guests n'ont pas de password
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  createdAt: true,
  totalSpent: true,
  orderCount: true,
  // Exclude auth fields from standard insert - handled separately
  password: true,
  resetPasswordToken: true,
  resetPasswordExpires: true,
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
  paymentStatus: text("payment_status").default("pending").notNull(), // 'pending' | 'paid' | 'failed' | 'refunded'
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  items: jsonb("items").notNull().$type<Array<{
    id: string;
    bookId: string;
    bookTitle: string;
    quantity: number;
    price: number;
    configuration: BookConfiguration;
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

