-- ============================================================
-- FLock Agent API - Database Schema
-- Run this file to initialize the database
-- ============================================================

-- Drop existing tables if needed (for development)
-- DROP TABLE IF EXISTS model_ratings CASCADE;
-- DROP TABLE IF EXISTS model_rating_stats CASCADE;
-- DROP TABLE IF EXISTS agents CASCADE;
-- DROP TABLE IF EXISTS api_keys CASCADE;

-- ============================================================
-- API Keys Table (simplified version for standalone usage)
-- In production, this would connect to your existing api_keys table
-- ============================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(16) NOT NULL,
    organization_id VARCHAR(32) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,

    -- Index for lookups
    CONSTRAINT api_keys_hash_idx UNIQUE (key_hash)
);

-- ============================================================
-- Agents Table
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    description VARCHAR(500),

    -- Relations
    owner_api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    organization_id VARCHAR(32) NOT NULL,

    -- Authentication
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_prefix VARCHAR(20) NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(owner_api_key_id, name)
);

-- ============================================================
-- Model Ratings Table
-- Allows multiple ratings per agent per model (once per 24 hours)
-- ============================================================
CREATE TABLE IF NOT EXISTS model_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id VARCHAR(100) NOT NULL,
    agent_id VARCHAR(32) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Rating data
    rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    dimensions JSONB,
    use_case VARCHAR(50),
    feedback VARCHAR(500),

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Model Rating Stats Table (Cached aggregations)
-- ============================================================
CREATE TABLE IF NOT EXISTS model_rating_stats (
    model_id VARCHAR(100) PRIMARY KEY,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    by_use_case JSONB DEFAULT '{}',
    avg_dimensions JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- API Logs Table (simplified for checking model usage)
-- In production, this would connect to your existing logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id),
    model VARCHAR(100) NOT NULL,
    status INTEGER,
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost DECIMAL(10, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_api_key_id);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_agents_token_prefix ON agents(token_prefix);

CREATE INDEX IF NOT EXISTS idx_ratings_model ON model_ratings(model_id);
CREATE INDEX IF NOT EXISTS idx_ratings_agent ON model_ratings(agent_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created ON model_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_agent_model_time ON model_ratings(agent_id, model_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_logs_key_model ON api_logs(api_key_id, model);

-- ============================================================
-- Functions
-- ============================================================

-- Function to update rating stats after new rating
CREATE OR REPLACE FUNCTION update_model_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO model_rating_stats (model_id, avg_rating, total_ratings, updated_at)
    SELECT
        NEW.model_id,
        ROUND(AVG(rating)::numeric, 2),
        COUNT(*),
        NOW()
    FROM model_ratings
    WHERE model_id = NEW.model_id
    ON CONFLICT (model_id) DO UPDATE SET
        avg_rating = EXCLUDED.avg_rating,
        total_ratings = EXCLUDED.total_ratings,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
DROP TRIGGER IF EXISTS trigger_update_rating_stats ON model_ratings;
CREATE TRIGGER trigger_update_rating_stats
AFTER INSERT ON model_ratings
FOR EACH ROW EXECUTE FUNCTION update_model_rating_stats();

-- ============================================================
-- Sample Data (for testing)
-- ============================================================

-- Insert a test API key (password: test-api-key-12345)
-- SHA256 hash of 'sk-test-api-key-12345'
INSERT INTO api_keys (id, key_hash, key_prefix, organization_id, name)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    'sk-test-api',
    'org_test_12345',
    'Test API Key'
) ON CONFLICT DO NOTHING;

-- Insert some test log entries
INSERT INTO api_logs (api_key_id, model, status, tokens_input, tokens_output, cost)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qwen3-235b-a22b-thinking-qwfin', 200, 100, 500, 0.001265),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qwen3-30b-a3b-instruct-2507', 200, 200, 300, 0.000055)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Done!
-- ============================================================
