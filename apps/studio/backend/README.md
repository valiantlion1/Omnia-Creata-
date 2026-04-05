# OmniaCreata Backend

AI Image Generation Platform Backend with Multi-Provider Support

## Features

- **Multi-Provider Architecture**: HuggingFace, Gemini, OpenRouter, and managed/cloud provider integration
- **Durable Metadata Store**: SQLite for local development and Postgres/Supabase for staging-production metadata
- **Preset System**: Realistic, Anime, Ultra quality presets with keyword-based LoRA mapping
- **Asset Management**: Local and cloud asset resolution with caching
- **Batch Processing**: Efficient multi-image generation
- **Health Monitoring**: Real-time provider health checks and fallback
- **RESTful API**: OpenAPI/Swagger documentation
- **Background Tasks**: Async image generation with status tracking

## Runtime Topologies

Studio generation now supports three explicit runtime modes:

- `all`
  - local development convenience
  - the API can accept generation work and process it in the same process
- `web`
  - accepts generation requests
  - writes durable job state
  - enqueues work into the shared broker
  - never processes generation jobs locally
- `worker`
  - claims brokered generation jobs
  - sends durable claim heartbeats while work is running
  - completes or recovers jobs without serving API traffic

### Expected setups

- Local dev without Redis
  - use `GENERATION_RUNTIME_MODE=all`
  - Studio falls back to the local dispatcher
- Local split web/worker with Redis
  - run the API with `GENERATION_RUNTIME_MODE=web`
  - run `python scripts/generation_worker.py` in a second terminal
  - set `REDIS_URL` for the shared queue broker
- Staging / production
  - run API and worker as separate processes
  - keep `REDIS_URL` configured
  - treat `all` mode as development-only convenience

If `REDIS_URL` is configured but Redis is unavailable, Studio starts in degraded mode and falls back to the local queue instead of crashing. In `web` runtime without an active shared broker, Studio also marks itself degraded and temporarily processes generations locally instead of leaving jobs stranded forever. Inspect `/v1/healthz` to confirm whether the shared broker is active.
Broker/state reconciliation also runs during generation maintenance, so terminal, missing, or duplicate running jobs that reappear in the broker are discarded instead of being processed twice.
`GENERATION_CLAIM_LEASE_SECONDS` controls how long a worker claim remains valid before recovery logic can recycle the job. Keep it comfortably above `GENERATION_MAINTENANCE_INTERVAL_SECONDS`; Studio normalizes unsafe values automatically.
When a worker task is cancelled during shutdown or crash-like interruption, Studio intentionally keeps the shared broker claim alive until it goes stale, so another worker can recover it through normal stale-claim recycling instead of treating it as successfully completed.

## Quick Start

### Prerequisites

- Python 3.11+
- Redis only when running split `web` / `worker` topology

### Installation

1. **Clone and navigate to backend**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and settings
   ```

5. **Start the server**:
   ```bash
   python main.py
   ```

   Or with uvicorn:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Split runtime example

Run the API process:

```bash
set GENERATION_RUNTIME_MODE=web
set REDIS_URL=redis://127.0.0.1:6379/0
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run the worker process in another terminal:

```bash
set GENERATION_RUNTIME_MODE=worker
set REDIS_URL=redis://127.0.0.1:6379/0
python scripts/generation_worker.py
```

### API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Notes

- `/v1/healthz` now reports:
  - `generation_runtime_mode`
  - `generation_broker.enabled`
  - `generation_broker.kind`
  - `generation_broker.queued_by_priority`
  - `generation_broker.claimed`
  - `generation_worker.processing_active`
- Generation job lifecycle uses:
  - `queued`
  - `running`
  - `succeeded`
  - `failed`
  - `retryable_failed`
  - `cancelled`
  - `timed_out`

## API Endpoints

### Image Generation

- `POST /v1/generate` - Generate single image
- `POST /v1/generate/batch` - Generate multiple images
- `GET /v1/generate/{id}` - Get generation status
- `GET /v1/generate/batch/{id}` - Get batch status

### Presets & Assets

- `GET /v1/presets` - List available presets
- `GET /v1/presets/{name}` - Get preset details
- `GET /v1/loras` - List available LoRA models

### System

- `GET /v1/healthz` - Health check
- `GET /v1/queue` - Queue status
- `GET /v1/usage` - Usage statistics

## Configuration

### Environment Variables

Key environment variables in `.env`:

