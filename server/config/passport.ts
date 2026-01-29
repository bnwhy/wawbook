import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import type { Customer } from '@shared/schema';
import { logger } from '../utils/logger';

export function configurePassport() {
  // Local Strategy for email/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // Get customer with password field
          const customer = await storage.getCustomerByEmailWithPassword(email);

          if (!customer) {
            return done(null, false, { message: 'Email ou mot de passe incorrect' });
          }

          if (!customer.password) {
            return done(null, false, { message: 'Ce compte n\'a pas de mot de passe. Veuillez créer un mot de passe.' });
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(password, customer.password);

          if (!isValidPassword) {
            return done(null, false, { message: 'Email ou mot de passe incorrect' });
          }

          // Remove sensitive fields before returning
          const { password: _, resetPasswordToken, resetPasswordExpires, ...safeCustomer } = customer;
          
          logger.info({ customerId: customer.id }, 'User authenticated successfully');
          return done(null, safeCustomer);
        } catch (error) {
          logger.error({ err: error }, 'Authentication error');
          return done(error);
        }
      }
    )
  );

  // Serialize user to session (store only customer ID)
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (retrieve full customer data)
  passport.deserializeUser(async (id: string, done) => {
    try {
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return done(null, false);
      }
      done(null, customer);
    } catch (error) {
      logger.error({ err: error, customerId: id }, 'Deserialize user error');
      done(error);
    }
  });
}
