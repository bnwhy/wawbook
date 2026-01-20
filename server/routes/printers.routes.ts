import express from "express";
import { storage } from "../storage";
import { insertPrinterSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const printers = await storage.getAllPrinters();
    res.json(printers);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const printer = await storage.getPrinter(req.params.id);
    if (!printer) {
      throw new NotFoundError('Printer', req.params.id);
    }
    res.json(printer);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const validationResult = insertPrinterSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(fromZodError(validationResult.error).message);
    }
    const printer = await storage.createPrinter(validationResult.data);
    logger.info({ printerId: printer.id }, 'Printer created');
    res.status(201).json(printer);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const printer = await storage.updatePrinter(req.params.id, req.body);
    if (!printer) {
      throw new NotFoundError('Printer', req.params.id);
    }
    logger.info({ printerId: printer.id }, 'Printer updated');
    res.json(printer);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await storage.deletePrinter(req.params.id);
    logger.info({ printerId: req.params.id }, 'Printer deleted');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
