import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { storage } from '../storage';
import type { Customer } from '@shared/schema';
import { logger } from '../utils/logger';
import { env } from './env';

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

  // Google OAuth Strategy (only if credentials are provided)
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          // #region agent log
          logger.info({ location: 'passport:googleStrategy:start', profileId: profile.id, emails: profile.emails, hypothesisId: 'H2' }, 'Google strategy callback');
          // #endregion
          
          try {
            const email = profile.emails?.[0]?.value;
            
            // #region agent log
            logger.info({ location: 'passport:googleStrategy:emailExtracted', email, hypothesisId: 'H2' }, 'Email extracted from profile');
            // #endregion
            
            if (!email) {
              // #region agent log
              logger.error({ location: 'passport:googleStrategy:noEmail', profile, hypothesisId: 'H2' }, 'No email in Google profile');
              // #endregion
              return done(new Error('No email provided by Google'), false);
            }

            // Check if customer already exists
            let customer = await storage.getCustomerByEmail(email);

            // #region agent log
            logger.info({ location: 'passport:googleStrategy:customerCheck', hasCustomer: !!customer, email, hypothesisId: 'H2' }, 'Customer lookup result');
            // #endregion

            if (!customer) {
              // Create new customer from Google profile
              customer = await storage.createCustomer({
                id: crypto.randomUUID(),
                email,
                firstName: profile.name?.givenName || '',
                lastName: profile.name?.familyName || '',
                phone: null,
                address: null,
                notes: 'Created via Google OAuth',
              });
              // #region agent log
              logger.info({ location: 'passport:googleStrategy:customerCreated', customerId: customer.id, email, hypothesisId: 'H2' }, 'New customer created via Google OAuth');
              // #endregion
            } else {
              // #region agent log
              logger.info({ location: 'passport:googleStrategy:existingCustomer', customerId: customer.id, email, hypothesisId: 'H2' }, 'Existing customer logged in via Google OAuth');
              // #endregion
            }

            // #region agent log
            logger.info({ location: 'passport:googleStrategy:success', customerId: customer.id, hypothesisId: 'H2' }, 'Google strategy returning customer');
            // #endregion
            return done(null, customer);
          } catch (error) {
            // #region agent log
            logger.error({ location: 'passport:googleStrategy:error', err: error, hypothesisId: 'H2' }, 'Google OAuth authentication error');
            // #endregion
            return done(error as Error, false);
          }
        }
      )
    );
    logger.info('Google OAuth strategy configured');
  } else {
    logger.info('Google OAuth not configured (missing credentials)');
  }

  // Serialize user to session (store only customer ID)
  passport.serializeUser((user: Express.User, done) => {
    // #region agent log
    logger.info({ location: 'passport:serializeUser', userId: user.id, hypothesisId: 'H3' }, 'Serializing user to session');
    // #endregion
    done(null, user.id);
  });

  // Deserialize user from session (retrieve full customer data)
  passport.deserializeUser(async (id: string, done) => {
    // #region agent log
    logger.info({ location: 'passport:deserializeUser:start', userId: id, hypothesisId: 'H3' }, 'Deserializing user from session');
    // #endregion
    
    try {
      const customer = await storage.getCustomer(id);
      
      // #region agent log
      logger.info({ location: 'passport:deserializeUser:result', userId: id, hasCustomer: !!customer, hypothesisId: 'H3' }, 'Customer lookup result');
      // #endregion
      
      if (!customer) {
        return done(null, false);
      }
      done(null, customer);
    } catch (error) {
      // #region agent log
      logger.error({ location: 'passport:deserializeUser:error', err: error, customerId: id, hypothesisId: 'H3' }, 'Deserialize user error');
      // #endregion
      done(error);
    }
  });
}
