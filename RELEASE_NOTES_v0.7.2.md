# Forge v0.7.2 — Usability polish and clarity improvements

This patch release improves discoverability, feedback, and field clarity across
the Forge planner and chat interface.

## What changed

- **`@forge` identity** — All documentation and prompts now consistently use
  `@forge` as the chat participant handle (previously mixed `@sesp` / `@forge`).
- **Required field indicators** — Key brief fields (customer name, context,
  definition of success, readiness, facilitator/participant profiles) now show a
  `*` marker so Solution Engineers know what must be filled before generating.
- **SDK error toasts** — When the Copilot SDK is unavailable, Forge now surfaces
  a VS Code warning toast with an **Open Settings** button instead of silently
  writing error text into generated documents.
- **Context-sensitive "Open Forge Planner" button** — The button is no longer
  shown after slash commands that already have enough context; it only appears on
  the empty-state / general response path.
- **WorkIQ toggle gated by config** — The WorkIQ MCP toggle in the planner wizard
  is hidden unless `sesp.enableWorkIqMcp` is enabled, reducing noise for users
  who don't use that integration.
- **History near-capacity warning** — Forge now warns when the history store
  reaches 45 of 50 entries so users can export before the oldest entries are
  automatically dropped.
- **Generating state on submit** — The submit button is disabled with a spinner
  while generation is in progress, preventing double-submits.
- **Improved empty-state chat response** — Invoking `@forge` with no command now
  lists all available slash commands with short descriptions.
- **No-workspace notification** — When no folder is open, Forge shows an info
  toast with an **Open Folder** action instead of a bare error string.

## Quality and validation

- Verified with:
  - `npm run compile`
  - `npm test` (61/61 tests passing)
  - `npm run package`

## Install

1. Download `sesp-session-planner-0.7.2.vsix` from the assets below.
2. **Extensions** → `...` → **Install from VSIX...**
3. Reload window.
