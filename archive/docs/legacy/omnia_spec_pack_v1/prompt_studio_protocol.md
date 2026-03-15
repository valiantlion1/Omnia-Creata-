# Prompt Studio Protocol (BroadcastChannel: "omnia")

## Messages from Prompt Studio -> Main
- `PROMPT_SET`: { prompt: string }
- `PROMPT_APPEND`: { text: string }
- `NEG_SET`: { neg: string }
- `PRESETS_APPLY`: { ids: string[], mode?: "append" | "params" | "tag-only" }
- `FOCUS_MAIN`: {}  // request focus to main window

## Messages from Main -> Prompt Studio
- `STATE_SNAPSHOT`: { model, styles, selectedPresets, params }
- `ACK`: { of: string }
- `ERROR`: { message: string }

## Heartbeat
- `PING` / `PONG` every 10s. If 3 missed -> disconnected UI state.

## Security
- Validate `origin` and ignore unknown message types.
