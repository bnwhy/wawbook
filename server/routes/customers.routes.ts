import express from "express";
import { storage } from "../storage";
import { insertCustomerSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = express.Router();

// GET /api/customers
router.get("/", async (req, res, next) => {
  try {
    const customers = await storage.getAllCustomers();
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

// GET /api/customers/:id
router.get("/:id", async (req, res, next) => {
  try {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      throw new NotFoundError('Customer', req.params.id);
    }
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// POST /api/customers
router.post("/", async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      totalSpent: req.body.totalSpent !== undefined ? String(req.body.totalSpent) : undefined,
    };
    const validationResult = insertCustomerSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(fromZodError(validationResult.error).message);
    }
    
    // Check if customer already exists with this email - just return it
    if (validationResult.data.email) {
      const existingCustomer = await storage.getCustomerByEmail(validationResult.data.email);
      if (existingCustomer) {
        logger.info({ customerId: existingCustomer.id }, 'Customer already exists');
        return res.status(200).json(existingCustomer);
      }
    }
    
    const customer = await storage.createCustomer(validationResult.data);
    logger.info({ customerId: customer.id }, 'Customer created');
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/customers/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      totalSpent: req.body.totalSpent !== undefined ? String(req.body.totalSpent) : undefined,
    };
    const customer = await storage.updateCustomer(req.params.id, body);
    if (!customer) {
      throw new NotFoundError('Customer', req.params.id);
    }
    logger.info({ customerId: customer.id }, 'Customer updated');
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/customers/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await storage.deleteCustomer(req.params.id);
    logger.info({ customerId: req.params.id }, 'Customer deleted');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
