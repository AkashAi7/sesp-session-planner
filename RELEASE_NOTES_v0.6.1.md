# Forge v0.6.1 — Repo-ready workspace artifacts + deeper delivery detail

This release tightens the generation contract so Forge produces a workspace and
repository package that is much more concrete, file-oriented, and execution-ready.

## What changed

- Forge now asks for a **Workspace Blueprint** first, so the generated package is
  structured like a real customer-shareable workspace/repository instead of just
  a long markdown plan.
- The prompt now requires **explicit file artifacts** using concrete repo-relative
  paths such as `infra/main.bicep`, `.github/workflows/...`, `scripts/...`,
  `labs/...`, and `challenges/...`.
- The artifact packager now extracts those declared `File:` blocks and writes
  them as **real folders and files** in the saved/exported package.
- Labs are now pushed harder toward **keystroke-level detail** with numbered
  micro-steps, expected outputs, workspace handoff state, and stronger file-based
  packaging expectations.
- Challenges now require more explicit participant guidance:
  starting state, exact participant tasks, expected outputs/checkpoints,
  detailed acceptance criteria, validator invocation, and debrief notes.
- Package indexing and section mapping were extended so workspace/repository
  structure is preserved alongside the narrative plan.

## Quality and validation

- Added regression coverage for the new prompt contract and file-artifact
  extraction behavior.
- Verified the release with:
  - `npm run compile`
  - `npm test`
  - `npm run package`

## Install

1. Download `sesp-session-planner-0.6.1.vsix` from the assets below.
2. **Extensions** → `...` → **Install from VSIX...**
3. Reload window.