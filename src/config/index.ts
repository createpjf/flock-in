// ============================================================
// FLock Agent API - Configuration
// ============================================================

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'flock_agent',
  },

  // Rate Limits
  rateLimits: {
    requestsPerMinute: 60,
    agentsPerKey: 5,
    ratingsPerModel: 1, // per 24 hours
    ratingCooldownHours: 24,
  },

  // Models Config (can be loaded from external source)
  models: [
    {
      id: 'qwen3-235b-a22b-thinking-qwfin',
      name: 'Qwen3 235B Thinking',
      pricing: { input_per_1m: 0.230, output_per_1m: 2.300 },
      capabilities: ['chat', 'reasoning', 'code'],
    },
    {
      id: 'qwen3-30b-a3b-instruct-2507',
      name: 'Qwen3 30B Instruct',
      pricing: { input_per_1m: 0.050, output_per_1m: 0.150 },
      capabilities: ['chat', 'code'],
    },
    {
      id: 'llama3-70b-instruct',
      name: 'Llama3 70B Instruct',
      pricing: { input_per_1m: 0.080, output_per_1m: 0.200 },
      capabilities: ['chat', 'code', 'reasoning'],
    },
    {
      id: 'mistral-7b-instruct',
      name: 'Mistral 7B Instruct',
      pricing: { input_per_1m: 0.020, output_per_1m: 0.060 },
      capabilities: ['chat'],
    },
  ],
};

export type Config = typeof config;
