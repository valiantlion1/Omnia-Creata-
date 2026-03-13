Omnia Spec Pack v1
==================
Files:
 - presets.schema.json      -> JSON Schema for presets
 - presets.sample.json      -> 10+ sample presets (incl. NSFW placeholders)
 - themes.json              -> Multiple theme variables
 - panel_config.json        -> Left/Center/Right panel order + visibility
 - shortcuts.json           -> Keyboard shortcuts mapping
 - prompt_studio_protocol.md-> Message types for the "🧠 Prompt Studio" pop-out
 - nsfw_policy.md           -> NSFW toggle & consent gate notes

Suggested placement:
 - Put JSON files under:  public/config/
 - Put *.md anywhere you like; docs for implementation.

Wiring (later in code):
 - Load JSONs on app start and hydrate context.
 - Honor "safe_gate" to hide/show NSFW presets based on toggle.
 - Use BroadcastChannel('omnia') for Prompt Studio window communication.
