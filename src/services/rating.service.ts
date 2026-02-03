// ============================================================
// FLock Agent API - Rating Service
// ============================================================

import { Pool } from 'pg';
import {
  ModelRatingRequest,
  RatingResponse,
  ModelRatingStats,
  RatingDimensions,
} from '../types';
import { Errors } from '../utils/errors';
import { config } from '../config';

interface RatingRow {
  id: string;
  created_at: Date;
}

interface LastRatingRow {
  created_at: Date;
}

interface UsageRow {
  exists: boolean;
}

interface StatsRow {
  avg_rating: string;
  total_ratings: string;
}

interface UseCaseRow {
  use_case: string;
  avg_rating: string;
}

interface DimensionsRow {
  accuracy: string | null;
  speed: string | null;
  cost_efficiency: string | null;
}

interface FeedbackRow {
  rating: string;
  use_case: string | null;
  feedback: string | null;
  agent_name: string;
  created_at: Date;
}

export class RatingService {
  constructor(private db: Pool) {}

  // ----------------------------------------------------------
  // Submit a rating for a model
  // ----------------------------------------------------------
  async rateModel(
    agentId: string,
    modelId: string,
    request: ModelRatingRequest
  ): Promise<RatingResponse> {
    const { rating, dimensions, use_case, feedback } = request;

    // 1. Validate rating range
    if (rating < 1 || rating > 5) {
      throw Errors.INVALID_RATING;
    }

    // Validate dimension values if provided
    if (dimensions) {
      for (const [key, value] of Object.entries(dimensions)) {
        if (value !== undefined && (value < 1 || value > 5)) {
          throw Errors.INVALID_REQUEST(`Dimension '${key}' must be between 1 and 5`);
        }
      }
    }

    // 2. Check if agent has used this model
    const hasUsage = await this.checkModelUsage(agentId, modelId);
    if (!hasUsage) {
      throw Errors.NO_MODEL_USAGE;
    }

    // 3. Check 24-hour cooldown
    const lastRating = await this.db.query<LastRatingRow>(
      `SELECT created_at FROM model_ratings
       WHERE agent_id = $1 AND model_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [agentId, modelId]
    );

    if (lastRating.rows.length > 0) {
      const lastTime = new Date(lastRating.rows[0]!.created_at);
      const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);

      if (hoursSince < config.rateLimits.ratingCooldownHours) {
        const nextAvailable = new Date(
          lastTime.getTime() + config.rateLimits.ratingCooldownHours * 60 * 60 * 1000
        );
        throw Errors.RATING_COOLDOWN(
          nextAvailable.toISOString(),
          Math.ceil(config.rateLimits.ratingCooldownHours - hoursSince)
        );
      }
    }

    // 4. Insert rating
    const result = await this.db.query<RatingRow>(
      `INSERT INTO model_ratings (model_id, agent_id, rating, dimensions, use_case, feedback)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        modelId,
        agentId,
        rating,
        dimensions ? JSON.stringify(dimensions) : null,
        use_case || null,
        feedback || null,
      ]
    );

    // 5. Get updated average rating
    const stats = await this.db.query<StatsRow>(
      'SELECT avg_rating FROM model_rating_stats WHERE model_id = $1',
      [modelId]
    );

    const nextAvailable = new Date(
      Date.now() + config.rateLimits.ratingCooldownHours * 60 * 60 * 1000
    );

    return {
      rating_id: result.rows[0]!.id,
      model_id: modelId,
      new_avg_rating: stats.rows[0] ? parseFloat(stats.rows[0].avg_rating) : rating,
      next_rating_available_at: nextAvailable.toISOString(),
    };
  }

  // ----------------------------------------------------------
  // Get detailed rating statistics for a model
  // ----------------------------------------------------------
  async getModelRatings(modelId: string): Promise<ModelRatingStats> {
    // Get overall stats
    const stats = await this.db.query<StatsRow>(
      'SELECT avg_rating, total_ratings FROM model_rating_stats WHERE model_id = $1',
      [modelId]
    );

    // Get stats by use case
    const byUseCaseResult = await this.db.query<UseCaseRow>(
      `SELECT use_case, ROUND(AVG(rating)::numeric, 2) as avg_rating
       FROM model_ratings
       WHERE model_id = $1 AND use_case IS NOT NULL
       GROUP BY use_case`,
      [modelId]
    );

    // Get average dimensions
    const dimensionsResult = await this.db.query<DimensionsRow>(
      `SELECT
         ROUND(AVG((dimensions->>'accuracy')::numeric)::numeric, 2) as accuracy,
         ROUND(AVG((dimensions->>'speed')::numeric)::numeric, 2) as speed,
         ROUND(AVG((dimensions->>'cost_efficiency')::numeric)::numeric, 2) as cost_efficiency
       FROM model_ratings
       WHERE model_id = $1 AND dimensions IS NOT NULL`,
      [modelId]
    );

    // Get recent feedback
    const recentResult = await this.db.query<FeedbackRow>(
      `SELECT r.rating, r.use_case, r.feedback, r.created_at, a.name as agent_name
       FROM model_ratings r
       JOIN agents a ON r.agent_id = a.id
       WHERE r.model_id = $1 AND r.feedback IS NOT NULL
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [modelId]
    );

    const stat = stats.rows[0];
    const dim = dimensionsResult.rows[0];

    const avgDimensions: RatingDimensions = {};
    if (dim?.accuracy) avgDimensions.accuracy = parseFloat(dim.accuracy);
    if (dim?.speed) avgDimensions.speed = parseFloat(dim.speed);
    if (dim?.cost_efficiency) avgDimensions.cost_efficiency = parseFloat(dim.cost_efficiency);

    return {
      model_id: modelId,
      avg_rating: stat ? parseFloat(stat.avg_rating) : 0,
      total_ratings: stat ? parseInt(stat.total_ratings, 10) : 0,
      by_use_case: Object.fromEntries(
        byUseCaseResult.rows.map((r) => [r.use_case, parseFloat(r.avg_rating)])
      ),
      avg_dimensions: avgDimensions,
      recent_feedback: recentResult.rows.map((r) => ({
        rating: parseFloat(r.rating),
        use_case: r.use_case,
        feedback: r.feedback,
        agent_name: r.agent_name,
        created_at: r.created_at.toISOString(),
      })),
    };
  }

  // ----------------------------------------------------------
  // Check if agent has used the model
  // ----------------------------------------------------------
  private async checkModelUsage(agentId: string, modelId: string): Promise<boolean> {
    // Get agent's API key
    const agentResult = await this.db.query<{ owner_api_key_id: string }>(
      'SELECT owner_api_key_id FROM agents WHERE id = $1',
      [agentId]
    );

    if (!agentResult.rows[0]) {
      return false;
    }

    // Check if there's a log entry for this model
    const usageResult = await this.db.query<UsageRow>(
      `SELECT EXISTS(
         SELECT 1 FROM api_logs
         WHERE api_key_id = $1 AND model = $2
         LIMIT 1
       ) as exists`,
      [agentResult.rows[0].owner_api_key_id, modelId]
    );

    return usageResult.rows[0]?.exists || false;
  }
}
