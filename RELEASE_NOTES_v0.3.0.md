# SESP v0.3.0 — Customer-brief driven UI

This release reworks the extension around a **customer-brief driven UI**. No
more CLI-style slash commands as the primary path: you fill in who the customer
is, what context and constraints apply, which technologies are in scope, and
what deliverables you need — SESP produces everything in one shot.

## New: Customer-brief Planner

Activity bar → **SESP** → **Planner**. Collapsible sections for:

1. **Customer** — name, industry, context (strategic goals, pain points, stack).
2. **Constraints** — free-text + compliance chips (GDPR, HIPAA, PCI-DSS, SOC 2,
   ISO 27001, FedRAMP, Azure Gov, EU Data Boundary), tenant, audience, skill
   level, duration, event date.
3. **Technologies** — Azure / GitHub / AI+Data chip pickers.
4. **Deliverables** — multi-select: Hackathon, Labs, Challenges, **Session
   material**, Architecture, Onboarding, Gatekeepers. Plus an emphasis selector
   (balanced / hands-on / architecture / security-first / AI-first /
   cost-optimized) and model picker.

Form state persists across webview hides. Validation surfaces inline.

## New: Results panel

A **proper document panel** (not the chat sidebar) that streams the full
response with live Markdown rendering, a **Save to workspace** button, **Copy**,
and **Open as `.md`**. Opens beside the editor via `ViewColumn.Beside`.

## New: Brief prompt builder

`src/briefPrompt.ts` assembles the brief into a structured prompt with a single
instruction: "Produce **all** of the following, each as its own top-level
section". SESP then tailors every section to the customer context and
compliance posture.

## History v2

- Stores the entire **customer brief** per entry (and the rendered markdown).
- Click an entry to re-open its results panel (restored from cache, no re-gen).
- Right-click actions to **Rerun** (forces a re-generation) or **Delete**.
- Per-deliverable icons in the tree.

## Other

- `SespSession.runTo(...)` and `runWithVsCodeLmTo(...)` accept a generic sink,
  so the same pipeline powers the chat participant and the results panel.
- Quick Start wizard updated to create a brief (name → context → pick
  deliverables).
- Status bar item `$(rocket) SESP` still opens the planner.
- Chat participant `@sesp` remains for ad-hoc prompts and slash commands.

## Install

1. Download `sesp-session-planner-0.3.0.vsix` from the assets below.
2. **Extensions** → `…` → **Install from VSIX…**
3. Click the **SESP** icon in the activity bar.
