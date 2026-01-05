import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertCustomerSchema, insertOrderSchema, insertShippingZoneSchema, insertPrinterSchema, insertMenuSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";
import * as path from "path";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve local book assets (images, fonts)
  const assetsPath = path.join(process.cwd(), 'server', 'assets');
  app.use('/assets', express.static(assetsPath, {
    maxAge: '1y',
    immutable: true,
  }));
  console.log(`[routes] Serving local assets from ${assetsPath}`);

  // ===== BOOKS =====
  app.get("/api/books", async (req, res) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      console.error("Error getting books:", error);
      res.status(500).json({ error: "Failed to get books" });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      console.error("Error getting book:", error);
      res.status(500).json({ error: "Failed to get book" });
    }
  });

  app.post("/api/books", async (req, res) => {
    try {
      const body = {
        ...req.body,
        price: req.body.price != null ? String(req.body.price) : null,
        oldPrice: req.body.oldPrice != null ? String(req.body.oldPrice) : null,
      };
      const validationResult = insertBookSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const book = await storage.createBook(validationResult.data);
      res.status(201).json(book);
    } catch (error) {
      console.error("Error creating book:", error);
      res.status(500).json({ error: "Failed to create book" });
    }
  });

  app.patch("/api/books/:id", async (req, res) => {
    try {
      const { createdAt, ...rest } = req.body;
      const body = {
        ...rest,
        price: rest.price != null ? String(rest.price) : (rest.price === null ? null : undefined),
        oldPrice: rest.oldPrice != null ? String(rest.oldPrice) : (rest.oldPrice === null ? null : undefined),
      };
      console.log('[PATCH /api/books/:id] Received imageElements count:', body.contentConfig?.imageElements?.length);
      if (body.contentConfig?.imageElements?.length > 0) {
        const firstWithConditions = body.contentConfig.imageElements.find((img: any) => img.conditions?.length > 0);
        console.log('[PATCH /api/books/:id] First image with conditions:', JSON.stringify(firstWithConditions));
      }
      const book = await storage.updateBook(req.params.id, body);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ error: "Failed to update book" });
    }
  });

  app.delete("/api/books/:id", async (req, res) => {
    try {
      await storage.deleteBook(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting book:", error);
      res.status(500).json({ error: "Failed to delete book" });
    }
  });

  // ===== BOOK PAGE RENDERING =====
  app.post("/api/books/:id/render-pages", async (req, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      const contentConfig = book.contentConfig as any;
      const rawHtmlPages = contentConfig?.rawHtmlPages;
      if (!rawHtmlPages || rawHtmlPages.length === 0) {
        return res.status(400).json({ error: "No HTML pages to render" });
      }

      const { config = {}, characters = {} } = req.body;
      const objectStorageService = new ObjectStorageService();
      
      // Import chromium dynamically
      const { chromium } = await import('playwright-core');
      
      // Launch browser using system Chromium
      const browser = await chromium.launch({
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });

      const pages: Array<{ pageIndex: number; imageUrl: string }> = [];
      const cssContent = contentConfig?.cssContent || '';
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicBucketPath = publicSearchPaths[0] || '/replit-objstore-5e942e41-fb79-4139-8ca5-c1c4fc7182e2/public';
      
      console.log(`[render-pages] Rendering ${rawHtmlPages.length} pages for book ${book.id}`);

      for (const rawPage of rawHtmlPages) {
        try {
          const page = await browser.newPage();
          await page.setViewportSize({ 
            width: rawPage.width || 400, 
            height: rawPage.height || 293 
          });

          // Decode HTML and inject CSS + variable substitution
          let html = rawPage.html
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"');

          // Inject CSS inline
          if (cssContent) {
            html = html.replace('</head>', `<style>${cssContent}</style></head>`);
          }

          // Replace variables
          if (config.childName) {
            html = html.replace(/\{\{nom_enfant\}\}/g, config.childName);
            html = html.replace(/\{nom_enfant\}/g, config.childName);
          }

          // Fix image paths to use absolute URLs
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          html = html.replace(/src="\/assets\//g, `src="${baseUrl}/assets/`);

          await page.setContent(html, { waitUntil: 'networkidle' });
          
          // Ensure Chiller font is loaded before taking the screenshot
          await page.evaluate(() => document.fonts.load('380px Chiller'));

          // Take screenshot
          const screenshot = await page.screenshot({ type: 'jpeg', quality: 85 });
          await page.close();

          // Upload to bucket
          const { objectStorageClient } = await import('./replit_integrations/object_storage/objectStorage');
          const bucketName = 'replit-objstore-5e942e41-fb79-4139-8ca5-c1c4fc7182e2';
          const objectPath = `public/previews/${book.id}/page-${rawPage.pageIndex}.jpg`;
          
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectPath);
          
          await file.save(screenshot, {
            contentType: 'image/jpeg',
            metadata: { cacheControl: 'public, max-age=3600' },
          });

          const imageUrl = `/objects/${bucketName}/${objectPath}`;
          pages.push({ pageIndex: rawPage.pageIndex, imageUrl });
          
          console.log(`[render-pages] Page ${rawPage.pageIndex} uploaded to ${imageUrl}`);
        } catch (pageError) {
          console.error(`[render-pages] Error rendering page ${rawPage.pageIndex}:`, pageError);
        }
      }

      await browser.close();
      
      console.log(`[render-pages] Successfully rendered ${pages.length} pages`);
      res.json({ success: true, pages });
    } catch (error) {
      console.error("[render-pages] Error:", error);
      res.status(500).json({ error: "Failed to render pages" });
    }
  });

  // ===== CUSTOMERS =====
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Error getting customers:", error);
      res.status(500).json({ error: "Failed to get customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error getting customer:", error);
      res.status(500).json({ error: "Failed to get customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalSpent: req.body.totalSpent !== undefined ? String(req.body.totalSpent) : undefined,
      };
      const validationResult = insertCustomerSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      
      // Check if customer already exists with this email - just return it
      if (validationResult.data.email) {
        const existingCustomer = await storage.getCustomerByEmail(validationResult.data.email);
        if (existingCustomer) {
          return res.status(200).json(existingCustomer);
        }
      }
      
      const customer = await storage.createCustomer(validationResult.data);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalSpent: req.body.totalSpent !== undefined ? String(req.body.totalSpent) : undefined,
      };
      const customer = await storage.updateCustomer(req.params.id, body);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // ===== ORDERS =====
  app.get("/api/orders/next-id", async (req, res) => {
    try {
      const { pool } = await import("./storage");
      const result = await pool.query("SELECT nextval('order_number_seq') as seq");
      const seq = result.rows[0].seq;
      const year = new Date().getFullYear().toString().slice(-2);
      const orderId = `ORD-${year}-${String(seq).padStart(7, '0')}`;
      res.json({ orderId });
    } catch (error) {
      console.error("Error generating order ID:", error);
      res.status(500).json({ error: "Failed to generate order ID" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error getting orders:", error);
      res.status(500).json({ error: "Failed to get orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error getting order:", error);
      res.status(500).json({ error: "Failed to get order" });
    }
  });

  app.get("/api/customers/:customerId/orders", async (req, res) => {
    try {
      const orders = await storage.getOrdersByCustomer(req.params.customerId);
      res.json(orders);
    } catch (error) {
      console.error("Error getting customer orders:", error);
      res.status(500).json({ error: "Failed to get customer orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalAmount: req.body.totalAmount !== undefined ? String(req.body.totalAmount) : undefined,
      };
      const validationResult = insertOrderSchema.safeParse(body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const order = await storage.createOrder(validationResult.data);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const body = {
        ...req.body,
        totalAmount: req.body.totalAmount !== undefined ? String(req.body.totalAmount) : undefined,
      };
      const order = await storage.updateOrder(req.params.id, body);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  // ===== SHIPPING ZONES =====
  app.get("/api/shipping-zones", async (req, res) => {
    try {
      const zones = await storage.getAllShippingZones();
      res.json(zones);
    } catch (error) {
      console.error("Error getting shipping zones:", error);
      res.status(500).json({ error: "Failed to get shipping zones" });
    }
  });

  app.get("/api/shipping-zones/:id", async (req, res) => {
    try {
      const zone = await storage.getShippingZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      res.json(zone);
    } catch (error) {
      console.error("Error getting shipping zone:", error);
      res.status(500).json({ error: "Failed to get shipping zone" });
    }
  });

  app.post("/api/shipping-zones", async (req, res) => {
    try {
      const validationResult = insertShippingZoneSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const zone = await storage.createShippingZone(validationResult.data);
      res.status(201).json(zone);
    } catch (error) {
      console.error("Error creating shipping zone:", error);
      res.status(500).json({ error: "Failed to create shipping zone" });
    }
  });

  app.patch("/api/shipping-zones/:id", async (req, res) => {
    try {
      const zone = await storage.updateShippingZone(req.params.id, req.body);
      if (!zone) {
        return res.status(404).json({ error: "Shipping zone not found" });
      }
      res.json(zone);
    } catch (error) {
      console.error("Error updating shipping zone:", error);
      res.status(500).json({ error: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/shipping-zones/:id", async (req, res) => {
    try {
      await storage.deleteShippingZone(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shipping zone:", error);
      res.status(500).json({ error: "Failed to delete shipping zone" });
    }
  });

  // ===== PRINTERS =====
  app.get("/api/printers", async (req, res) => {
    try {
      const printers = await storage.getAllPrinters();
      res.json(printers);
    } catch (error) {
      console.error("Error getting printers:", error);
      res.status(500).json({ error: "Failed to get printers" });
    }
  });

  app.get("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.getPrinter(req.params.id);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      res.json(printer);
    } catch (error) {
      console.error("Error getting printer:", error);
      res.status(500).json({ error: "Failed to get printer" });
    }
  });

  app.post("/api/printers", async (req, res) => {
    try {
      const validationResult = insertPrinterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const printer = await storage.createPrinter(validationResult.data);
      res.status(201).json(printer);
    } catch (error) {
      console.error("Error creating printer:", error);
      res.status(500).json({ error: "Failed to create printer" });
    }
  });

  app.patch("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.updatePrinter(req.params.id, req.body);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      res.json(printer);
    } catch (error) {
      console.error("Error updating printer:", error);
      res.status(500).json({ error: "Failed to update printer" });
    }
  });

  app.delete("/api/printers/:id", async (req, res) => {
    try {
      await storage.deletePrinter(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting printer:", error);
      res.status(500).json({ error: "Failed to delete printer" });
    }
  });

  // ===== MENUS =====
  app.get("/api/menus", async (req, res) => {
    try {
      const menus = await storage.getAllMenus();
      res.json(menus);
    } catch (error) {
      console.error("Error getting menus:", error);
      res.status(500).json({ error: "Failed to get menus" });
    }
  });

  app.get("/api/menus/:id", async (req, res) => {
    try {
      const menu = await storage.getMenu(req.params.id);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      console.error("Error getting menu:", error);
      res.status(500).json({ error: "Failed to get menu" });
    }
  });

  app.post("/api/menus", async (req, res) => {
    try {
      const validationResult = insertMenuSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ error: fromZodError(validationResult.error).message });
      }
      const menu = await storage.createMenu(validationResult.data);
      res.status(201).json(menu);
    } catch (error) {
      console.error("Error creating menu:", error);
      res.status(500).json({ error: "Failed to create menu" });
    }
  });

  app.patch("/api/menus/:id", async (req, res) => {
    try {
      const menu = await storage.updateMenu(req.params.id, req.body);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      res.json(menu);
    } catch (error) {
      console.error("Error updating menu:", error);
      res.status(500).json({ error: "Failed to update menu" });
    }
  });

  app.delete("/api/menus/:id", async (req, res) => {
    try {
      await storage.deleteMenu(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu:", error);
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });

  // ===== SETTINGS =====
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error getting setting:", error);
      res.status(500).json({ error: "Failed to get setting" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.setSetting(req.params.key, req.body.value);
      res.json(setting);
    } catch (error) {
      console.error("Error setting value:", error);
      res.status(500).json({ error: "Failed to set value" });
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // ===== STRIPE CHECKOUT =====
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get Stripe config" });
    }
  });

  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      const { items, shippingOption, customerEmail, customerName, shippingAddress, orderId } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items are required" });
      }

      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email is required" });
      }

      const lineItems = items.map((item: any) => ({
        name: item.name || item.title || 'Livre personnalisé',
        description: item.description,
        amount: parseFloat(item.price) || 29.90,
        quantity: item.quantity || 1,
      }));

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const session = await stripeService.createCheckoutSession({
        customerEmail,
        lineItems,
        shippingOption: shippingOption ? {
          name: shippingOption.name,
          description: shippingOption.description,
          amount: parseFloat(shippingOption.price) || 0,
        } : undefined,
        successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/checkout/cancel`,
        metadata: {
          orderId: orderId || '',
          customerName: customerName || '',
          shippingAddress: JSON.stringify(shippingAddress || {}),
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Verify payment status and update order
  app.post("/api/checkout/verify-payment", async (req, res) => {
    try {
      const { sessionId, orderId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const paymentResult = await stripeService.getPaymentStatus(sessionId);
      
      // Update order with payment status if orderId is provided
      if (orderId) {
        await storage.updateOrder(orderId, {
          paymentStatus: paymentResult.status,
          stripeSessionId: sessionId,
          stripePaymentIntentId: paymentResult.paymentIntentId,
        });
      }

      res.json({
        paymentStatus: paymentResult.status,
        paymentIntentId: paymentResult.paymentIntentId,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Get payment status for an order
  app.get("/api/orders/:id/payment-status", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // If we have a Stripe session ID, get fresh status from Stripe
      if (order.stripeSessionId) {
        try {
          const paymentResult = await stripeService.getPaymentStatus(order.stripeSessionId);
          
          // Update if status changed
          if (paymentResult.status !== order.paymentStatus) {
            await storage.updateOrder(order.id, {
              paymentStatus: paymentResult.status,
              stripePaymentIntentId: paymentResult.paymentIntentId,
            });
          }
          
          res.json({
            paymentStatus: paymentResult.status,
            stripeSessionId: order.stripeSessionId,
            stripePaymentIntentId: paymentResult.paymentIntentId,
          });
        } catch (stripeError) {
          // If Stripe fails, return stored status
          res.json({
            paymentStatus: order.paymentStatus || 'pending',
            stripeSessionId: order.stripeSessionId,
          });
        }
      } else {
        res.json({
          paymentStatus: order.paymentStatus || 'pending',
        });
      }
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ error: "Failed to get payment status" });
    }
  });

  return httpServer;
}
