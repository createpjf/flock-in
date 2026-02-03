// ============================================================
// FLock Agent API - Custom Error Classes
// ============================================================

import { ApiErrorDetails } from '../types';

export class ApiError extends Error {
  public statusCode: number;
  public details?: ApiErrorDetails;

  constructor(statusCode: number, message: string, details?: ApiErrorDetails) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      ...this.details,
    };
  }
}

// Predefined errors
export const Errors = {
  // Authentication
  INVALID_API_KEY: new ApiError(401, 'Invalid API key'),
  INVALID_AGENT_TOKEN: new ApiError(401, 'Invalid or missing agent token'),
  MISSING_AUTH: new ApiError(401, 'Authorization header required'),

  // Validation
  INVALID_REQUEST: (message: string) => new ApiError(400, message),
  INVALID_RATING: new ApiError(400, 'Rating must be between 1 and 5'),

  // Limits
  MAX_AGENTS_REACHED: new ApiError(429, 'Maximum 5 agents per API key'),
  AGENT_NAME_EXISTS: new ApiError(400, 'Agent name already exists for this API key'),

  // Ratings
  NO_MODEL_USAGE: new ApiError(403, 'You must use this model before rating it'),
  RATING_COOLDOWN: (nextAvailable: string, hoursRemaining: number) =>
    new ApiError(429, 'You can only rate each model once per 24 hours', {
      next_rating_available_at: nextAvailable,
      hours_remaining: hoursRemaining,
    }),

  // Not Found
  MODEL_NOT_FOUND: new ApiError(404, 'Model not found'),
  AGENT_NOT_FOUND: new ApiError(404, 'Agent not found'),

  // Server
  INTERNAL_ERROR: new ApiError(500, 'Internal server error'),
};
