// ============================================================
// FLock Agent API - Model Service
// ============================================================

import { Pool } from 'pg';
import { ModelInfo, ModelListParams } from '../types';
import { config } from '../config';

interface RatingStats {
  model_id: string;
  avg_rating: string;
  total_ratings: string;
}

export class ModelService {
  constructor(private db: Pool) {}

  // ----------------------------------------------------------
  // Get all available models with ratings
  // ----------------------------------------------------------
  async listModels(params: ModelListParams): Promise<ModelInfo[]> {
    // Get base models from config
    let models = config.models.map((m) => ({
      ...m,
      avg_rating: 0,
      total_ratings: 0,
    }));

    // Filter by capability
    if (params.capability) {
      models = models.filter((m) => m.capabilities.includes(params.capability!));
    }

    // Get rating stats from database
    const statsResult = await this.db.query<RatingStats>(
      'SELECT model_id, avg_rating, total_ratings FROM model_rating_stats'
    );

    const statsMap = new Map(
      statsResult.rows.map((r) => [
        r.model_id,
        {
          avg: parseFloat(r.avg_rating) || 0,
          total: parseInt(r.total_ratings, 10) || 0,
        },
      ])
    );

    // Merge ratings into models
    models = models.map((m) => ({
      ...m,
      avg_rating: statsMap.get(m.id)?.avg || 0,
      total_ratings: statsMap.get(m.id)?.total || 0,
    }));

    // Sort
    switch (params.sort_by) {
      case 'price_asc':
        models.sort((a, b) => a.pricing.input_per_1m - b.pricing.input_per_1m);
        break;
      case 'price_desc':
        models.sort((a, b) => b.pricing.input_per_1m - a.pricing.input_per_1m);
        break;
      case 'name':
        models.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'rating_desc':
      default:
        models.sort((a, b) => b.avg_rating - a.avg_rating);
        break;
    }

    return models;
  }

  // ----------------------------------------------------------
  // Get single model by ID
  // ----------------------------------------------------------
  async getModelById(modelId: string): Promise<ModelInfo | null> {
    const baseModel = config.models.find((m) => m.id === modelId);
    if (!baseModel) {
      return null;
    }

    // Get rating stats
    const statsResult = await this.db.query<RatingStats>(
      'SELECT avg_rating, total_ratings FROM model_rating_stats WHERE model_id = $1',
      [modelId]
    );

    const stats = statsResult.rows[0];

    return {
      ...baseModel,
      avg_rating: stats ? parseFloat(stats.avg_rating) : 0,
      total_ratings: stats ? parseInt(stats.total_ratings, 10) : 0,
    };
  }

  // ----------------------------------------------------------
  // Check if model exists
  // ----------------------------------------------------------
  modelExists(modelId: string): boolean {
    return config.models.some((m) => m.id === modelId);
  }
}
