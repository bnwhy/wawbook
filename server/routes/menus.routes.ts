import express from "express";
import { storage } from "../storage";
import { insertMenuSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const menus = await storage.getAllMenus();
    res.json(menus);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const menu = await storage.getMenu(req.params.id);
    if (!menu) {
      throw new NotFoundError('Menu', req.params.id);
    }
    res.json(menu);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const validationResult = insertMenuSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError(fromZodError(validationResult.error).message);
    }
    const menu = await storage.createMenu(validationResult.data);
    logger.info({ menuId: menu.id }, 'Menu created');
    res.status(201).json(menu);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const menu = await storage.updateMenu(req.params.id, req.body);
    if (!menu) {
      throw new NotFoundError('Menu', req.params.id);
    }
    logger.info({ menuId: menu.id }, 'Menu updated');
    res.json(menu);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await storage.deleteMenu(req.params.id);
    logger.info({ menuId: req.params.id }, 'Menu deleted');
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
