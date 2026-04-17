# Forge v0.4.0 — Customer Engagement Studio

The Solution Engineer Session Planner has been rebranded to **Forge** and
reworked around how SEs actually deliver customer engagements.

## Rebrand

- **Forge — Customer Engagement Studio** is the new display name.
- Chat participant is now `@forge`.
- Activity-bar title, status-bar item (`$(flame) Forge`), and output channel all
  say Forge. Extension IDs (`sesp.*`) are preserved so existing settings and
  keybindings keep working.

## Sharper deliverable definitions

- **Labs** are now strictly end-to-end: prerequisites / role assignments →
  provisioning (real `az`, `azd`, `bicep`, `terraform` commands with real
  parameter names) → app deploy → running the gatekeeper and interpreting its
  output → step-by-step troubleshooting → cleanup. No black boxes; if step N
  depends on step N-1's output, it's captured and reused explicitly.
- **Challenges** now require a **Definition of Done / Acceptance Criteria**
  section per challenge — the objective signals that prove completion (resource
  states, HTTP codes, metric values, Actions results, security findings closed,
  …) — plus three-tier progressive hints. The full solution is never revealed.
- **Gatekeepers** map 1:1 to a challenge's acceptance criteria and emit
  machine-parsable PASS/FAIL plus a human summary.

## Tenant semantics clarified

Target environment is now a capsule-shaped segmented control with clear hints:

- **Customer tenant** — IaC and commands are generated assuming they run inside
  the customer's own subscription / org. Subscription, tenant and org IDs are
  parameterized placeholders; every required customer consent or role
  assignment is called out.
- **Microsoft tenant (SE internal testing)** — SE dry-run in a Microsoft
  sandbox. Short-lived RGs + cleanup scripts; assumes Owner.
- **Personal sandbox** — SE dry-run in a personal account. Free tiers and
  low-cost SKUs; flags anything requiring a paid SKU.

## UI polish

- Removed the misleading **event date** field.
- Selected chips now use a high-contrast `button` background with a leading ✓
  and bold weight — readable in both light and dark themes.
- Deliverable cards highlight with a full button-coloured border and tinted
  background when selected.
- Section pills turn green (`ok`) once the section is valid.

## Auto-save to workspace

- `sesp.autoSaveToWorkspace` (default **on**) — when a generation completes,
  Forge writes:
  - `./engagements/<customer-slug>/<timestamp>-engagement.md` (the materials)
  - `./engagements/<customer-slug>/<timestamp>-brief.json` (the raw brief, for
    reproducibility)
- The results panel shows a banner with the saved path and a **Reveal in
  Explorer** link.

## Customer-sharable repository

New **Create customer repo** action (button on the results panel and context
menu on history entries). With SE consent, it uses `gh` to:

1. Ask for a repo name (default `<customer-slug>-engagement`), visibility
   (`sesp.customerRepoDefaultVisibility`, defaulted to **private**), and owner
   (user or org).
2. Stage the materials under
   `./engagements/<customer-slug>/repo/` with a customer-friendly README, the
   full `ENGAGEMENT.md`, and a sensible `.gitignore`.
3. `git init` → commit → `gh repo create --push`.
4. Offer to open the new repo URL in the browser.

## Install

1. Download `sesp-session-planner-0.4.0.vsix` from the assets below.
2. **Extensions** → `…` → **Install from VSIX…**
3. Click the **Forge** icon in the activity bar.
