// ============================================================
// FLock Agent API - Authentication Middleware
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { AgentService } from '../services/agent.service';
import { Errors } from '../utils/errors';
import { pool } from '../db/connection';

const agentService = new AgentService(pool);

/**
 * Middleware to authenticate Agent Token
 * Extracts token from Authorization: Bearer <token>
 */
export async function agentAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json(Errors.MISSING_AUTH.toJSON());
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      res.status(401).json(Errors.INVALID_AGENT_TOKEN.toJSON());
      return;
    }

    const agent = await agentService.validateToken(token);

    if (!agent) {
      res.status(401).json(Errors.INVALID_AGENT_TOKEN.toJSON());
      return;
    }

    // Attach agent to request
    req.agent = agent;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json(Errors.INTERNAL_ERROR.toJSON());
  }
}

/**
 * Optional auth - doesn't fail if no token provided
 */
export async function optionalAgentAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token) {
        const agent = await agentService.validateToken(token);
        if (agent) {
          req.agent = agent;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
}
