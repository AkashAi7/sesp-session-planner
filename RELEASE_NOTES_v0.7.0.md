# Forge v0.7.0 — Holistic planning coverage, safer execution, and broader input flexibility

This release expands Forge's planning coverage, hardens generation reliability,
and makes the planner more adaptable to real customer engagements.

## What changed

- Added **WorkIQ prior-material discovery guidance** so Forge now asks for related
  presentations, slide decks, shared documents, recordings, and demo artifacts
  when WorkIQ is enabled.
- Added a new **`fetch_workiq_materials`** tool contract so the model can request
  structured prior-material context by customer, topic, and file type.
- Added **brief validation** for common contradictions before generation starts,
  including FedRAMP / Azure Gov with personal sandbox tenants, gatekeeper-only
  requests with nothing to validate, and missing required lab/session components.
- Added **custom technology input** in the planner so engagements are no longer
  limited to the predefined Azure / GitHub / AI-Data chip lists.
- Added **generation timeout protection** with a configurable `sesp.sdkTimeoutMs`
  setting and a **Cancel** action in the results panel so long-running or stuck
  SDK requests can be stopped safely.
- Improved **history entry lifecycle tracking** so generated plans are recorded as
  `pending`, `complete`, or `failed` instead of leaving orphaned entries behind.
- Refactored the **system prompt** into composable sections (`role`,
  `capabilities`, `format`, `style`) for safer iteration and better regression
  coverage.
- Hardened **artifact extraction** to handle nested fenced code blocks more
  reliably when materializing generated files.
- Hardened **customer repository creation** by checking for `gh`, reusing the
  user's existing git identity when available, and cleaning up staging folders on
  failure.
- Expanded release confidence with **comprehensive automated tests** covering
  tools, validation, prompt composition, artifact edge cases, and history store
  behavior.
- Included the existing **SDK loader compatibility improvement** in the release
  changeset so packaged builds continue to load the Copilot SDK reliably.

## Quality and validation

- Verified the release with:
  - `npm run compile`
  - `npm test`
  - `npm run package`

## Install

1. Download `sesp-session-planner-0.7.0.vsix` from the assets below.
2. **Extensions** → `...` → **Install from VSIX...**
3. Reload window.
