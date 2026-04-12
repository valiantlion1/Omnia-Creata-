# OmniaCreata Studio Remaining Work

## Current accepted product shape
- Public landing at `/`
- App shell with fixed left sidebar
- Main app routes:
  - `Explore`
  - `Create`
  - `Chat`
  - `My Images`
  - `Collections`
  - `Favorites`
  - `Trash`
  - `Styles`
  - `Learn`
  - `My Account`
  - `Subscription`
  - `Settings`
- `Chat` and `Create` stay separate
- Sidebar is the main navigation hub
- `Characters` stays removed

## Highest priority remaining work

### 1. Public entry surfaces
- Redesign the public landing page into a richer, more premium marketing surface
- Add dedicated `Login` screen
- Add dedicated `Sign up` screen
- Add better CTA flow from landing into sign-in, sign-up, and guest/free entry
- Add footer documentation links on the public site:
  - FAQ
  - Terms
  - Privacy
  - Usage policy

### 2. Auth and onboarding
- Replace temporary demo-entry-only flow with real auth-ready screens
- Add first-use onboarding hints for signed-in users
- Add optional quick-start onboarding:
  - create first project
  - start first chat
  - open create
- Keep tips dismissible and controllable from settings

### 3. Sidebar system
- Expand the sidebar’s submenu pattern cleanly across the product
- Keep main row navigation and secondary submenu actions clearly separated
- Add submenu logic where it makes sense:
  - `Chat` -> `New chat`, `History`
  - `Create` -> `Image`, `Edit`, `Inpaint`
  - `Settings` -> quick summary panel + full settings entry
- Decide whether `Library` becomes one expandable group or stays flat
- Continue reducing visual noise in separators, padding, and hover states

### 4. Explore
- Turn Explore into a more premium discovery surface
- Improve visual feed hierarchy
- Add better hover interactions on community-style cards
- Add stronger category/filter behavior
- Make Explore the clearest “main app home”

### 5. Create
- Continue shrinking visual noise and oversized spacing
- Add clearer image/edit/inpaint modes
- Add upload-aware state
- Add better stage/output controls
- Make project context more elegant when entering from collections/projects

### 6. Chat
- Keep chat full-page and clean
- Add image/file-aware reasoning flow
- Add better message attachment previews
- Add generated-image preview directly inside the conversation
- Add stronger handoff from chat to create

## Backend and product backbone

### 7. Chat backend
- Upgrade chat from basic conversation persistence into a richer assistant workflow
- Add image-aware message analysis
- Add structured suggested actions:
  - open in create
  - convert to stronger prompt
  - inpaint request
  - edit request
- Add attachment lifecycle beyond local preview

### 8. Create and generation backend
- Connect create modes more explicitly to generation intent
- Improve generation job handling and handoff between routes
- Add inpaint/edit-ready backend contracts
- Keep local owner mode + ComfyUI stable

### 9. Local model registry
- Keep brand-friendly display names for local models
- Preserve source metadata internally:
  - original model id
  - file path
  - source/provider
  - license reference
- Add better owner-facing model management UI later

### 10. Health and stability
- Keep `/v1/healthz` fast and reliable
- Continue improving auth consistency around private endpoints
- Watch for UI regressions caused by old flows or route leaks

## Library and organization

### 11. My Images / Collections / Favorites / Trash
- Continue refining hover actions
- Add stronger empty states
- Improve selection and bulk actions later
- Keep trash/restore clean and low-friction
- Decide whether collections need inline rename/delete/share controls

### 12. Project system
- Improve project detail layout
- Add clearer bridge between project, create, chat, and library
- Keep old create-canvas behavior fully dead

## Documentation and trust surfaces

### 13. Docs
- Expand current docs page into real content sections:
  - FAQ
  - Terms
  - Privacy
  - Usage policy
- Add support/contact/help language later if needed

### 14. Billing and account
- Improve `Subscription` page into a clearer plan and usage surface
- Make `My Account` and `Settings` responsibilities more distinct
- Add cleaner usage history and billing summary later

## Deployment and infrastructure

### 15. Near-term deployment shape
- Frontend: Vercel
- Auth, DB, storage: Supabase
- Local generation and testing: owner mode + ComfyUI
- Public GPU generation comes later

## Cleanup still worth doing
- Remove any remaining dead imports, old comments, and leftover copy
- Continue reducing oversized cards and unnecessary text
- Audit all routes to ensure no legacy screens can re-enter the app flow

## Suggested execution order
1. Landing + Login + Sign up
2. Sidebar system refinement
3. Explore polish
4. Chat attachment/image-aware flow
5. Create mode refinement
6. Library and project refinement
7. Docs + public trust surfaces
8. Billing/account clarity
9. Deployment wiring
