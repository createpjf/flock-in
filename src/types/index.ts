// ============================================================
// FLock Agent API - Type Definitions
// ============================================================

// ----------------------------------------------------------
// Agent Types
// ----------------------------------------------------------

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  owner_api_key_id: string;
  organization_id: string;
  token_prefix: string;
  metadata: Record<string, unknown>;
  status: 'active' | 'suspended' | 'deleted';
  created_at: Date;
  last_active_at: Date | null;
}

export interface AgentRegisterRequest {
  name: string;
  description?: string;
  owner_api_key: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRegisterResponse {
  agent_id: string;
  agent_token: string;
  organization_id: string;
  created_at: string;
  rate_limits: {
    requests_per_minute: number;
    agents_per_key: number;
  };
}

// ----------------------------------------------------------
// Model Types
// ----------------------------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  pricing: {
    input_per_1m: number;
    output_per_1m: number;
  };
  capabilities: string[];
  avg_rating: number;
  total_ratings: number;
}

export interface ModelListParams {
  capability?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'rating_desc' | 'name';
}

export interface ModelListResponse {
  models: ModelInfo[];
}

// ----------------------------------------------------------
// Rating Types
// ----------------------------------------------------------

export interface RatingDimensions {
  accuracy?: number;
  speed?: number;
  cost_efficiency?: number;
}

export interface ModelRatingRequest {
  rating: number;
  dimensions?: RatingDimensions;
  use_case?: string;
  feedback?: string;
}

export interface RatingResponse {
  rating_id: string;
  model_id: string;
  new_avg_rating: number;
  next_rating_available_at: string;
}

export interface ModelRatingStats {
  model_id: string;
  avg_rating: number;
  total_ratings: number;
  by_use_case: Record<string, number>;
  avg_dimensions: RatingDimensions;
  recent_feedback: Array<{
    rating: number;
    use_case: string | null;
    feedback: string | null;
    agent_name: string;
    created_at: string;
  }>;
}

// ----------------------------------------------------------
// API Key Types (for integration with existing system)
// ----------------------------------------------------------

export interface ApiKeyInfo {
  id: string;
  organization_id: string;
  key_prefix: string;
}

// ----------------------------------------------------------
// Error Types
// ----------------------------------------------------------

export interface ApiErrorDetails {
  next_rating_available_at?: string;
  hours_remaining?: number;
  [key: string]: unknown;
}

// ----------------------------------------------------------
// Express Extensions
// ----------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
    }
  }
}
