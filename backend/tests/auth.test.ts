import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createAuthToken, verifyAuthToken } from '../src/utils/crypto.js';

describe('ReachInbox Authentication System', () => {
  const app = createApp();

  it('generates and verifies signed HMAC-SHA256 bearer tokens', () => {
    const token = createAuthToken('test-user-id-123', 'demo@reachinbox.ai');
    expect(token).toBeTruthy();
    expect(token.split('.')).toHaveLength(2);

    const verified = verifyAuthToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('test-user-id-123');
    expect(verified?.email).toBe('demo@reachinbox.ai');
  });

  it('rejects tampered bearer tokens', () => {
    const token = createAuthToken('test-user-id-123', 'demo@reachinbox.ai');
    const [payload] = token.split('.');
    const tampered = `${payload}.invalidSignature`;
    const verified = verifyAuthToken(tampered);
    expect(verified).toBeNull();
  });

  it('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'Unauthenticated');
  });

  it('GET /auth/google redirects to Google OAuth or login redirect', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(
      /accounts\.google\.com|\/login\?error=google_not_configured/
    );
  });

  it('POST /api/auth/dev-login successfully provisions and authenticates demo user', async () => {
    const res = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: 'demo@reachinbox.ai', name: 'ReachInbox Demo User' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('demo@reachinbox.ai');
    expect(res.body).toHaveProperty('token');

    // Verify token returned in response
    const token = res.body.token;
    expect(token).toBeTruthy();

    // Now test GET /api/auth/me using the returned Bearer token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveProperty('success', true);
    expect(meRes.body.user.email).toBe('demo@reachinbox.ai');
  });

  it('POST /api/auth/logout successfully logs out session', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });
});

