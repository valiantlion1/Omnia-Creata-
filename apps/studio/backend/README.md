# OmniaCreata Backend

AI Image Generation Platform Backend with Multi-Provider Support

## Features

- **Multi-Provider Architecture**: multiple chat and image providers remain available, while protected-beta proof stays intentionally narrower than the full provider catalog
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

### Local always-on helper

Studio now includes a local stack launcher at `apps/studio/ops/start-studio-local.ps1`.

- it starts the backend on `127.0.0.1:8000`
- it starts the frontend on `127.0.0.1:5173`
- it writes runtime logs outside the repo under:
  - Windows: `%LOCALAPPDATA%\OmniaCreata\Studio\logs`
  - fallback: `~/.omnia_creata/studio/logs`
- durable SQLite metadata now defaults outside the repo too:
  - Windows: `%LOCALAPPDATA%\OmniaCreata\Studio\data\studio-state.sqlite3`
  - fallback: `~/.omnia_creata/studio/data/studio-state.sqlite3`
- Studio will bootstrap that runtime SQLite store from the legacy workspace SQLite or JSON snapshot the first time it starts, so existing local state is not silently lost

To register it as a Windows logon task:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/ops/install-studio-startup-task.ps1
```

`start-studio-local.ps1` now defaults to stable always-on backend mode.

If you explicitly want backend hot reload while actively coding, run:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/ops/start-studio-local.ps1 -HotReload
```

## Deployment Pack

Studio now includes a first bounded deployment pack for protected staging:

- [deploy/README.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/README.md)
- [deploy/docker-compose.staging.yml](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/docker-compose.staging.yml)
- [backend/Dockerfile](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/Dockerfile)
- [web/Dockerfile](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/web/Dockerfile)

This pack is meant to move Studio away from single-PC dependence and toward:

- postgres metadata authority
- redis-backed split runtime
- backend + worker topology
- same-origin web-to-api staging behavior

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
- owner-only `/v1/healthz/detail` also reports:
  - `data_authority.backend`
  - `data_authority.authority_mode`
  - `data_authority.path`
  - `data_authority.bootstrap_source`
  - `data_authority.record_count`
  - `provider_smoke.recorded_at`
  - `provider_smoke.summary`
  - `provider_truth.status`
  - `provider_truth.mix.status`
  - `provider_truth.economics.status`
  - `launch_readiness.status`
  - `launch_readiness.checks`
  - `ai_control_plane`
- Generation job lifecycle uses:
  - `queued`
  - `running`
  - `succeeded`
  - `failed`
  - `retryable_failed`
  - `cancelled`
  - `timed_out`

### State Language

Studio now uses two different state vocabularies on purpose:

- signed-in/library-facing state contract:
  - `queued`
  - `running`
  - `ready`
  - `failed`
  - `blocked`
- internal generation-worker lifecycle:
  - `queued`
  - `running`
  - `succeeded`
  - `failed`
  - `retryable_failed`
  - `cancelled`
  - `timed_out`

The second list is richer because workers and recovery logic need more detail.
The first list is the stable product-facing contract and should be the one that UI and product docs speak by default.

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

Studio no longer treats local ComfyUI as an active runtime lane.

Current provider/runtime truth is controlled by environment variables such as:

```env
CHAT_PRIMARY_PROVIDER=openrouter
CHAT_FALLBACK_PROVIDER=openai
PROTECTED_BETA_CHAT_PROVIDER=openai
PROTECTED_BETA_IMAGE_PROVIDER=openai
OPENAI_IMAGE_DRAFT_MODEL=gpt-image-1-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
GENERATION_PROVIDER_STRATEGY=balanced
ENABLE_POLLINATIONS=true
FAL_API_KEY=
RUNWARE_API_KEY=
```

### Generation Configuration

Generation behavior is primarily shaped by:

```env
GENERATION_RUNTIME_MODE=all
REDIS_URL=
MAX_CONCURRENT_GENERATIONS=3
MAX_QUEUE_SIZE=100
GENERATION_CLAIM_LEASE_SECONDS=60
GENERATION_MAINTENANCE_INTERVAL_SECONDS=10
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
│   └── env.py           # Environment validation and runtime selection
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
python scripts/provider_smoke.py --provider all --surface all --profile refresh
```

Use `--provider all` to run the whole suite and `--skip-failure-probe` if you only want successful generation checks.

Each smoke run now also writes the latest report to the external Studio runtime directory:

- Windows: `%LOCALAPPDATA%\OmniaCreata\Studio\reports\provider-smoke-latest.json`

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

1. Create or extend the provider adapter in `studio_platform/providers.py`
2. Implement real health and generation behavior
3. Wire rollout and capability policy through `ProviderRegistry`
4. Lock the behavior with regression tests before updating docs/ledger

### Adding New Presets

1. Update the backend generation/prompt policy
2. Keep Create and Chat execution plans aligned
3. Lock meaningful changes with regression coverage and release bookkeeping

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
- backend console/stdout
- rotating backend runtime logs outside the repo:
  - Windows default: `%LOCALAPPDATA%\OmniaCreata\Studio\logs`
  - fallback default: `~/.omnia_creata/studio/logs`
- launcher stdout/stderr logs for backend/frontend in the same external runtime log directory

You can override the default locations with:
- `STUDIO_RUNTIME_ROOT`
- `STUDIO_LOG_DIRECTORY`

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Run code quality checks
5. Submit pull request

## License

MIT License - see LICENSE file for details.
