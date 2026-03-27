# Studio Local Owner Mode

This is the first private-owner path for OmniaCreata Studio.

## What it does

- Adds a local-only owner login path at `POST /v1/auth/local-owner-login`
- Unlocks owner-local mode in the Studio UI
- Reveals local checkpoints from your PC inside the Create canvas
- Routes selected local models through ComfyUI instead of the cloud path

## Default local runtime assumptions

- ComfyUI URL: `http://127.0.0.1:8188`
- Local model directory: `C:\AI\models\checkpoints`
- Backend URL: `http://127.0.0.1:8000`

The backend auto-discovers local checkpoints from:

1. `STUDIO_LOCAL_MODEL_DIR`
2. `C:\AI\models\checkpoints`
3. `C:\AI\ComfyUI_windows_portable\ComfyUI\models\checkpoints`
4. the bundled repo `ComfyUI/models/checkpoints`

## Optional environment variables

Use `apps/studio/backend/.env.example` as the source of truth.

- `STUDIO_ENABLE_LOCAL_PROVIDER=true`
- `STUDIO_LOCAL_COMFYUI_URL=http://127.0.0.1:8188`
- `STUDIO_LOCAL_COMFYUI_TIMEOUT=180`
- `STUDIO_LOCAL_MODEL_DIR=C:/AI/models/checkpoints`
- `STUDIO_OWNER_KEY=`
- `STUDIO_OWNER_EMAIL=owner@omnia.local`
- `STUDIO_OWNER_NAME=Omnia Owner`

If `STUDIO_OWNER_KEY` is empty, owner login is still restricted to local requests from the same machine.

## UI flow

1. Open Studio
2. Go to `Settings`
3. Activate `Local owner mode`
4. Open `Create Canvas`
5. Pick a model tagged `local`
6. Generate through your local ComfyUI runtime

## Current runtime behavior

- Local model discovery works even if ComfyUI is offline
- If ComfyUI is down, local generations fail as `retryable_failed`
- The error message explains that ComfyUI is unreachable instead of silently failing
- Local models cost `0` Studio credits

## Local stack helper

There is a helper script at:

- `apps/studio/ops/start-studio-local.ps1`

It attempts to start:

- bundled ComfyUI on port `8188`
- Studio backend on port `8000`

## Notes

- The bundled `ComfyUI/extra_model_paths.yaml` already points to `C:\AI\models`
- If you want another model directory, set `STUDIO_LOCAL_MODEL_DIR`
- This is the first owner-mode slice, not the final local orchestration system
