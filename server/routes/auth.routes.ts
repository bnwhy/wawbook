import express from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../storage";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { strictLimiter, authLimiter } from "../middleware/rate-limit";
import { z } from "zod";

const router = express.Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

const setPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

// POST /api/auth/signup - Register new customer
router.post("/signup", strictLimiter, async (req, res, next) => {
  try {
    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { email, password, firstName, lastName, phone } = validation.data;

    // Check if customer already exists
    const existingCustomer = await storage.getCustomerByEmail(email);
    if (existingCustomer) {
      throw new ValidationError("Un compte existe déjà avec cet email");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer
    const customer = await storage.createCustomer({
      id: crypto.randomUUID(),
      email,
      firstName,
      lastName,
      phone: phone || null,
      address: null,
      notes: null,
    });

    // Update with password (separate call to bypass insertCustomerSchema)
    await storage.updateCustomerAuth(customer.id, { password: hashedPassword });

    // Auto-login after signup
    req.login(customer, (err) => {
      if (err) {
        return next(err);
      }
      
      logger.info({ customerId: customer.id }, 'Customer signed up and logged in successfully');
      return res.status(201).json(customer);
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/auth/login - Login with email/password
router.post("/login", strictLimiter, (req, res, next) => {
  const validation = loginSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors[0].message });
  }

  return passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({ error: info?.message || "Échec de l'authentification" });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }

      logger.info({ customerId: user.id }, 'Customer logged in successfully');
      return res.json(user);
    });
  })(req, res, next);
});

// POST /api/auth/logout - Logout
router.post("/logout", authLimiter, (req, res, next) => {
  const userId = req.user?.id;
  
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        logger.error({ err: destroyErr }, 'Session destroy error');
      }

      logger.info({ customerId: userId }, 'Customer logged out');
      return res.json({ message: "Déconnecté avec succès" });
    });
  });
});

// GET /api/auth/me - Get current user
router.get("/me", authLimiter, (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  return res.json(req.user);
});

// POST /api/auth/set-password - Set password for existing customer (post-purchase account creation)
router.post("/set-password", strictLimiter, async (req, res, next) => {
  try {
    const validation = setPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { email, password } = validation.data;

    // Get customer (without password to check if they exist)
    const customer = await storage.getCustomerByEmail(email);
    if (!customer) {
      throw new ValidationError("Aucun compte trouvé avec cet email");
    }

    // Check if customer already has a password
    const customerWithPassword = await storage.getCustomerByEmailWithPassword(email);
    if (customerWithPassword?.password) {
      throw new ValidationError("Un compte existe déjà avec cette adresse mail. Veuillez vous connecter.");
    }

    // Hash and set password
    const hashedPassword = await bcrypt.hash(password, 10);
    await storage.updateCustomerAuth(customer.id, { password: hashedPassword });

    // Auto-login
    req.login(customer, (err) => {
      if (err) {
        logger.error({ err, customerId: customer.id }, 'Auto-login after set-password failed');
        return next(err);
      }

      logger.info({ customerId: customer.id }, 'Password set and auto-logged in');
      return res.json(customer);
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post("/forgot-password", strictLimiter, async (req, res, next) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { email } = validation.data;

    // Always return success (security: don't reveal if email exists)
    // But only send reset link if customer exists
    const customer = await storage.getCustomerByEmailWithPassword(email);
    
    if (customer && customer.password) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token
      await storage.updateCustomerAuth(customer.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      });

      // TODO: Send email with reset link
      // For now, just log that a reset was requested (link should be sent via email)
      logger.info({ customerId: customer.id }, 'Password reset requested');
    }

    // Always return success
    return res.json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
  } catch (error) {
    return next(error);
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post("/reset-password", strictLimiter, async (req, res, next) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { token, password } = validation.data;

    // Find customer with valid token
    const customerWithToken = await storage.getCustomerByResetToken(token);

    if (
      !customerWithToken ||
      !customerWithToken.resetPasswordExpires ||
      new Date(customerWithToken.resetPasswordExpires) <= new Date()
    ) {
      throw new ValidationError("Token invalide ou expiré");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear token
    await storage.updateCustomerAuth(customerWithToken.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    // Get safe customer for login
    const safeCustomer = await storage.getCustomer(customerWithToken.id);
    if (!safeCustomer) {
      throw new Error('Customer not found after password reset');
    }

    // Auto-login
    req.login(safeCustomer, (err) => {
      if (err) {
        logger.error({ err, customerId: safeCustomer.id }, 'Auto-login after reset-password failed');
        return next(err);
      }

      logger.info({ customerId: safeCustomer.id }, 'Password reset successfully');
      res.json(safeCustomer);
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/google - Initiate Google OAuth
router.get('/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    // Success - redirect to account or original destination
    const redirect = (req.session as any).returnTo || '/account';
    delete (req.session as any).returnTo;
    logger.info({ customerId: req.user?.id }, 'Google OAuth successful, redirecting');
    res.redirect(redirect);
  }
);

// GET /api/auth/apple - Initiate Apple Sign In
router.get('/apple',
  (req, _res, next) => {
    // Store returnTo in session
    const returnTo = req.query.returnTo as string;
    if (returnTo) {
      (req.session as any).returnTo = returnTo;
    }
    next();
  },
  passport.authenticate('apple')
);

// POST /api/auth/apple/callback - Apple Sign In callback
router.post('/apple/callback',
  passport.authenticate('apple', {
    failureRedirect: '/login',
    failureMessage: true
  }),
  (req, res) => {
    // Success - redirect to account or original destination
    const redirect = (req.session as any).returnTo || '/account';
    delete (req.session as any).returnTo;
    logger.info({ customerId: req.user?.id }, 'Apple Sign In successful, redirecting');
    res.redirect(redirect);
  }
);

export default router;
