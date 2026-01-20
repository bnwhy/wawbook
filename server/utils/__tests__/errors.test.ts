import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with correct properties', () => {
      const error = new AppError(400, 'Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error');
      expect(error.isOperational).toBe(true);
    });

    it('should allow setting isOperational to false', () => {
      const error = new AppError(500, 'Critical error', false);
      
      expect(error.isOperational).toBe(false);
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with resource name', () => {
      const error = new NotFoundError('Book');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Book not found');
    });

    it('should create a 404 error with resource name and id', () => {
      const error = new NotFoundError('Book', '123');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Book with id '123' not found");
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create a 401 error with default message', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('should create a 401 error with custom message', () => {
      const error = new UnauthorizedError('Invalid credentials');
      
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid credentials');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a 403 error', () => {
      const error = new ForbiddenError();
      
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });
  });

  describe('ConflictError', () => {
    it('should create a 409 error', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
    });
  });

  describe('DatabaseError', () => {
    it('should create a 500 error and not be operational', () => {
      const error = new DatabaseError();
      
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
      expect(error.message).toBe('Database operation failed');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create a 503 error with service name', () => {
      const error = new ExternalServiceError('Stripe');
      
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe("External service 'Stripe' is unavailable");
    });

    it('should create a 503 error with custom message', () => {
      const error = new ExternalServiceError('Stripe', 'Payment processing failed');
      
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Payment processing failed');
    });
  });
});
