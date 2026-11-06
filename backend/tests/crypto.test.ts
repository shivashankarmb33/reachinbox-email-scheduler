import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/utils/crypto.js';

describe('AES-256-GCM Token Encryption', () => {
  it('correctly encrypts and decrypts sensitive tokens', () => {
    const originalToken = 'xoxb-slack-secret-bot-token-1234567890';
    const encrypted = encrypt(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:cipher

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('fails decryption if ciphertext or auth tag is corrupted', () => {
    const originalToken = 'xoxb-another-token';
    const encrypted = encrypt(originalToken);
    const parts = encrypted.split(':');
    // Corrupt the ciphertext
    const corrupted = `${parts[0]}:${parts[1]}:bad${parts[2].slice(3)}`;

    expect(() => decrypt(corrupted)).toThrow();
  });
});

