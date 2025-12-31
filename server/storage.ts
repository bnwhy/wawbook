import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import type {
  User,
  InsertUser,
  Book,
  InsertBook,
  Customer,
  InsertCustomer,
  Order,
  InsertOrder,
  ShippingZone,
  InsertShippingZone,
  Printer,
  InsertPrinter,
  Menu,
  InsertMenu,
  Setting,
  InsertSetting,
} from "@shared/schema";
import {
  users,
  books,
  customers,
  orders,
  shippingZones,
  printers,
  menus,
  settings,
} from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Books
  getAllBooks(): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: string): Promise<void>;

  // Customers
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;

  // Orders
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<void>;

  // Shipping Zones
  getAllShippingZones(): Promise<ShippingZone[]>;
  getShippingZone(id: string): Promise<ShippingZone | undefined>;
  createShippingZone(zone: InsertShippingZone): Promise<ShippingZone>;
  updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined>;
  deleteShippingZone(id: string): Promise<void>;

  // Printers
  getAllPrinters(): Promise<Printer[]>;
  getPrinter(id: string): Promise<Printer | undefined>;
  createPrinter(printer: InsertPrinter): Promise<Printer>;
  updatePrinter(id: string, printer: Partial<InsertPrinter>): Promise<Printer | undefined>;
  deletePrinter(id: string): Promise<void>;

  // Menus
  getAllMenus(): Promise<Menu[]>;
  getMenu(id: string): Promise<Menu | undefined>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: string, menu: Partial<InsertMenu>): Promise<Menu | undefined>;
  deleteMenu(id: string): Promise<void>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: any): Promise<Setting>;
}

export class DbStorage implements IStorage {
  // ===== USERS =====
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // ===== BOOKS =====
  async getAllBooks(): Promise<Book[]> {
    return await db.select().from(books);
  }

  async getBook(id: string): Promise<Book | undefined> {
    const result = await db.select().from(books).where(eq(books.id, id));
    return result[0];
  }

  async createBook(book: InsertBook): Promise<Book> {
    const result = await db.insert(books).values(book as any).returning();
    return result[0];
  }

  async updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined> {
    const result = await db.update(books).set(book as any).where(eq(books.id, id)).returning();
    return result[0];
  }

  async deleteBook(id: string): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }

  // ===== CUSTOMERS =====
  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.email, email));
    return result[0];
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(customer).returning();
    return result[0];
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const result = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return result[0];
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // ===== ORDERS =====
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.id, id));
    return result[0];
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.customerId, customerId));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order as any).returning();
    return result[0];
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const result = await db.update(orders).set(order as any).where(eq(orders.id, id)).returning();
    return result[0];
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  // ===== SHIPPING ZONES =====
  async getAllShippingZones(): Promise<ShippingZone[]> {
    return await db.select().from(shippingZones);
  }

  async getShippingZone(id: string): Promise<ShippingZone | undefined> {
    const result = await db.select().from(shippingZones).where(eq(shippingZones.id, id));
    return result[0];
  }

  async createShippingZone(zone: InsertShippingZone): Promise<ShippingZone> {
    const result = await db.insert(shippingZones).values(zone as any).returning();
    return result[0];
  }

  async updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined> {
    const result = await db.update(shippingZones).set(zone as any).where(eq(shippingZones.id, id)).returning();
    return result[0];
  }

  async deleteShippingZone(id: string): Promise<void> {
    await db.delete(shippingZones).where(eq(shippingZones.id, id));
  }

  // ===== PRINTERS =====
  async getAllPrinters(): Promise<Printer[]> {
    return await db.select().from(printers);
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    const result = await db.select().from(printers).where(eq(printers.id, id));
    return result[0];
  }

  async createPrinter(printer: InsertPrinter): Promise<Printer> {
    const result = await db.insert(printers).values(printer as any).returning();
    return result[0];
  }

  async updatePrinter(id: string, printer: Partial<InsertPrinter>): Promise<Printer | undefined> {
    const result = await db.update(printers).set(printer as any).where(eq(printers.id, id)).returning();
    return result[0];
  }

  async deletePrinter(id: string): Promise<void> {
    await db.delete(printers).where(eq(printers.id, id));
  }

  // ===== MENUS =====
  async getAllMenus(): Promise<Menu[]> {
    return await db.select().from(menus);
  }

  async getMenu(id: string): Promise<Menu | undefined> {
    const result = await db.select().from(menus).where(eq(menus.id, id));
    return result[0];
  }

  async createMenu(menu: InsertMenu): Promise<Menu> {
    const result = await db.insert(menus).values(menu as any).returning();
    return result[0];
  }

  async updateMenu(id: string, menu: Partial<InsertMenu>): Promise<Menu | undefined> {
    const result = await db.update(menus).set(menu as any).where(eq(menus.id, id)).returning();
    return result[0];
  }

  async deleteMenu(id: string): Promise<void> {
    await db.delete(menus).where(eq(menus.id, id));
  }

  // ===== SETTINGS =====
  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key));
    return result[0];
  }

  async setSetting(key: string, value: any): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const result = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(settings)
        .values({ id: crypto.randomUUID(), key, value })
        .returning();
      return result[0];
    }
  }
}

export const storage = new DbStorage();
