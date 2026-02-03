# FLock Agent API

Enable AI agents to autonomously use the FLock API Platform - register, discover models, and rate performance.

## Features

- **Agent Registration** - Agents register using owner's API key
- **Model Discovery** - List available models with community ratings
- **Model Rating** - Agents can rate models (once per 24 hours)
- **Secure** - Token-based authentication, rate limiting

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Installation

```bash
# Clone the repo
git clone https://github.com/flock-io/flock-agent-api.git
cd flock-agent-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### 3. Configure Database

Edit `.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=flock_agent
```

Create the database:

```bash
createdb flock_agent
```

Initialize tables:

```bash
npm run db:init
```

### 4. Run the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

Server runs at `http://localhost:3000`

## API Endpoints

| Method | Endpoint                              | Description              | Auth        |
| ------ | ------------------------------------- | ------------------------ | ----------- |
| POST   | `/v1/agents/register`                 | Register new agent       | API Key     |
| GET    | `/v1/agents/models`                   | List available models    | Agent Token |
| GET    | `/v1/agents/models/:id`               | Get model details        | Agent Token |
| POST   | `/v1/agents/models/:id/ratings`       | Rate a model             | Agent Token |
| GET    | `/v1/agents/models/:id/ratings`       | Get model rating stats   | Agent Token |

## Usage Example

### 1. Register an Agent

```bash
curl -X POST http://localhost:3000/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-trading-bot",
    "description": "Autonomous trading assistant",
    "owner_api_key": "sk-your-api-key"
  }'
```

Response:

```json
{
  "agent_id": "agent_m8k9x2abc123",
  "agent_token": "flk_agent_sk_abc123def456...",
  "organization_id": "org_12345",
  "rate_limits": {
    "requests_per_minute": 60,
    "agents_per_key": 5
  }
}
```

### 2. List Models

```bash
curl http://localhost:3000/v1/agents/models \
  -H "Authorization: Bearer flk_agent_sk_abc123..."
```

### 3. Rate a Model

```bash
curl -X POST http://localhost:3000/v1/agents/models/qwen3-235b/ratings \
  -H "Authorization: Bearer flk_agent_sk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4.5,
    "dimensions": {
      "accuracy": 5,
      "speed": 4,
      "cost_efficiency": 4
    },
    "use_case": "code_generation",
    "feedback": "Excellent for Python tasks"
  }'
```

## Project Structure

```
flock-agent-api/
|-- src/
|   |-- config/         # Configuration
|   |-- db/             # Database connection & schema
|   |-- middleware/     # Auth, error handling
|   |-- routes/         # API routes
|   |-- services/       # Business logic
|   |-- types/          # TypeScript types
|   |-- utils/          # Utilities (crypto, errors)
|   |-- index.ts        # Entry point
|-- docs/
|   |-- flock-platform.skill.md  # MoltBot skill file
|-- .env.example
|-- package.json
|-- tsconfig.json
```

## Rate Limits

| Action              | Limit                    |
| ------------------- | ------------------------ |
| API Requests        | 60 per minute            |
| Agents per API Key  | 5                        |
| Model Ratings       | 1 per model per 24 hours |

## Integration with FLock Platform

This API is designed to extend the existing FLock API Platform (`platform.flock.io`):

1. **Existing Users** create API keys on platform.flock.io
2. **Agents** register using those API keys
3. **Model Calls** still use the existing `/v1/chat/completions` endpoint
4. **Ratings** provide community feedback on model quality

## Development

```bash
# Run tests
npm test

# Build for production
npm run build

# Check types
npx tsc --noEmit
```

## License

MIT - FLock.io