```env
# API Keys
GEMINI_API_KEY=your_gemini_key
HUGGINGFACE_TOKEN=your_hf_token
OPENROUTER_API_KEY=your_openrouter_key
OPENAI_API_KEY=your_openai_key

# State Store
STATE_STORE_BACKEND=sqlite
STATE_STORE_PATH=
LEGACY_STATE_STORE_PATH=

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development

# CORS
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### Provider Configuration

Edit `config/providers.json` to configure AI providers:

```json
{
  "providers": {
    "comfyui": {
      "enabled": true,
      "base_url": "http://localhost:8188",
      "timeout": 300,
      "priority": 1
    },
    "huggingface": {
      "enabled": true,
      "timeout": 60,
      "priority": 2
    }
  }
}
```

### Preset Configuration

Edit `config/presets.json` to customize generation presets:

```json
{
  "presets": {
    "realistic": {
      "model": "RealVisXL_V3.0.safetensors",
      "steps": 25,
      "cfg_scale": 7.0,
      "sampler": "euler",
      "default_loras": ["detail_enhancer.safetensors"]
    }
  }
}
```

## Architecture

### Directory Structure

```
backend/
├── api/                 # FastAPI routes and schemas
│   ├── __init__.py
│   ├── routes.py        # API endpoints
│   └── schemas.py       # Pydantic models
├── providers/           # AI provider integrations
│   ├── __init__.py
│   ├── base.py          # Base provider class
│   ├── huggingface.py   # HuggingFace integration
│   ├── gemini.py        # Google Gemini integration
│   ├── openrouter.py    # OpenRouter integration
│   └── manager.py       # Provider manager with fallback
├── presets/             # Preset and asset management
│   ├── __init__.py
│   ├── resolver.py      # Preset resolution logic
│   └── assets.py        # Asset management and caching
├── config/              # Configuration files
│   ├── env.py           # Environment validation
│   ├── providers.json   # Provider configuration
│   └── presets.json     # Preset definitions
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

### Key Components

1. **Provider Manager**: Handles multiple AI providers with automatic fallback
2. **Preset Resolver**: Applies presets and resolves LoRA mappings
3. **Asset Resolver**: Manages local and cloud assets with caching
4. **API Layer**: RESTful endpoints with OpenAPI documentation
5. **Background Tasks**: Async image generation with status tracking

## Development

### Running Tests

```bash
pytest
```

### Manual Live Provider Smoke Tests

These tests are intentionally manual and never run in normal CI.

```bash
set ENABLE_LIVE_PROVIDER_SMOKE=true
python scripts/provider_smoke.py --provider fal
python scripts/provider_smoke.py --provider runware
```

Use `--provider all` to run the whole suite and `--skip-failure-probe` if you only want successful generation checks.

### Code Formatting

```bash
black .
isort .
flake8 .
```

### Type Checking

```bash
mypy .
```

### Adding New Providers

1. Create new provider class inheriting from `BaseProvider`
2. Implement required methods: `authenticate()`, `generate()`, `health_check()`
3. Add provider configuration to `config/providers.json`
4. Register provider in `ProviderManager`

### Adding New Presets

1. Add preset configuration to `config/presets.json`
2. Define model, LoRAs, and generation parameters
3. Add keyword mappings for automatic LoRA selection

## Production Deployment

### Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Setup

- Set `ENVIRONMENT=production`
- Configure proper CORS origins
- Set up Redis for background tasks
- Configure cloud storage for generated images
- Set up monitoring and logging

### State Store

- `STATE_STORE_BACKEND=sqlite` is the durable default for Studio metadata.
- `STATE_STORE_PATH` overrides the SQLite database location if needed.
- `LEGACY_STATE_STORE_PATH` can point at a previous JSON state file for one-time bootstrap on first startup.
- `STATE_STORE_BACKEND=postgres` is the production/staging path and uses `DATABASE_URL`.
- `STATE_STORE_BACKEND=json` still exists for fallback/dev debugging, but it is no longer the preferred runtime path.

### Security Considerations

- Enable JWT authentication
- Set up rate limiting
- Configure HTTPS
- Validate all inputs
- Sanitize file uploads
- Monitor API usage

## Troubleshooting

### Common Issues

1. **Managed Provider Connection Failed**
   - Verify the configured provider API keys in `.env`
   - Check outbound network access from the backend host
   - Confirm provider health from `/healthz/detail`

2. **Provider Authentication Failed**
   - Verify API keys in `.env`
   - Check provider status at `/v1/healthz`
   - Review provider configuration

3. **Asset Not Found**
   - Check model paths in asset configuration
   - Verify file permissions
   - Review asset resolver logs

### Logs

Logs are written to:
- Console (stdout)
- `backend.log` file

Adjust log level in `main.py` for debugging.

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run code quality checks
5. Submit pull request

## License

MIT License - see LICENSE file for details.
