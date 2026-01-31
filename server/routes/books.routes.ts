import express from "express";
import { storage } from "../storage";
import { insertBookSchema, type ImageElement, type TextElement } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { NotFoundError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import * as path from "path";
import * as fs from "fs";
import { extractFontsFromCss } from "../utils/fontExtractor";
import { ObjectStorageService, objectStorageClient } from "../replit_integrations/object_storage";

const router = express.Router();

// GET /api/books
router.get("/", async (req, res, next) => {
  try {
    const books = await storage.getAllBooks();
    res.json(books);
  } catch (error) {
    next(error);
  }
});

// GET /api/books/:id
router.get("/:id", async (req, res, next) => {
  try {
    const book = await storage.getBook(req.params.id);
    if (!book) {
      throw new NotFoundError('Book', req.params.id);
    }
    res.json(book);
  } catch (error) {
    next(error);
  }
});

// POST /api/books
router.post("/", async (req, res, next) => {
  try {
    const body = {
      ...req.body,
      price: req.body.price != null ? String(req.body.price) : null,
      oldPrice: req.body.oldPrice != null ? String(req.body.oldPrice) : null,
    };
    const validationResult = insertBookSchema.safeParse(body);
    if (!validationResult.success) {
      throw new ValidationError(fromZodError(validationResult.error).message);
    }
    const book = await storage.createBook(validationResult.data);
    logger.info({ bookId: book.id }, 'Book created');
    res.status(201).json(book);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/books/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const { createdAt, ...rest } = req.body;
    const body = {
      ...rest,
      price: rest.price != null ? String(rest.price) : (rest.price === null ? null : undefined),
      oldPrice: rest.oldPrice != null ? String(rest.oldPrice) : (rest.oldPrice === null ? null : undefined),
    };
    
    logger.debug({ 
      bookId: req.params.id, 
      imageElementsCount: body.contentConfig?.imageElements?.length,
      galleryImages: body.galleryImages,
      thumbnailBackground: body.thumbnailBackground
    }, 'Updating book');
    
    if (body.contentConfig?.imageElements?.length > 0) {
      const firstWithConditions = body.contentConfig.imageElements.find((img) => img.conditions && img.conditions.length > 0);
      if (firstWithConditions) {
        logger.debug({ firstWithConditions }, 'First image with conditions');
      }
    }
    
    if (body.contentConfig?.cssContent) {
      const assetsBasePath = path.join(process.cwd(), 'server', 'assets');
      const { processedCss, fonts } = await extractFontsFromCss(
        body.contentConfig.cssContent,
        req.params.id,
        assetsBasePath
      );
      if (fonts.length > 0) {
        logger.info({ bookId: req.params.id, fontsCount: fonts.length }, 'Extracted fonts from CSS');
        body.contentConfig.cssContent = processedCss;
        body.contentConfig.extractedFonts = fonts;
      }
    }
    
    const book = await storage.updateBook(req.params.id, body);
    if (!book) {
      throw new NotFoundError('Book', req.params.id);
    }
    logger.info({ bookId: book.id }, 'Book updated');
    res.json(book);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/books/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const bookId = req.params.id;
    
    // Security: Validate bookId format (only alphanumeric and hyphens allowed)
    if (!/^[a-zA-Z0-9_-]+$/.test(bookId)) {
      throw new ValidationError("Invalid book ID format");
    }
    
    // Verify the book exists in database before deleting files
    const existingBook = await storage.getBook(bookId);
    if (!existingBook) {
      throw new NotFoundError('Book', bookId);
    }
    
    // 1. Delete local assets folder (images, fonts, CSS)
    const booksBasePath = path.join(process.cwd(), 'server', 'assets', 'books');
    const localAssetsPath = path.join(booksBasePath, bookId);
    
    // Security: Ensure resolved path is within the books directory (prevent path traversal)
    const resolvedPath = path.resolve(localAssetsPath);
    const resolvedBasePath = path.resolve(booksBasePath);
    if (!resolvedPath.startsWith(resolvedBasePath + path.sep)) {
      throw new ValidationError("Invalid book ID");
    }
    
    try {
      if (fs.existsSync(resolvedPath)) {
        fs.rmSync(resolvedPath, { recursive: true, force: true });
        logger.info({ path: resolvedPath }, 'Deleted local assets');
      }
    } catch (fsError) {
      logger.error({ err: fsError }, 'Error deleting local assets');
    }
    
    // 2. Delete previews from object storage
    try {
      const objectStorageService = new ObjectStorageService();
      const publicSearchPaths = objectStorageService.getPublicObjectSearchPaths();
      const publicBucketPath = publicSearchPaths[0] || '';
      
      if (publicBucketPath) {
        const pathParts = publicBucketPath.startsWith('/') 
          ? publicBucketPath.slice(1).split('/') 
          : publicBucketPath.split('/');
        const bucketName = pathParts[0];
        const previewPrefix = pathParts.slice(1).join('/') + `/previews/${bookId}/`;
        
        const bucket = objectStorageClient.bucket(bucketName);
        const [files] = await bucket.getFiles({ prefix: previewPrefix });
        
        if (files.length > 0) {
          await Promise.all(files.map(file => file.delete()));
          logger.info({ filesCount: files.length }, 'Deleted preview files from object storage');
        }
      }
    } catch (storageError) {
      logger.error({ err: storageError }, 'Error deleting from object storage');
    }
    
    // 3. Delete book from database
    await storage.deleteBook(bookId);
    logger.info({ bookId }, 'Book deleted from database');
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
