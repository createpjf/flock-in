// ============================================================
// FLock Agent API - Cryptographic Utilities
// ============================================================

import { randomBytes, createHash } from 'crypto';

/**
 * Generate a unique Agent ID
 * Format: agent_<timestamp36><random>
 */
export function generateAgentId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `agent_${timestamp}${random}`.substring(0, 32);
}

/**
 * Generate an Agent Token with hash and prefix
 * Format: flk_agent_sk_<random>
 */
export function generateAgentToken(): {
  token: string;
  hash: string;
  prefix: string;
} {
  const random = randomBytes(24).toString('base64url');
  const token = `flk_agent_sk_${random}`;
  const hash = hashString(token);
  const prefix = token.substring(0, 20);

  return { token, hash, prefix };
}

/**
 * Hash a string using SHA256
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Validate agent token format
 */
export function isValidAgentToken(token: string): boolean {
  return token.startsWith('flk_agent_sk_') && token.length > 20;
}

/**
 * Validate API key format
 */
export function isValidApiKey(key: string): boolean {
  return key.startsWith('sk-') && key.length > 10;
}
