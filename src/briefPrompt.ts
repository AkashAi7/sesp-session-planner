import type {
  CustomerBrief,
  Deliverable,
  LabOptions,
  SessionOptions
} from "./plannerView";

const LAB_COMPONENT_LABEL: Record<string, string> = {
  "prereqs": "Prerequisites (tools, subscriptions, quotas)",
  "role-assignments": "Role assignments (Entra ID / GitHub permissions)",
  "provisioning": "Provisioning (IaC)",
  "app-deploy": "Application deployment",
  "config": "Configuration (env vars, secrets, wiring)",
  "gatekeeper-run": "Gatekeeper run + interpretation",
  "troubleshooting": "Troubleshooting table (symptom → cause → fix)",
  "cleanup": "Cleanup + cost teardown"
};

const SESSION_COMPONENT_LABEL: Record<string, string> = {
  "talk-track": "Talk track with timing",
  "slide-outline": "Slide outline",
  "speaker-notes": "Speaker notes",
  "demo-script": "Demo script (keystroke-level)",
  "workshop": "Workshop exercises",
  "qa-prompts": "Expected Q&A prompts + model answers",
  "pre-reads": "Pre-reads / pre-work",
  "follow-up": "Post-session follow-up",
  "recording-checklist": "Recording / capture checklist"
};

const DELIVERABLE_LABEL: Record<Deliverable, string> = {
  hackathon:
    "Hackathon agenda (event schedule with modules, challenges, gatekeeper validations, and judging criteria).",
  lab: "(see 'Lab specification' block below for required contents)",
  challenge:
    "Goal-oriented participant challenges (what-to-do, not how-to). For EACH challenge produce: a one-line goal, the business rationale, the gatekeeper command(s) a participant must run to prove completion, a **Definition of Done / Acceptance Criteria** section listing every objective signal that marks the challenge as passed (specific resource states, HTTP codes, metric values, GitHub Actions results, security findings closed, etc.), expected time-to-solve, and progressive hints (3 tiers: nudge → targeted → near-solution). Do NOT reveal the full solution path; only the acceptance criteria.",
  session: "(see 'Session specification' block below for required contents)",
  onboarding:
    "Onboarding / 'Smooth Start' package: prerequisite checklist, automated setup scripts (idempotent), a readiness validator that prints a clear PASS/FAIL per prerequisite.",
  gatekeeper:
    "Gatekeeper validators — one script or GitHub Actions workflow per challenge that checks every item in that challenge's Acceptance Criteria and prints a machine-parsable PASS/FAIL plus a human-readable summary.",
  architecture:
    "Architecture: produce a Mermaid diagram mixing Azure + GitHub products, and justify every component (why this service, what alternatives were rejected, security posture, cost posture, failure modes)."
};

export function briefTitle(brief: CustomerBrief): string {
  const kinds = brief.deliverables.join(", ");
  return `${brief.customerName} — ${kinds || "engagement"}`;
}

export function buildBriefPrompt(brief: CustomerBrief): string {
  const lines: string[] = [];
  lines.push("# Customer Engagement Brief");
  lines.push("");
  lines.push(`**Customer:** ${brief.customerName}`);
  if (brief.industry) lines.push(`**Industry:** ${brief.industry}`);
  lines.push(`**Audience:** ${brief.audience} (${brief.skillLevel})`);
  lines.push(`**Duration:** ${brief.duration}`);
  lines.push(`**Emphasis:** ${brief.emphasis}`);
  lines.push("");
  lines.push("## Tenant / environment assumption");
  lines.push(tenantInstruction(brief.tenant));
  lines.push("");
  lines.push("## Customer context");
  lines.push(brief.customerContext);
  lines.push("");
  if (brief.constraints || brief.complianceTags.length) {
    lines.push("## Constraints");
    if (brief.constraints) lines.push(brief.constraints);
    if (brief.complianceTags.length)
      lines.push(`**Compliance:** ${brief.complianceTags.join(", ")}`);
    lines.push("");
  }
  lines.push("## Technologies in scope");
  lines.push(brief.technologies.map((t) => `- ${t}`).join("\n"));
  lines.push("");

  lines.push("## Required deliverables");
  lines.push(
    "Produce **all** of the following, each as its own top-level section with a clear `## ` heading. Every deliverable must be internally consistent with the others — the same resource names, regions, and identity model throughout."
  );
  lines.push("");
  for (const d of brief.deliverables)
    lines.push(`- **${titleFor(d)}** — ${DELIVERABLE_LABEL[d]}`);
  lines.push("");

  if (brief.deliverables.includes("lab")) {
    lines.push("## Lab specification (MUST follow when writing the Labs section)");
    lines.push(renderLabSpec(brief.labOptions));
    lines.push("");
  }
  if (brief.deliverables.includes("session")) {
    lines.push("## Session specification (MUST follow when writing the Session Material section)");
    lines.push(renderSessionSpec(brief.sessionOptions));
    lines.push("");
  }

  lines.push("## Output instructions");
  lines.push(
    "Be concrete. Use real commands, real resource names prefixed with an abbreviation of the customer name, current API versions, cost/latency trade-offs, and secure defaults (managed identity over keys, least privilege, private networking where feasible). Use Mermaid for diagrams. Keep each script in a single consistent runtime (bash OR powershell OR a GitHub Actions workflow) and make it runnable top-to-bottom. When you reference a previous step's output, capture it into a variable and show how it is reused. Never claim something was 'done' without a gatekeeper check the participant can run."
  );
  return lines.join("\n");
}

