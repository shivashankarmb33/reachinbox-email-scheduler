import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Derive 32-byte key from hex string
const getKey = (): Buffer => {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
};

/**
 * Encrypt plaintext string using AES-256-GCM
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Combine iv + authTag + encrypted into a single hex-delimited string
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt cipher text using AES-256-GCM
 */
export const decrypt = (cipherText: string): string => {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipher text format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

/**
 * Generate a signed HMAC-SHA256 JWT-style bearer token for API authentication
 */
export const createAuthToken = (userId: string, email: string): string => {
  const payload = JSON.stringify({
    userId,
    email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(b64Payload)
    .digest('base64url');
  return `${b64Payload}.${signature}`;
};

/**
 * Verify and parse a signed HMAC-SHA256 bearer token
 */
export const verifyAuthToken = (
  token: string
): { userId: string; email: string } | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [b64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(b64Payload)
      .digest('base64url');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
};

