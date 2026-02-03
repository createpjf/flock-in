// ============================================================
// FLock Agent API - Model Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { ModelService } from '../services/model.service';
import { RatingService } from '../services/rating.service';
import { agentAuth } from '../middleware/auth';
import { ModelListParams, ModelRatingRequest } from '../types';
import { ApiError, Errors } from '../utils/errors';
import { pool } from '../db/connection';

const router = Router();
const modelService = new ModelService(pool);
const ratingService = new RatingService(pool);

// Helper to get string param from query
function getStringParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

/**
 * GET /v1/agents/models
 * List available models with ratings
 */
router.get('/', agentAuth, async (req: Request, res: Response) => {
  try {
    const params: ModelListParams = {
      capability: getStringParam(req.query.capability),
      sort_by: getStringParam(req.query.sort_by) as ModelListParams['sort_by'],
    };

    // Validate sort_by
    const validSortOptions = ['price_asc', 'price_desc', 'rating_desc', 'name'];
    if (params.sort_by && !validSortOptions.includes(params.sort_by)) {
      throw Errors.INVALID_REQUEST(
        `sort_by must be one of: ${validSortOptions.join(', ')}`
      );
    }

    const models = await modelService.listModels(params);
    res.json({ models });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      console.error('List models error:', error);
      res.status(500).json(Errors.INTERNAL_ERROR.toJSON());
    }
  }
});

/**
 * GET /v1/agents/models/:modelId
 * Get single model details
 */
router.get('/:modelId', agentAuth, async (req: Request, res: Response) => {
  try {
    const modelId = req.params.modelId as string;
    const model = await modelService.getModelById(modelId);

    if (!model) {
      throw Errors.MODEL_NOT_FOUND;
    }

    res.json(model);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      console.error('Get model error:', error);
      res.status(500).json(Errors.INTERNAL_ERROR.toJSON());
    }
  }
});

/**
 * POST /v1/agents/models/:modelId/ratings
 * Submit a rating for a model
 */
router.post('/:modelId/ratings', agentAuth, async (req: Request, res: Response) => {
  try {
    const modelId = req.params.modelId as string;
    const body = req.body as ModelRatingRequest;
    const agent = req.agent!;

    // Check if model exists
    if (!modelService.modelExists(modelId)) {
      throw Errors.MODEL_NOT_FOUND;
    }

    // Validate rating
    if (typeof body.rating !== 'number') {
      throw Errors.INVALID_REQUEST('rating is required and must be a number');
    }

    // Validate feedback length
    if (body.feedback && body.feedback.length > 500) {
      throw Errors.INVALID_REQUEST('feedback must be less than 500 characters');
    }

    // Validate use_case length
    if (body.use_case && body.use_case.length > 50) {
      throw Errors.INVALID_REQUEST('use_case must be less than 50 characters');
    }

    const result = await ratingService.rateModel(agent.id, modelId, body);
    res.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      console.error('Rate model error:', error);
      res.status(500).json(Errors.INTERNAL_ERROR.toJSON());
    }
  }
});

/**
 * GET /v1/agents/models/:modelId/ratings
 * Get rating statistics for a model
 */
router.get('/:modelId/ratings', agentAuth, async (req: Request, res: Response) => {
  try {
    const modelId = req.params.modelId as string;

    // Check if model exists
    if (!modelService.modelExists(modelId)) {
      throw Errors.MODEL_NOT_FOUND;
    }

    const stats = await ratingService.getModelRatings(modelId);
    res.json(stats);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(error.toJSON());
    } else {
      console.error('Get ratings error:', error);
      res.status(500).json(Errors.INTERNAL_ERROR.toJSON());
    }
  }
});

export default router;
