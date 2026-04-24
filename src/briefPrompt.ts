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
    "Hackathon agenda (event schedule with modules, challenges, gatekeeper validations, judging criteria, instructor prep notes, and concrete supporting files such as scorecards, facilitator checklists, and judge sheets).",
  lab: "(see 'Lab specification' block below for required contents)",
  challenge:
    "Goal-oriented participant challenges (what-to-do, not how-to). For EACH challenge produce: a one-line goal, the business rationale, the starting state, exact participant tasks, the gatekeeper command(s) a participant must run to prove completion, a **Definition of Done / Acceptance Criteria** section listing every objective signal that marks the challenge as passed (specific resource states, HTTP codes, metric values, GitHub Actions results, security findings closed, etc.), expected time-to-solve, expected outputs participants should see while progressing, and progressive hints (3 tiers: nudge → targeted → near-solution). Do NOT reveal the full solution path; only the acceptance criteria.",
  session: "(see 'Session specification' block below for required contents)",
  onboarding:
    "Onboarding / 'Smooth Start' package: prerequisite checklist, automated setup scripts (idempotent), readiness validators that print a clear PASS/FAIL per prerequisite, and concrete workspace bootstrap files.",
  gatekeeper:
    "Gatekeeper validators — one script or GitHub Actions workflow per challenge that checks every item in that challenge's Acceptance Criteria and prints a machine-parsable PASS/FAIL plus a human-readable summary.",
  architecture:
    "Architecture: produce a Mermaid diagram mixing Azure + GitHub products, justify every component (why this service, what alternatives were rejected, security posture, cost posture, failure modes), and include the concrete infrastructure/app/config files that implement the proposed design."
};

export function briefTitle(brief: CustomerBrief): string {
  return `${brief.customerName} — ${brief.engagementMode}`;
}

/** Validate a brief for contradictions and missing required fields. Returns empty string if valid. */
export function validateBrief(brief: CustomerBrief): string {
  if (!brief.customerName.trim()) return "Customer name is required.";
  if (!brief.customerContext.trim()) return "Customer context is required.";
  if (!brief.definitionOfSuccess.trim()) return "Definition of success is required.";
  if (brief.deliverables.length === 0) return "At least one generated output is required.";
  if (brief.technologies.length === 0) return "Select at least one technology.";

  if (brief.deliverables.includes("lab") && brief.labOptions.components.length === 0)
    return "Select at least one lab section to include.";
  if (brief.deliverables.includes("session") && brief.sessionOptions.components.length === 0)
    return "Select at least one session component.";

  // Contradiction checks
  const govCompliance = brief.complianceTags.some((t) =>
    ["FedRAMP", "Azure Gov"].includes(t)
  );
  if (govCompliance && brief.tenant === "personal")
    return "FedRAMP / Azure Gov compliance is incompatible with a personal sandbox tenant. Use a customer or Microsoft tenant.";

  if (brief.deliverables.includes("gatekeeper") && !brief.deliverables.includes("challenge") && !brief.deliverables.includes("lab"))
    return "Gatekeepers require at least one challenge or lab to validate against. Add a challenge or lab.";

  return "";
}

