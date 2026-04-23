# Forge v0.7.1 — Engagement wizard, readiness-first briefs, and cleaner packaging

This patch release turns Forge's planner into a guided engagement-design flow,
so Solution Engineers start from the customer motion instead of assembling a
dense deliverable checklist.

## What changed

- Replaced the previous single dense planner with a new **5-step wizard**:
  Engagement Goal, Readiness, Experience Design, Technical Scope, and Review.
- Made **engagement mode** the top-level planning primitive, with derived output
  packages for `workshop`, `hackathon`, `briefing`, `poc`, and `bootcamp`.
- Added required **definition of success** capture before generation, so Forge
  can anchor the package to a concrete customer outcome.
- Added first-class **readiness** capture for environment state, approvals,
  logistics, and blockers.
- Added explicit **facilitator / participant separation** so generated packages
  can support live delivery, not just content generation.
- Updated prompt composition, history summaries, and customer brief packaging to
  reflect the new engagement model instead of the retired preset-driven shape.
- Updated quick start and tests to align with the new brief contract.
- Includes the previously pushed **VSIX packaging cleanup**, so the downloadable
  release asset reflects the tighter `.vscodeignore` packaging rules already on
  `main`.

## Quality and validation

- Verified the release with:
  - `npm run compile`
  - `npm test`
  - `npm run package`

## Install

1. Download `sesp-session-planner-0.7.1.vsix` from the assets below.
2. **Extensions** → `...` → **Install from VSIX...**
3. Reload window.