import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { createAuthToken, verifyAuthToken } from '../../utils/crypto.js';
import { isGoogleOAuthConfigured } from './passport.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// Configuration status endpoint
router.get('/config', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    googleConfigured: isGoogleOAuthConfigured(),
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  });
});

// Initiate Google OAuth 2.0 flow
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured()) {
    logger.warn('Google OAuth initiated but credentials are not configured in environment');
    const msg = encodeURIComponent(
      'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env, or use Launch Demo Session below.'
    );
    return res.redirect(`${env.FRONTEND_URL}/login?error=google_not_configured&msg=${msg}`);
  }

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

// Google OAuth 2.0 callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', (err: any, user: any) => {
      if (err || !user) {
        logger.error({ msg: 'Google OAuth authentication failed', error: err?.message });
        const msg = encodeURIComponent('Google authentication failed or was cancelled.');
        return res.redirect(`${env.FRONTEND_URL}/login?error=auth_failed&msg=${msg}`);
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          logger.error({ msg: 'Login session error after Google OAuth', error: loginErr });
          return res.redirect(`${env.FRONTEND_URL}/login?error=session_error`);
        }

        // Save session explicitly to Redis/memory store
        req.session.save(() => {
          // Generate bearer token as fallback for cross-site cookie restrictions
          const token = createAuthToken(user.id, user.email);
          res.redirect(`${env.FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`);
        });
      });
    })(req, res, next);
  }
);

// Logout
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      logger.error({ msg: 'Error logging out user', error: err });
    }
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true, message: 'Logged out successfully' });
      });
    } else {
      res.clearCookie('connect.sid');
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
  });
});

// Get current authenticated user profile (supports Session and Bearer Token)
router.get('/me', async (req: Request, res: Response) => {
  try {
    // 1. Check Passport session
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      const user = req.user as any;
      return res.status(200).json({
        success: true,
        authMethod: 'session',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
      });
    }

    // 2. Check Bearer token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const verified = verifyAuthToken(token);
      if (verified) {
        try {
          const user = await prisma.user.findUnique({ where: { id: verified.userId } });
          if (user) {
            return res.status(200).json({
              success: true,
              authMethod: 'token',
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                createdAt: user.createdAt,
              },
            });
          }
        } catch (err: any) {
          logger.error({ msg: 'Database error in /me token lookup', error: err.message });
        }
      }
    }

    // Explicitly return 401 unauthenticated with user: null when no user session exists
    return res.status(401).json({
      success: false,
      error: 'Unauthenticated',
      user: null,
    });
  } catch (err: any) {
    logger.error({ msg: 'Unexpected error in /me handler', error: err?.message });
    return res.status(401).json({
      success: false,
      error: 'Unauthenticated',
      user: null,
    });
  }
});

// Development / Demo login endpoint
router.post('/dev-login', async (req: Request, res: Response) => {
  const { email = 'demo@reachinbox.ai', name = 'ReachInbox Demo User' } = req.body;
  logger.info(`[Auth] Attempting Demo Login for: ${email}`);

  try {
    // 1. Upsert demo user in PostgreSQL
    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        googleId: `demo_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email,
        name,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop',
      },
    });

    // 2. Ensure default Sender configured with Ethereal SMTP
    const sender = await prisma.sender.findFirst({ where: { userId: user.id } });
    if (!sender) {
      await prisma.sender.create({
        data: {
          userId: user.id,
          email: user.email,
          smtpHost: env.SMTP_HOST || 'smtp.ethereal.email',
          smtpPort: env.SMTP_PORT || 587,
          smtpUser: env.SMTP_USER || '',
          smtpPass: env.SMTP_PASS || '',
          hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER || 50,
          minimumDelay: env.MIN_DELAY_BETWEEN_EMAILS || 2000,
        },
      });
    }

    // 3. Generate signed Bearer token (valid for 7 days)
    const token = createAuthToken(user.id, user.email);

    // 4. Establish Passport session
    req.login(user, (err) => {
      if (err) {
        logger.error({ msg: 'Session error in dev-login', error: err });
        // Return token even if session creation had an error
        return res.status(200).json({
          success: true,
          message: 'Authenticated via Token',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.createdAt,
          },
          token,
        });
      }

      // Explicitly commit session
      req.session.save(() => {
        logger.info(`[Auth] Demo Login successful for ${email} (ID: ${user.id})`);
        return res.status(200).json({
          success: true,
          message: 'Demo login successful',
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.createdAt,
          },
          token,
        });
      });
    });
  } catch (error: any) {
    logger.error({ msg: 'Failed during demo login', error: error.message });
    return res.status(500).json({
      success: false,
      error: `Demo login failed: ${error.message}`,
    });
  }
});

export default router;
