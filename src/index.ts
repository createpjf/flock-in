// ============================================================
// FLock Agent API - Main Entry Point
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { testConnection } from './db/connection';

const app = express();

// ----------------------------------------------------------
// Middleware
// ----------------------------------------------------------
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging (development)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ----------------------------------------------------------
// Routes
// ----------------------------------------------------------
app.use('/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'FLock Agent API',
    version: '1.0.0',
    docs: 'https://docs.flock.io/flock-products/api-platform',
    endpoints: {
      health: 'GET /v1/health',
      register: 'POST /v1/agents/register',
      models: 'GET /v1/agents/models',
      rate: 'POST /v1/agents/models/:modelId/ratings',
      ratings: 'GET /v1/agents/models/:modelId/ratings',
    },
  });
});

// ----------------------------------------------------------
// Error Handling
// ----------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ----------------------------------------------------------
// Start Server
// ----------------------------------------------------------
async function start() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`
====================================================
  FLock Agent API v1.0.0
====================================================
  Server running on http://localhost:${config.port}
  Environment: ${config.nodeEnv}

  Endpoints:
  - POST /v1/agents/register
  - GET  /v1/agents/models
  - POST /v1/agents/models/:id/ratings
  - GET  /v1/agents/models/:id/ratings
====================================================
    `);
  });
}

start();
