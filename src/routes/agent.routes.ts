// ============================================================
// FLock Agent API - Agent Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { AgentService } from '../services/agent.service';
import { AgentRegisterRequest } from '../types';
import { ApiError, Errors } from '../utils/errors';
import { pool } from '../db/connection';

const router = Router();
const agentService = new AgentService(pool);

/**
 * POST /v1/agents/register
 * Register a new agent using owner's API key
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = req.body as AgentRegisterRequest;

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      throw Errors.INVALID_REQUEST('name is required and must be a string');
    }

    if (!body.owner_api_key || typeof body.owner_api_key !== 'string') {
      throw Errors.INVALID_REQUEST('owner_api_key is required');
    }

    // Validate name length
    if (body.name.length < 1 || body.name.length > 64) {
      throw Errors.INVALID_REQUEST('name must be between 1 and 64 characters');
    }

    // Validate description length if provided
    if (body.description && body.description.length > 500) {
      throw Errors.INVALID_REQUEST('description must be less than 500 characters');
    }

    const result = await agentService.register(body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      console.error('Register error:', error);
      res.status(500).json(Errors.INTERNAL_ERROR.toJSON());
    }
  }
});

export default router;