function renderLabSpec(opts: LabOptions): string {
  const sections = opts.components.length
    ? opts.components.map((c) => `  - **${LAB_COMPONENT_LABEL[c] ?? c}**`).join("\n")
    : "  - (all standard sections)";

  const depthRule =
    opts.depth === "exhaustive"
      ? "Depth: **EXHAUSTIVE**. Do not summarize. Show every command, every parameter, and every output the participant should see. Do not elide any step with phrases like 'configure as needed' — spell it out."
      : "Depth: **Standard**. Walk the participant through without hand-waving, but collapse obvious boilerplate.";

  const timings = opts.includeTimings
    ? "Per-step wall-clock time estimate (e.g. `~5 min`) on every step."
    : "";
  const costs = opts.includeCost
    ? "A final **Cost & cleanup** sub-section: list every billable resource with approximate USD/day at the chosen SKU, plus a single idempotent cleanup command/script."
    : "";
  const sec = opts.includeSecurityReview
    ? "A **Security review** sub-section: managed identity usage, least-privilege role assignments, secret handling, network exposure surface, and any compliance implications."
    : "";
  const outs = opts.includeExpectedOutputs
    ? "For every command, show the **expected output** (or a distinctive snippet of it) so the participant can self-verify without running a gatekeeper yet."
    : "";

  const runtimeLine =
    opts.runtime === "mixed"
      ? "Runtime: choose bash or PowerShell per lab based on idiomaticity, but be explicit at the top of each lab."
      : opts.runtime === "actions"
      ? "Runtime: package every multi-step sequence as a **GitHub Actions workflow** (`.github/workflows/<lab>.yml`). Use OIDC to Azure; no long-lived secrets."
      : `Runtime: **${opts.runtime}** only. No cross-shell snippets.`;

  const iacLine =
    opts.iac === "none"
      ? "IaC: none — use imperative `az` / `gh` CLI commands throughout."
      : opts.iac === "azd"
      ? "IaC: **azd** with Bicep modules (`azure.yaml`, `infra/main.bicep`, `infra/main.parameters.json`). Show `azd init`, `azd up`, and `azd down`."
      : `IaC: **${opts.iac}**. Include the actual template files (not just snippets) under a \`infra/\` folder convention.`;

  return [
    `Produce **${opts.labCount || "at least 3"}** end-to-end labs. ${depthRule}`,
    "",
    "Every lab MUST be structured as follows, in this exact order:",
    "",
    "1. **Title + learning outcomes** — what the participant can do after this lab that they could not before.",
    "2. **Scenario tie-in** — one paragraph linking this lab to the customer context above.",
    "3. **Sections** (each as a `###` heading; include only those selected):",
    sections,
    "4. **Validation** — the gatekeeper command(s) and expected PASS output.",
    "5. **Next lab handoff** — what state this lab leaves the environment in and which variables/outputs feed the next lab.",
    "",
    "**Hard requirements for every lab:**",
    "- Every prerequisite must be verifiable with a command that prints PASS/FAIL.",
    "- Every role assignment is spelled out as a concrete `az role assignment create …` command (or equivalent) with the principal ID captured into a variable first.",
    "- If step N depends on output from step N-1, show the exact `$VAR=$(…)` capture (bash) or `$var = (…)` (pwsh) so participants can copy-paste without guessing.",
    "- Provide a **troubleshooting table** per lab: a 3-column markdown table (Symptom | Likely cause | Fix command).",
    "- All resource names use a prefix derived from the customer's abbreviation (e.g. `ctso-aks-dev`), and region/SKU placeholders are declared **once** at the top and reused.",
    runtimeLine,
    iacLine,
    timings,
    costs,
    sec,
    outs
  ]
    .filter(Boolean)
    .join("\n");
}

