import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import RedisStore from 'connect-redis';
import passport from 'passport';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { redisClient } from './config/redis.js';
import { configurePassport } from './modules/auth/passport.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import emailRoutes from './modules/email/email.routes.js';
import sendersRoutes from './modules/senders/senders.routes.js';
import slackRoutes from './modules/slack/slack.routes.js';
import queueRoutes from './routes/queue.routes.js';
import { bullBoardRouter } from './bullboard/bullboard.js';

export const createApp = (): Express => {
  const app = express();

  // Trust first proxy (Render load balancer / Cloudflare) so req.secure and HTTPS cookies work correctly
  app.set('trust proxy', 1);

  // 1. Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Required for Bull Board UI rendering
    })
  );

  // 2. CORS configuration (allowing configured Render frontend, local dev, and exact production origin)
  const allowedOrigins = [
    env.FRONTEND_URL.replace(/\/+$/, ''),
    'https://reachinbox-frontend-1ri7.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ];

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!requestOrigin) return callback(null, true);
        const normalized = requestOrigin.replace(/\/+$/, '');
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Body & Cookie Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 4. Redis Session Store
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'reachinbox:sess:',
  });

  const isProduction = env.NODE_ENV === 'production';

  app.use(
    session({
      store: redisStore,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      proxy: isProduction, // Trust reverse proxy on Render for HTTPS cookies
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-site HTTPS between Render frontend and backend
      },
    })
  );

  // 5. Passport Authentication
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // 6. Global API Rate Limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per 15 mins
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', apiLimiter);

  // 7. Bull Board Dashboard (Protected or Admin accessible)
  app.use('/admin/queues', bullBoardRouter);

  // 8. Application Routes
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/senders', sendersRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/queue', queueRoutes);

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
