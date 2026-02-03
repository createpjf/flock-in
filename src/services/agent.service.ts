// ============================================================
// FLock Agent API - Agent Service
// ============================================================

import { Pool } from 'pg';
import {
  Agent,
  AgentRegisterRequest,
  AgentRegisterResponse,
  ApiKeyInfo,
} from '../types';
import { generateAgentId, generateAgentToken, hashString } from '../utils/crypto';
import { ApiError, Errors } from '../utils/errors';
import { config } from '../config';

export class AgentService {
  constructor(private db: Pool) {}

  // ----------------------------------------------------------
  // Register a new Agent
  // ----------------------------------------------------------
  async register(request: AgentRegisterRequest): Promise<AgentRegisterResponse> {
    const { name, description, owner_api_key, metadata } = request;

    // 1. Validate API key and get owner info
    const keyInfo = await this.validateApiKey(owner_api_key);
    if (!keyInfo) {
      throw Errors.INVALID_API_KEY;
    }

    // 2. Check agent count limit
    const agentCount = await this.getAgentCountByKey(keyInfo.id);
    if (agentCount >= config.rateLimits.agentsPerKey) {
      throw Errors.MAX_AGENTS_REACHED;
    }

    // 3. Check for duplicate name
    const existing = await this.db.query(
      'SELECT id FROM agents WHERE owner_api_key_id = $1 AND name = $2 AND status = $3',
      [keyInfo.id, name, 'active']
    );
    if (existing.rows.length > 0) {
      throw Errors.AGENT_NAME_EXISTS;
    }

    // 4. Generate credentials
    const agentId = generateAgentId();
    const { token, hash, prefix } = generateAgentToken();

    // 5. Insert into database
    await this.db.query(
      `INSERT INTO agents (id, name, description, owner_api_key_id, organization_id,
                           token_hash, token_prefix, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        agentId,
        name,
        description || null,
        keyInfo.id,
        keyInfo.organization_id,
        hash,
        prefix,
        JSON.stringify(metadata || {}),
      ]
    );

    return {
      agent_id: agentId,
      agent_token: token, // Only returned once!
      organization_id: keyInfo.organization_id,
      created_at: new Date().toISOString(),
      rate_limits: {
        requests_per_minute: config.rateLimits.requestsPerMinute,
        agents_per_key: config.rateLimits.agentsPerKey,
      },
    };
  }

  // ----------------------------------------------------------
  // Validate Agent Token
  // ----------------------------------------------------------
  async validateToken(token: string): Promise<Agent | null> {
    if (!token.startsWith('flk_agent_sk_')) {
      return null;
    }

    const hash = hashString(token);
    const result = await this.db.query<Agent>(
      `SELECT * FROM agents WHERE token_hash = $1 AND status = 'active'`,
      [hash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const agent = result.rows[0]!;

    // Update last active time (non-blocking)
    this.db
      .query('UPDATE agents SET last_active_at = NOW() WHERE id = $1', [agent.id])
      .catch(() => {}); // Ignore errors

    return agent;
  }

  // ----------------------------------------------------------
  // Get Agent by ID
  // ----------------------------------------------------------
  async getById(agentId: string): Promise<Agent | null> {
    const result = await this.db.query<Agent>(
      'SELECT * FROM agents WHERE id = $1 AND status = $2',
      [agentId, 'active']
    );
    return result.rows[0] || null;
  }

  // ----------------------------------------------------------
  // List Agents by API Key
  // ----------------------------------------------------------
  async listByApiKey(apiKeyId: string): Promise<Agent[]> {
    const result = await this.db.query<Agent>(
      `SELECT * FROM agents
       WHERE owner_api_key_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [apiKeyId]
    );
    return result.rows;
  }

  // ----------------------------------------------------------
  // Delete Agent (soft delete)
  // ----------------------------------------------------------
  async delete(agentId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE agents SET status = 'deleted' WHERE id = $1 AND status = 'active'`,
      [agentId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ----------------------------------------------------------
  // Private: Validate API Key
  // ----------------------------------------------------------
  private async validateApiKey(key: string): Promise<ApiKeyInfo | null> {
    const hash = hashString(key);
    const result = await this.db.query<ApiKeyInfo>(
      `SELECT id, organization_id, key_prefix FROM api_keys
       WHERE key_hash = $1 AND revoked_at IS NULL`,
      [hash]
    );
    return result.rows[0] || null;
  }

  // ----------------------------------------------------------
  // Private: Get Agent Count by API Key
  // ----------------------------------------------------------
  private async getAgentCountByKey(keyId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM agents
       WHERE owner_api_key_id = $1 AND status = 'active'`,
      [keyId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  }
}
