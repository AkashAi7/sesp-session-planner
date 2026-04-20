# Forge v0.6.0 — Multi-file engagement packages + insight-aware planning

This release upgrades Forge from a single markdown generator into a more
structured engagement-package workflow.

## What changed

- Generated plans are now packaged into a **multi-file output structure** with:
  `README.md`, `PACKAGE_INDEX.md`, `ENGAGEMENT.md`, customer brief docs,
  section-level docs, and per-lab / per-challenge files.
- Workspace auto-save now writes timestamped engagement folders under
  `engagements/<customer>/<timestamp>/...` instead of a single markdown file.
- Customer repo generation now stages the same multi-file package so the output
  is easier to review, share, and evolve.
- The planner now supports **conversation notes / insights** as first-class
  input so customer discovery context can directly shape the deliverables.
- Added optional **WorkIQ MCP** wiring through settings so Forge can pull
  conversation/customer insights when an MCP endpoint is available.
- Added **quick presets** for common engagement modes:
  workshop, briefing, hackathon, and POC.
- Prompting now enforces **stable section headings** so generated content can be
  reliably split into structured artifacts.

## Quality and validation

- Added Vitest coverage for the prompt builder and new artifact packager.
- Verified the release with:
  - `npm run compile`
  - `npm test`
  - `npm run package`

## Install

1. Download `sesp-session-planner-0.6.0.vsix` from the assets below.
2. **Extensions** → `...` → **Install from VSIX...**
3. Reload window.