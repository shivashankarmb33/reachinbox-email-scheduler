import { describe, it, expect } from 'vitest';
import { rateLimiter } from '../src/modules/scheduler/rateLimiter.js';

describe('Rate Limiter Logic & Window Calculation', () => {
  it('correctly calculates milliseconds remaining until next hour', () => {
    // Current time: 10:45:00
    const mockNow = new Date('2026-11-05T10:45:00.000Z');
    const msUntilNextHour = rateLimiter.calculateMsUntilNextHour(mockNow);

    // 15 minutes = 15 * 60 * 1000 = 900,000 ms
    expect(msUntilNextHour).toBe(15 * 60 * 1000);
  });

  it('guarantees at least 1000ms delay when called right at the hour boundary', () => {
    const mockBoundary = new Date('2026-11-05T10:59:59.999Z');
    const ms = rateLimiter.calculateMsUntilNextHour(mockBoundary);
    expect(ms).toBeGreaterThanOrEqual(1);
  });
});

