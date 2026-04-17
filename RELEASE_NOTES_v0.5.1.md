# Forge v0.5.1 — Full technology coverage + micro-step labs

Fixes two reported issues with v0.5.0 lab output:

## Problem 1 — Only one technology getting labs

Previously, when you selected multiple technologies (e.g. AKS + GitHub Actions
+ Azure OpenAI), the model would often concentrate all of the labs on the
first / most prominent one.

v0.5.1 adds a **CRITICAL technology coverage rule** to the prompt whenever
2 or more technologies are in scope:

- A **Coverage matrix** table is emitted before the labs: `Lab # | Title |
  Primary technology | Secondary technologies | Learning outcome`.
- Every selected technology MUST appear as the **Primary technology** for at
  least one lab.
- If you asked for 3 labs but selected 5 technologies, the model is
  instructed to **override your count** and produce at least one lab per
  technology plus an integration lab, stating explicitly why it scaled up.

## Problem 2 — Labs not detailed enough

The Labs spec now enforces a stricter structure:

- Each section is broken into **numbered micro-steps** (1.1, 1.2, 1.3 …)
  with: purpose → command block → expected output → "why this works" note.
  No unlabeled walls of code.
- Each lab MUST include a dedicated **Hands-on exercises** block (at least 2
  exercises, embedded mid-lab not at the end) — one-line task, starter
  snippet, expected end state, validation command.
- Each lab gets a **Stretch goal** with acceptance criteria but no
  walkthrough.
- Added a **Prerequisites check** step up front (commands printing PASS/FAIL).
- Troubleshooting table is now required to have **≥5 rows** drawn from real
  failure modes of that scenario.
- Placeholders like `<your-resource-name>` are explicitly banned mid-lab —
  everything must be resolved via `$VAR=$(…)` / `$var = (…)` capture.

## Install

1. Download `sesp-session-planner-0.5.1.vsix` from the assets below.
2. **Extensions** → `…` → **Install from VSIX…**
3. Reload window.
