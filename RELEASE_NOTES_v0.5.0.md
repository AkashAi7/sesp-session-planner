# Forge v0.5.0 — Session options + exhaustive labs

Two direct responses to SE feedback:

## Sessions now have options

When you select **Session material** in the Planner, a new options panel
appears below the deliverables grid:

- **Components to include** (chips): Talk track with timing, Slide outline,
  Speaker notes, Demo script, Workshop exercises, Q&A prompts with model
  answers, Pre-reads, Post-session follow-up, Recording checklist.
- **Topics to cover** (free-text) — Forge uses these as the session skeleton.
- **Structure** — Theory-heavy / Demo-heavy / Hands-on / Mixed.
- **Slide count target**, **Intro depth** (assume expertise / light / full),
  **Format** (in-person / virtual / hybrid), **Interactivity** (low / medium /
  high).
- **Wrap-up / takeaways** — what attendees must be able to do after.

The prompt now enforces a **timing budget table** that sums to the declared
duration, a minute-by-minute talk track (narrative, not bullets), a numbered
slide outline, keystroke-level demo scripts, and model answers for expected
Q&A.

## Labs are now exhaustive by default

New **Lab options** panel (visible when Labs is selected):

- **Sections** (chips, all on by default): Prerequisites · Role assignments ·
  Provisioning · App deploy · Configuration · Gatekeeper run · Troubleshooting
  · Cleanup.
- **Number of labs**, **Script runtime** (mixed / bash / pwsh / GitHub Actions),
  **IaC flavor** (azd / Bicep / Terraform / ARM / none).
- **Depth** — Standard or **Exhaustive** (default).
- Toggles: per-step time estimates · cost summary & cleanup · security review ·
  expected output per command.

The prompt spec is strict: every prerequisite is verifiable with a PASS/FAIL
command; role assignments are spelled out with concrete `az role assignment
create …` and principal-ID capture; every cross-step value is piped via
`$VAR=$(…)` / `$var = (…)` so participants can copy-paste without guessing;
every lab ends with a gatekeeper run, a 3-column troubleshooting table, and a
handoff to the next lab. With Exhaustive depth, no phrases like "configure as
needed" are permitted.

## Install

1. Download `sesp-session-planner-0.5.0.vsix` from the assets below.
2. **Extensions** → `…` → **Install from VSIX…**
3. Click the **Forge** icon in the activity bar.