function renderSessionSpec(opts: SessionOptions): string {
  const components = opts.components.length
    ? opts.components.map((c) => `  - **${SESSION_COMPONENT_LABEL[c] ?? c}**`).join("\n")
    : "  - (propose a complete session package)";

  const structureLabel: Record<string, string> = {
    theory: "Theory-heavy (concepts first, demos illustrative)",
    demo: "Demo-heavy (one or two deep live demos)",
    "hands-on": "Hands-on (workshop where attendees execute)",
    mixed: "Mixed (concept + demo + short exercise)"
  };
  const introLabel: Record<string, string> = {
    "assume-expertise": "Assume expertise — skip fundamentals, open with architectural framing",
    "light-intro": "Light intro — 1 or 2 framing slides then dive in",
    "full-intro": "Full intro — cover fundamentals before moving on"
  };

  const topicsBlock = opts.topics
    ? ["", "**Topics the SE has explicitly requested (cover ALL of these, in this order if sensible):**", opts.topics, ""].join("\n")
    : "";

  const wrapUpBlock = opts.wrapUp
    ? ["", "**Wrap-up / takeaways the SE needs:**", opts.wrapUp, ""].join("\n")
    : "";

  return [
    `**Structure:** ${structureLabel[opts.structure] ?? opts.structure}`,
    `**Format:** ${opts.format} · **Interactivity:** ${opts.interactivity}`,
    `**Intro depth:** ${introLabel[opts.introDepth] ?? opts.introDepth}`,
    `**Slide count target:** ~${opts.slideCount || "20"} slides (scale to the duration above).`,
    topicsBlock,
    "",
    "Produce **all** of the following components (each as a `###` heading):",
    components,
    "",
    "**Hard requirements:**",
    "- A **Timing budget** table at the top of the section that sums to exactly the session duration (incl. Q&A). Every block listed must also appear in the talk track.",
    "- The **talk track** is a minute-by-minute narrative of what the speaker says and does; not bullet points. When something is shown on screen, say it out loud.",
    "- The **slide outline** is a numbered list: `Slide N — <title> — <one-sentence purpose> — <key visual>`.",
    "- **Speaker notes** sit under each slide and include what NOT to say, common audience misconceptions, and fallback answers.",
    "- The **demo script** is keystroke-level: every command, every window to switch to, every wait/pause, and the exact sentence the speaker says while the terminal is thinking.",
    "- **Workshop exercises** (if included) link 1:1 to the Challenges section — same acceptance criteria.",
    "- **Q&A prompts** are questions the audience is most likely to ask, with a model answer in 2–3 sentences each.",
    "- **Pre-reads / follow-up / recording checklist** (if included) must be actionable — links, concrete artifacts, specific recording settings.",
    wrapUpBlock
  ]
    .filter(Boolean)
    .join("\n");
}

function tenantInstruction(tenant: CustomerBrief["tenant"]): string {
  switch (tenant) {
    case "customer":
      return "**Customer tenant** — generate IaC, CLI commands, and setup scripts on the assumption that they will be executed inside the customer's own Azure tenant / subscription and GitHub organization. Use parameterized subscription IDs / tenant IDs / org names (placeholders the SE can swap). Assume the SE does NOT have permissions to pre-create resources on the customer's behalf — call out every role assignment or consent the customer must perform before the engagement.";
    case "microsoft":
      return "**Microsoft tenant (SE internal testing)** — the SE will dry-run this in a Microsoft internal subscription. Prefer MSFT-sanctioned sandbox subscriptions, short-lived resource groups, and cleanup scripts. Commands can assume the SE already has Owner on the subscription.";
    case "personal":
      return "**Personal tenant (SE sandbox)** — the SE will dry-run this in a personal Azure subscription / GitHub user account. Assume no org-level constraints and that all services must fit within common free tiers or low-cost SKUs. Call out anything that needs a paid SKU.";
  }
}

function titleFor(d: Deliverable): string {
  switch (d) {
    case "hackathon":
      return "Hackathon Agenda";
    case "lab":
      return "Labs";
    case "challenge":
      return "Challenges";
    case "session":
      return "Session Material";
    case "onboarding":
      return "Onboarding Package";
    case "gatekeeper":
      return "Gatekeeper Validators";
    case "architecture":
      return "Architecture";
  }
}
