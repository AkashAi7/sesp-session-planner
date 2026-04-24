# Forge — Customer Engagement Studio

A GitHub Copilot-powered VS Code extension that functions as a full **engagement workbench** for
Microsoft/GitHub Solution Engineers and CSAs. Brief a customer once and generate a complete
engagement package — or jump straight to a single artifact in seconds.

It registers a Chat participant **`@forge`** and a guided **Forge Planner** sidebar panel, producing
end-to-end hackathon plans, step-by-step infra labs, goal-oriented challenges, onboarding scripts,
session decks, architecture reviews, and gatekeeper validators across the **Azure** and **GitHub** product suites.

Under the hood it uses the **[GitHub Copilot SDK](https://www.npmjs.com/package/@github/copilot-sdk)**
(`@github/copilot-sdk`) so you get the same agentic runtime that powers the
Copilot CLI — custom tools, streaming, MCP servers, session persistence — with a
graceful fallback to VS Code's built-in Language Model API.

## Entry points

### Zero friction — Quick Generate
`Forge: Quick Generate` from the Command Palette (`⌘/Ctrl+Shift+P`) is the fastest way to generate a single
artifact. Pick an artifact type (Lab, Hackathon, Architecture, …), describe your topic, name the customer,
and Forge generates directly into the Results panel.

### Template Library
`Forge: Use Template` from the Command Palette (or the **Templates** button in the Planner footer) starts you
from a pre-built engagement template (AKS Workshop, Azure OpenAI RAG Hackathon, GHAS Enablement, etc.).
Add a customer name and Forge fills in the full structured brief automatically.

### 5-step guided wizard (multi-deliverable packages)
Click the **Forge** icon in the activity bar to open the Planner. Walk through the brief — engagement
goal, readiness, facilitation, delivery scope — then click **Generate package**. Ideal when you want a
coordinated set of deliverables (lab + challenge + gatekeeper + session) for a single engagement.

### Chat slash commands (ad-hoc)
```
@forge /hackathon Design a 4-hour hackathon for migrating a monolith to AKS with GitHub Actions and GHAS.
@forge /lab Set up Azure DevOps alongside a GitHub repository with OIDC federation.
@forge /session 20-slide intro to Azure OpenAI for a financial services audience.
```

Available commands: `/hackathon`, `/lab`, `/challenge`, `/onboarding`, `/gatekeeper`, `/architecture`, `/session`

## Features

- **Quick Generate** — single artifact in &lt;60 s with no wizard
- **Template Library** — 5 pre-built engagement blueprints to start from
- **Forge Planner** — 5-step brief wizard for coordinated multi-deliverable packages
- **Chat participant `@forge`** with slash commands for ad-hoc generation
- **Auto-save** — packages land in `./engagements/<customer>/` in the workspace with a file count banner
- **forge-file packaging** — AI outputs use structured `<forge-file path="...">` tags for reliable file extraction
- Custom Copilot SDK tools: `recommend_architecture`, `generate_gatekeeper`, `generate_onboarding_plan`
- Optional GitHub MCP server integration for repo/issue/PR grounding

## Prerequisites

1. **VS Code** 1.95+
2. **GitHub Copilot** subscription and **GitHub Copilot Chat** extension installed
3. **GitHub Copilot CLI** installed and authenticated
   (`copilot --version` must work) — required for the SDK path.
   See: <https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli>
4. Node.js 18+ (for local development)

If the Copilot CLI is not available, set `sesp.useCopilotSdk` to `false` and the
extension will use the VS Code Language Model API instead.

## Getting started (development)

```powershell
npm install
npm run compile
```

Press `F5` in VS Code to launch the Extension Development Host.

## Configuration

> **Finding settings:** Open VS Code Settings (`Ctrl+,`) and search **Forge** — all settings appear under the Forge section.

| Setting | Default | Description |
| --- | --- | --- |
| `sesp.model` | `gpt-4.1` | Model used by the Copilot SDK session. |
| `sesp.useCopilotSdk` | `true` | Route through `@github/copilot-sdk`. If `false`, uses VS Code Language Model API. |
| `sesp.cliPath` | `""` | Optional path to the Copilot CLI executable. |
| `sesp.cliUrl` | `""` | Connect to an already-running `copilot --server` instance (e.g., `localhost:4321`). |
| `sesp.enableGithubMcp` | `true` | Attach GitHub's hosted MCP server to the session. |
| `sesp.enableWorkIqMcp` | `false` | Attach WorkIQ MCP for customer conversation insights (shows checkbox in Planner when enabled). |
| `sesp.autoSaveToWorkspace` | `true` | Auto-save generated packages under `./engagements/<customer>/` in the workspace. |

## Architecture

```
VS Code Chat (@forge)
      │
      ▼
ChatRequestHandler (src/extension.ts)
      │
      ├──► SespSession (src/sespSession.ts) ──► @github/copilot-sdk ──► Copilot CLI
      │           • SESP system prompt
      │           • Custom tools (recommend_architecture, generate_gatekeeper, …)
      │           • Optional GitHub MCP server
      │
      └──► runWithVsCodeLm (fallback) ──► vscode.lm
```

## Example prompts

- `@forge /hackathon 4-hour hackathon migrating monolith to AKS with GitHub Actions; include a GHAS challenge`
- `@forge /lab Set up Azure DevOps alongside a GitHub repository in the customer's tenant with OIDC federation`
- `@forge /architecture DevSecOps Fast Track with GitHub Copilot, GitHub Actions, and Azure Container Apps`
- `@forge /gatekeeper Verify participant has deployed an AKS cluster with ingress + HTTPS and a green Actions run on main`

## Packaging

```powershell
npm run package   # produces sesp-session-planner-<version>.vsix
```

## License

MIT
