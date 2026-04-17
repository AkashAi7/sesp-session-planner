# SESP v0.1.0 — Initial release

First public release of the **Solution Engineer Session Planner** VS Code extension.

## Highlights

- VS Code Chat participant **`@sesp`** with slash commands:
  - `/hackathon` — full hackathon plan
  - `/lab` — step-by-step infra lab (how-to)
  - `/challenge` — goal-oriented participant challenge (what-to-do)
  - `/onboarding` — prerequisite checklist + setup scripts + readiness validator
  - `/gatekeeper` — validation script / GitHub Action per challenge
  - `/architecture` — mix-and-match Azure + GitHub architecture with Mermaid diagram
- Built on the **GitHub Copilot SDK** (`@github/copilot-sdk`) with custom tools:
  - `recommend_architecture`, `generate_gatekeeper`, `generate_onboarding_plan`
- Streaming responses, optional **GitHub MCP server** grounding, and VS Code
  Language Model API fallback when the Copilot CLI isn't installed.
- Command palette entries: `SESP: Generate Full Session Plan / Lab / Gatekeeper`.
- Headless smoke runner: `npm run smoke -- "<prompt>"`.

## Install

1. Download `sesp-session-planner-0.1.0.vsix` from the assets below.
2. In VS Code: **Extensions** view → `…` menu → **Install from VSIX…**
3. Ensure the [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) is installed and authenticated (`copilot --version`).
4. Open Chat and try: `@sesp /hackathon 4-hour AKS + GitHub Actions modernization with a GHAS challenge`.

## Requirements

- VS Code 1.95+
- GitHub Copilot subscription + GitHub Copilot Chat extension
- GitHub Copilot CLI (for the SDK path); or set `sesp.useCopilotSdk=false` to use the VS Code LM API fallback

## Known notes

- The VSIX bundles `@github/copilot-sdk` and `vscode-jsonrpc`; future releases
  will use `esbuild` bundling to shrink package size (tracked as a follow-up).
