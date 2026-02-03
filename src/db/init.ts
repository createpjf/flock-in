// ============================================================
// FLock Agent API - Database Initialization Script
// Run with: npm run db:init
// ============================================================

import fs from 'fs';
import path from 'path';
import { pool } from './connection';

async function initDatabase() {
  console.log('Initializing database...\n');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await pool.query(schema);

    console.log('[OK] Database initialized successfully!\n');
    console.log('Tables created:');
    console.log('  - api_keys');
    console.log('  - agents');
    console.log('  - model_ratings');
    console.log('  - model_rating_stats');
    console.log('  - api_logs');
    console.log('\nTest data inserted:');
    console.log('  - Test API Key: sk-test-api-key-12345');
    console.log('  - Organization: org_test_12345\n');
  } catch (error) {
    console.error('[ERROR] Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
