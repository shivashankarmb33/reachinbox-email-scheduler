import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export const isGoogleOAuthConfigured = (): boolean => {
  const id = env.GOOGLE_CLIENT_ID?.trim() || '';
  const secret = env.GOOGLE_CLIENT_SECRET?.trim() || '';
  return Boolean(
    id &&
    secret &&
    !id.startsWith('mock_') &&
    !id.startsWith('your_') &&
    !secret.startsWith('mock_') &&
    !secret.startsWith('your_')
  );
};

export const configurePassport = () => {
  if (isGoogleOAuthConfigured()) {
    logger.info('🔑 Google OAuth 2.0 strategy registered successfully');
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found from Google profile'), undefined);
            }

            const name = profile.displayName || email.split('@')[0];
            const avatar = profile.photos?.[0]?.value || null;

            // Upsert user in PostgreSQL
            const user = await prisma.user.upsert({
              where: { googleId: profile.id },
              update: {
                name,
                avatar,
              },
              create: {
                googleId: profile.id,
                email,
                name,
                avatar,
              },
            });

            // Ensure user has at least one default sender configured
            const senderCount = await prisma.sender.count({ where: { userId: user.id } });
            if (senderCount === 0) {
              await prisma.sender.create({
                data: {
                  userId: user.id,
                  email: user.email,
                  smtpHost: env.SMTP_HOST,
                  smtpPort: env.SMTP_PORT,
                  smtpUser: env.SMTP_USER,
                  smtpPass: env.SMTP_PASS,
                  hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
                  minimumDelay: env.MIN_DELAY_BETWEEN_EMAILS,
                },
              });
            }

            return done(null, user);
          } catch (error) {
            logger.error({ msg: 'Google OAuth authentication failed', error });
            return done(error as Error, undefined);
          }
        }
      )
    );
  } else {
    logger.warn(
      '⚠️ Google OAuth credentials not configured in environment. Google sign-in is disabled until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are provided in .env'
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user || false);
    } catch (err) {
      logger.error({ msg: 'Error deserializing user from session', id, err });
      done(null, false);
    }
  });
};