export function buildBriefPrompt(brief: CustomerBrief): string {
  const lines: string[] = [];
  lines.push("# Customer Engagement Brief");
  lines.push("");
  lines.push(`**Customer:** ${brief.customerName}`);
  if (brief.industry) lines.push(`**Industry:** ${brief.industry}`);
  lines.push(`**Engagement mode:** ${brief.engagementMode}`);
  lines.push(`**Audience:** ${brief.audience} (${brief.skillLevel})`);
  lines.push(`**Duration:** ${brief.duration}`);
  lines.push(`**Emphasis:** ${brief.emphasis}`);
  lines.push(`**Definition of success:** ${brief.definitionOfSuccess}`);
  lines.push("");
  lines.push("## Tenant / environment assumption");
  lines.push(tenantInstruction(brief.tenant));
  lines.push("");
  lines.push("## Customer context");
  lines.push(brief.customerContext);
  lines.push("");
  lines.push("## Definition of success");
  lines.push(brief.definitionOfSuccess);
  lines.push("");
  lines.push("## Readiness and delivery risk");
  lines.push(`**Status:** ${brief.readiness.status}`);
  lines.push("");
  lines.push(`**Environment readiness:** ${brief.readiness.environment}`);
  lines.push("");
  lines.push(`**Access and approvals:** ${brief.readiness.accessAndApprovals}`);
  lines.push("");
  lines.push(`**Delivery logistics:** ${brief.readiness.logistics || "None provided."}`);
  lines.push("");
  lines.push(`**Known blockers:** ${brief.readiness.blockers || "None provided."}`);
  lines.push("");
  lines.push("## Facilitation model");
  lines.push(`**Facilitator guide focus:** ${brief.deliveryRoles.facilitatorProfile}`);
  lines.push(`**Support model:** ${brief.deliveryRoles.supportModel}`);
  lines.push(`**Participant experience:** ${brief.deliveryRoles.participantProfile}`);
  lines.push(`**Participant grouping:** ${brief.deliveryRoles.participantGrouping}`);
  lines.push("");
  if (brief.conversationInsights.trim()) {
    lines.push("## Conversation insights");
    lines.push(
      brief.useWorkIqInsights
        ? "Blend the notes below with any WorkIQ conversation/customer insights available through MCP. If MCP data is unavailable, still honor these notes."
        : "Use these notes as first-class planning context."
    );
    lines.push("");
    lines.push(brief.conversationInsights.trim());
    lines.push("");
  } else if (brief.useWorkIqInsights) {
    lines.push("## Conversation insights");
    lines.push("If a WorkIQ MCP server is available, use it to pull relevant customer conversation insights, risks, open questions, and next-step signals before drafting the deliverables.");
    lines.push("");
  }
  if (brief.useWorkIqInsights) {
    lines.push("## Prior materials discovery");
    lines.push(
      "If a WorkIQ MCP server is available, also query for **related presentations** (.pptx, .pdf), "
      + "**slide decks**, **shared documents**, **meeting recordings**, and **demo artifacts** associated with this customer or topic. "
      + "Surface any discovered materials as a \"Prior Materials\" section so the generated plan can reference, build on, "
      + "or extend existing decks rather than starting from scratch. If prior presentations are found, list them with titles, "
      + "dates, and key topics covered, then note which parts of the new deliverables overlap and where the SE can reuse slides."
    );
    lines.push("");
  }
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

  lines.push("## Packaging objective");
  lines.push(
    "The output must be **repo-ready**. Think in terms of a customer-shareable workspace first, and a GitHub repository second. Every selected utility/deliverable must map to concrete folders and files, not just prose. The generated package should feel like something an SE can save, open as a workspace, publish as a repo, and use to run the engagement with separate participant-facing and facilitator-facing materials."
  );
  lines.push("");

  lines.push("## Required deliverables");
  lines.push(
    "Produce **all** of the following, each as its own top-level section with a clear stable `## ` heading. Every deliverable must be internally consistent with the others — the same resource names, regions, and identity model throughout. In addition to the narrative, every major deliverable must include the concrete files needed to realize it in a workspace/repo."
  );
  lines.push("");
  lines.push(`- **Engagement mode contract** — this is a **${brief.engagementMode}**. Shape the tone, timeboxing, participant guidance, facilitator assets, and challenge/lab design accordingly.`);
  lines.push("- **Definition of success traceability** — every major output must explicitly map back to the success definition above and explain how the facilitator will know the event worked.");
  lines.push("- **Facilitator / participant separation** — generate distinct artifacts or sections for facilitator guidance versus participant instructions whenever the engagement mode includes live delivery.");
  lines.push("- **Workspace Blueprint** — describe the target folder structure, what each folder is for, which files are generated, and how the selected utilities fit together as one workspace/repository.");
  for (const d of brief.deliverables)
    lines.push(`- **${titleFor(d)}** — ${DELIVERABLE_LABEL[d]}`);
  lines.push("");

  if (brief.deliverables.includes("lab")) {
    lines.push("## Lab specification (MUST follow when writing the Labs section)");
    lines.push(renderLabSpec(brief.labOptions, brief.technologies));
    lines.push("");
  }
  if (brief.deliverables.includes("session")) {
    lines.push("## Session specification (MUST follow when writing the Session Material section)");
    lines.push(renderSessionSpec(brief.sessionOptions));
    lines.push("");
  }
  if (brief.deliverables.includes("challenge")) {
    lines.push("## Challenge specification (MUST follow when writing the Challenges section)");
    lines.push(renderChallengeSpec());
    lines.push("");
  }

  lines.push("## Output instructions");
  lines.push(
    "Be concrete. Use real commands, real resource names prefixed with an abbreviation of the customer name, current API versions, cost/latency trade-offs, and secure defaults (managed identity over keys, least privilege, private networking where feasible). Use Mermaid for diagrams. Keep each script in a single consistent runtime (bash OR powershell OR a GitHub Actions workflow) and make it runnable top-to-bottom. When you reference a previous step's output, capture it into a variable and show how it is reused. Never claim something was 'done' without a gatekeeper check the participant can run. Use stable section names so Forge can split the result into multiple files. For Labs use `### Lab N — Title`; for Challenges use `### Challenge N — Title`; for Hackathon agendas use `### Module N — Title`."
  );
  lines.push("");
  lines.push("## File artifact contract");
  lines.push("The package is expected to materialize into real workspace files. Follow these rules strictly:");
  lines.push("");
  lines.push("- Under `## Workspace Blueprint`, include a folder tree for the proposed workspace/repository (for example: `infra/`, `scripts/`, `.github/workflows/`, `labs/`, `challenges/`, `docs/`, `session/`, `onboarding/`).");
  lines.push("- Whenever you define a concrete file, emit a heading in the exact form `#### File: relative/path.ext` or `##### File: relative/path.ext`.");
  lines.push("- Immediately under each file heading, include the full file contents in a fenced code block if it is code/config/script, or plain markdown body if it is a markdown/text file.");
  lines.push("- Do not use placeholders like `path/to/file`. Use realistic repo-relative paths such as `infra/main.bicep`, `scripts/bootstrap/check-prereqs.ps1`, `.github/workflows/gatekeeper-lab-01.yml`, `labs/lab-01/README.md`, `challenges/challenge-01.md`, or `session/demo-script.md`.");
  lines.push("- For every selected utility/deliverable, produce at least one concrete file artifact. For Labs and Challenges, produce multiple files when appropriate, not one monolithic file.");
  lines.push("- For every lab, emit at minimum `labs/lab-0N/README.md` plus at least one supporting file such as `validation.yml`, `check-prereqs.ps1`, `variables.env`, `main.bicep`, or `deploy.sh`.");
  lines.push("- For every challenge, emit at minimum `challenges/challenge-0N.md` plus a validator/workflow/checklist file.");
  lines.push("- Prefer separate folders and files over giant catch-all markdown sections. The narrative should explain the package, but the package itself should be file-oriented.");
  return lines.join("\n");
}

