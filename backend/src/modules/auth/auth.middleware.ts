import { Request, Response, NextFunction } from 'express';
import { verifyAuthToken } from '../../utils/crypto.js';
import { prisma } from '../../config/prisma.js';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1. Check Passport session
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
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
          req.user = user;
          return next();
        }
      } catch {
        // Fallback or ignore DB error
      }
    }
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized: Please authenticate to access this resource',
  });
};
