// ============================================================
// FLock Agent API - Routes Index
// ============================================================

import { Router } from 'express';
import agentRoutes from './agent.routes';
import modelRoutes from './model.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount routes
router.use('/agents', agentRoutes);
router.use('/agents/models', modelRoutes);

export default router;