function renderChallengeSpec(): string {
  return [
    "For each challenge, produce a deeply defined participant-facing artifact with the following structure in this exact order:",
    "",
    "1. **Goal** — one sentence describing the outcome the participant must achieve.",
    "2. **Business rationale** — why this matters to the customer's scenario.",
    "3. **Starting state** — what is already provisioned, what files/resources already exist, and what the participant is allowed to change.",
    "4. **Participant tasks** — a numbered list of exact tasks; not vague goals.",
    "5. **Expected outputs while progressing** — logs, URLs, CLI output snippets, GitHub checks, portal states, or API responses the participant should expect to see.",
    "6. **Definition of Done / Acceptance Criteria** — objective, testable pass conditions only.",
    "7. **Hints** — 3 tiers: nudge → targeted → near-solution.",
    "8. **Gatekeeper / validator invocation** — the exact validation command or workflow run.",
    "9. **Debrief notes** — what the instructor should review once the challenge is complete.",
    "",
    "**Hard requirements for every challenge:**",
    "- Challenges must be specific enough that a participant knows exactly what they are changing and what success looks like, without seeing the full solution.",
    "- Include expected outputs or state transitions at major checkpoints so progress is visible.",
    "- Call out the exact files, workflows, resources, branches, services, secrets, or policies the participant will touch.",
    "- If a challenge depends on lab output, name the prerequisite lab and the specific files/resources carried forward.",
    "- Emit at least one concrete file artifact for each challenge, such as a markdown challenge brief, a validator script, a workflow file, a starter file, or a checklist."
  ].join("\n");
}

