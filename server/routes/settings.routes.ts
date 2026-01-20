import express from "express";
import { storage } from "../storage";
import { NotFoundError } from "../utils/errors";
import { logger } from "../utils/logger";

const router = express.Router();

router.get("/:key", async (req, res, next) => {
  try {
    const setting = await storage.getSetting(req.params.key);
    if (!setting) {
      throw new NotFoundError('Setting', req.params.key);
    }
    res.json(setting);
  } catch (error) {
    next(error);
  }
});

router.put("/:key", async (req, res, next) => {
  try {
    const setting = await storage.setSetting(req.params.key, req.body.value);
    logger.info({ key: req.params.key }, 'Setting updated');
    res.json(setting);
  } catch (error) {
    next(error);
  }
});

export default router;
