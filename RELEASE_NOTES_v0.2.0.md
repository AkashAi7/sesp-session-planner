# SESP v0.2.0 — UI release

Big UI upgrade. The extension now has a full **activity-bar presence** and a
**guided planner**, so you don't have to type raw slash commands.

## New UI

- **Activity bar view container** with a dedicated **SESP** icon.
- **Planner webview** — a form-driven composer with:
  - mode picker (Hackathon / Lab / Challenge / Architecture / Onboarding / Gatekeeper)
  - title, scenario, duration, audience
  - Azure + GitHub technology chip selectors
  - emphasis selector (balanced / hands-on / architecture / security-first / AI-first)
  - one-click **Generate in Chat** that builds the full prompt and routes it to `@sesp`
- **History tree view** — every generation is saved to global state with a
  scoped icon per mode; inline actions to rerun or delete, title-bar actions to
  refresh or clear.
- **Status bar item** `$(rocket) SESP` for one-click access to the planner
  (toggle via `sesp.showStatusBarItem`).
- **Quick Start wizard** command (`SESP: Quick Start (wizard)`) — two Quick Pick
  steps for when you want something faster than the form.
- **View-title menus** and **context menus** wired on both views.

## New commands

- `SESP: Open Planner`
- `SESP: Quick Start (wizard)`
- `New Plan` (view-title action)
- `Open SESP Settings`
- `Clear History`, `Refresh History`
- `Rerun in Chat`, `Delete` (history item inline actions)

## New setting

- `sesp.showStatusBarItem` (boolean, default `true`)

## Under the hood

- `src/plannerView.ts` — themable webview with strict CSP + nonce.
- `src/history.ts` + `src/historyView.ts` — `TreeDataProvider` backed by
  `globalState` (capped at 50 entries).
- `src/extension.ts` refactored to wire everything through a single
  `sendToChat(payload)` pipeline so the form, wizard, and legacy commands all
  share the same prompt-assembly path.

## Install

1. Download `sesp-session-planner-0.2.0.vsix` from the assets below.
2. In VS Code: **Extensions** → `…` → **Install from VSIX…**
3. Click the SESP icon in the activity bar, or the rocket in the status bar.
