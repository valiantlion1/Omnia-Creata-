# OmniaCreata Frontend

This is the React + TypeScript + Vite frontend for OmniaCreata.

## Features (UI Skeleton)
- Pages
  - pages/index (Dashboard)
- Components
  - ControlsPanel (model/prompt/settings)
  - PreviewPanel (live preview + gallery)
  - PromptStudio (Google AI Studio chat + prompt variations)
  - QueuePanel (job queue)
  - ModelManager (list/download)
  - Topbar + Sidebar + ThemeToggle
- Lib
  - comfyClient (local ComfyUI REST requests)
  - googleStudioClient (chat/prompt single endpoint)
  - store (state/preset management)
- Styles
  - styles/theme.css (CSS variables for light/dark)

## Getting Started
1. Install dependencies
   npm install

2. Development
   npm run dev

3. Environment
- Create a .env file in this folder based on .env.example
- Required keys:
  - GOOGLE_API_KEY (only used via backend or if proxied)
  - COMFY_BASE_URL (e.g., http://127.0.0.1:8188)
- For Vite (frontend) direct usage, also set:
  - VITE_GOOGLE_API_KEY
  - VITE_COMFY_BASE_URL

## Notes
- The current implementation uses placeholder clients. Real API calls should be proxied via a backend for security.
- TailwindCSS and PostCSS are configured; you can adjust theme variables in styles/theme.css.
