import express from "express";
import { storage } from "../storage";
import { insertShippingZoneSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = express.Router();

// GET /api/shipping-zones
router.get("/", async (req, res, next) => {
  try {
    const zones = await storage.getAllShippingZones();
    res.json(zones);
  } catch (error) {
    next(error);
  }
});

// GET /api/shipping-zones/:id
router.get("/:id", async (req, res, next) => {
  try {
    const zone = await storage.getShippingZone(req.params.id);
    if (!zone) {
      throw new NotFoundError('Shipping zone', req.params.id);
    }
    res.json(zone);
  } catch (error) {
    next(error);
  }
});

// POST /api/shipping-zones
router.post("/", async (req, res, next) => {
  try {
    const validationResult = insertShippingZoneSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(fromZodError(validationResult.error).message);
    }
    const zone = await storage.createShippingZone(validationResult.data);
    logger.info({ zoneId: zone.id }, 'Shipping zone created');
    res.status(201).json(zone);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/shipping-zones/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const zone = await storage.updateShippingZone(req.params.id, req.body);
    if (!zone) {
      throw new NotFoundError('Shipping zone', req.params.id);
    }
    logger.info({ zoneId: zone.id }, 'Shipping zone updated');
    res.json(zone);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/shipping-zones/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await storage.deleteShippingZone(req.params.id);
    logger.info({ zoneId: req.params.id }, 'Shipping zone deleted');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
