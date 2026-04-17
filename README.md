# Solution Engineer Session Planner (SESP) — VS Code Extension

A GitHub Copilot-powered VS Code extension that helps Microsoft/GitHub Solution
Engineers rapidly plan hackathons, labs, sessions, and technical challenges
across the **Azure** and **GitHub** product suites.

It registers a Chat participant **`@sesp`** that mixes and matches Azure + GitHub
technologies, produces end-to-end event plans, step-by-step infra labs,
goal-oriented challenges, onboarding scripts, and gatekeeper validators.

Under the hood it uses the **[GitHub Copilot SDK](https://www.npmjs.com/package/@github/copilot-sdk)**
(`@github/copilot-sdk`) so you get the same agentic runtime that powers the
Copilot CLI — custom tools, streaming, MCP servers, session persistence — with a
graceful fallback to VS Code's built-in Language Model API.

## Features

- Chat participant **`@sesp`** with slash commands:
  - `/hackathon` — full hackathon plan (overview, architecture, onboarding, modules, gatekeepers)
  - `/lab` — detailed infra lab (how-to) with CLI and IaC snippets
  - `/challenge` — participant challenge (what-to-do) with hints and success criteria
  - `/onboarding` — prerequisite checklist + setup scripts + readiness validator
  - `/gatekeeper` — validation script / GitHub Action per challenge
  - `/architecture` — mix-and-match Azure + GitHub architecture with Mermaid diagram
- Custom Copilot SDK tools: `recommend_architecture`, `generate_gatekeeper`, `generate_onboarding_plan`
- Optional GitHub MCP server integration for repo/issue/PR grounding
- Command palette entries: `SESP: Generate Full Session Plan / Lab / Gatekeeper`

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

Press `F5` in VS Code to launch the Extension Development Host, then in the
Chat view type:

```
@sesp /hackathon Design a 4-hour hackathon for migrating a monolith to AKS with GitHub Actions and GHAS.
```

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `sesp.model` | `gpt-4.1` | Model used by the Copilot SDK session. |
| `sesp.useCopilotSdk` | `true` | Route through `@github/copilot-sdk`. If `false`, uses VS Code Language Model API. |
| `sesp.cliPath` | `""` | Optional path to the Copilot CLI executable. |
| `sesp.cliUrl` | `""` | Connect to an already-running `copilot --server` instance (e.g., `localhost:4321`). |
| `sesp.enableGithubMcp` | `true` | Attach GitHub's hosted MCP server to the session. |

## Architecture

```
VS Code Chat (@sesp)
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

- `@sesp /hackathon 4-hour hackathon migrating monolith to AKS with GitHub Actions; include a GHAS challenge`
- `@sesp /lab Set up Azure DevOps alongside a GitHub repository in the customer's tenant with OIDC federation`
- `@sesp /architecture DevSecOps Fast Track with GitHub Copilot, GitHub Actions, and Azure Container Apps`
- `@sesp /gatekeeper Verify participant has deployed an AKS cluster with ingress + HTTPS and a green Actions run on main`

## Packaging

```powershell
npm run package   # produces sesp-session-planner-<version>.vsix
```

## License

MIT
