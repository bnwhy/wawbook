import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import AppleStrategy from 'passport-apple';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { storage } from '../storage';
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
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            
            if (!email) {
              return done(new Error('No email provided by Google'), false);
            }

            // Check if customer already exists
            let customer = await storage.getCustomerByEmail(email);

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
              logger.info({ customerId: customer.id, email }, 'New customer created via Google OAuth');
            } else {
              logger.info({ customerId: customer.id, email }, 'Existing customer logged in via Google OAuth');
            }

            return done(null, customer);
          } catch (error) {
            logger.error({ err: error }, 'Google OAuth authentication error');
            return done(error as Error, false);
          }
        }
      )
    );
    logger.info('Google OAuth strategy configured');
  } else {
    logger.info('Google OAuth not configured (missing credentials)');
  }

  // Apple Sign In Strategy (only if credentials are provided)
  if (env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) {
    passport.use(
      new AppleStrategy(
        {
          clientID: env.APPLE_CLIENT_ID,
          teamID: env.APPLE_TEAM_ID,
          keyID: env.APPLE_KEY_ID,
          privateKeyString: env.APPLE_PRIVATE_KEY,
          callbackURL: '/api/auth/apple/callback',
          passReqToCallback: false,
        },
        async (_accessToken: string, _refreshToken: string, idToken: any, profile: any, done: any) => {
          try {
            const email = idToken.email || profile.email;
            
            if (!email) {
              return done(new Error('No email provided by Apple'), false);
            }

            // Check if customer already exists
            let customer = await storage.getCustomerByEmail(email);

            if (!customer) {
              // Create new customer from Apple profile
              // Apple only provides name on first sign-in
              const firstName = profile.name?.firstName || '';
              const lastName = profile.name?.lastName || '';
              
              customer = await storage.createCustomer({
                id: crypto.randomUUID(),
                email,
                firstName,
                lastName,
                phone: null,
                address: null,
                notes: 'Created via Apple Sign In',
              });
              logger.info({ customerId: customer.id, email }, 'New customer created via Apple Sign In');
            } else {
              logger.info({ customerId: customer.id, email }, 'Existing customer logged in via Apple Sign In');
            }

            return done(null, customer);
          } catch (error) {
            logger.error({ err: error }, 'Apple Sign In authentication error');
            return done(error as Error, false);
          }
        }
      )
    );
    logger.info('Apple Sign In strategy configured');
  } else {
    logger.info('Apple Sign In not configured (missing credentials)');
  }

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