function renderLabSpec(opts: LabOptions, technologies: string[]): string {
  const sections = opts.components.length
    ? opts.components.map((c) => `  - **${LAB_COMPONENT_LABEL[c] ?? c}**`).join("\n")
    : "  - (all standard sections)";

  const depthRule =
    opts.depth === "exhaustive"
      ? "Depth: **EXHAUSTIVE**. Do not summarize. Show every command, every parameter, and every output the participant should see. Do not elide any step with phrases like 'configure as needed' — spell it out."
      : "Depth: **Standard**. Walk the participant through without hand-waving, but collapse obvious boilerplate.";

  const targetLabCount = parseInt(opts.labCount || "3", 10) || 3;
  const techList = technologies.length ? technologies.join(", ") : "(none listed — infer from context)";
  const techCoverageRule = technologies.length >= 2
    ? [
        "",
        "### CRITICAL — Technology coverage across labs",
        `The SE selected these technologies in scope: **${techList}**. Every one of them MUST be exercised hands-on in at least one lab. Do NOT concentrate all labs on a single technology.`,
        "",
        "Before writing the labs, emit a **Coverage matrix** table with columns `Lab # | Title | Primary technology | Secondary technologies | Learning outcome`. Every selected technology from the list above MUST appear in the `Primary technology` column for at least one lab. If two technologies are closely paired (e.g. AKS + ACR), they may share a lab but each must still have its own primary-technology lab elsewhere.",
        "",
        `You were asked for **${targetLabCount}** labs. If ${targetLabCount} is smaller than the number of selected technologies, **override the count** and produce one lab per technology at minimum, plus an integration lab that ties them together. State explicitly in the Coverage matrix why you scaled up.`,
        ""
      ].join("\n")
    : "";

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
    `Produce **${targetLabCount}** end-to-end labs (adjust upward per the coverage rule if needed). ${depthRule}`,
    techCoverageRule,
    "Every lab MUST be structured as follows, in this exact order:",
    "",
    "1. **Title + learning outcomes** — bullet list: \"After this lab you can ___\". Min 3 outcomes.",
    "2. **Scenario tie-in** — one paragraph linking this lab to the customer context above and naming the *primary* + *secondary* technologies it exercises.",
    "3. **Prerequisites check** — numbered commands that print PASS/FAIL for every tool/role/quota the lab needs.",
    "4. **Sections** (each as a `###` heading; include only those selected):",
    sections,
    "5. **Hands-on exercises** — at least **2 exercises** embedded in the lab (not at the end). Each exercise is: a one-line task, starter snippet/prompt (partially filled), expected end state, and the validation command. These are copy-paste-and-modify style, not greenfield — they build on what the lab just walked through.",
    "6. **Stretch goal** — one extension task with acceptance criteria but no walkthrough.",
    "7. **Validation** — the gatekeeper command(s) and expected PASS output.",
    "8. **Next lab handoff** — what state this lab leaves the environment in and which variables/outputs feed the next lab (name them explicitly).",
    "",
    "**Hard requirements for every lab:**",
    "- Each lab must materialize as a folder such as `labs/lab-01/` with a detailed `README.md` and supporting files/scripts/workflows/configs required to run it.",
    "- Each `labs/lab-0N/README.md` must contain at least **10 numbered micro-steps** unless the scenario is genuinely tiny; do not collapse a whole lab into a few bullets or one-liners.",
    "- **Break every section into numbered micro-steps** (1.1, 1.2, 1.3 …). Each micro-step has: purpose (one sentence) → command block → expected output → \"why this works\" note. No unlabeled walls of code.",
    "- After every file edit, command, deployment, or validation step, show the expected output or resulting state explicitly. Single-line instructions without command/output detail are not acceptable.",
    "- Every prerequisite must be verifiable with a command that prints PASS/FAIL.",
    "- Every role assignment is spelled out as a concrete `az role assignment create …` command (or equivalent) with the principal ID captured into a variable first.",
    "- If step N depends on output from step N-1, show the exact `$VAR=$(…)` capture (bash) or `$var = (…)` (pwsh) so participants can copy-paste without guessing. **Never** write `<your-resource-name>` placeholders mid-lab — resolve them via capture.",
    "- Provide a **troubleshooting table** per lab: a 3-column markdown table (Symptom | Likely cause | Fix command) with at least 5 rows drawn from the real failure modes of this scenario.",
    "- All resource names use a prefix derived from the customer's abbreviation (e.g. `ctso-aks-dev`), and region/SKU placeholders are declared **once** at the top and reused.",
    "- Each lab must be **independently runnable from a clean environment** given its prereqs block — but when part of a series, must also slot into the handoff chain without duplicate provisioning.",
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
