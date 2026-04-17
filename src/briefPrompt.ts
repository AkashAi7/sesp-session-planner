import type { CustomerBrief, Deliverable } from "./plannerView";

const DELIVERABLE_LABEL: Record<Deliverable, string> = {
  hackathon:
    "Hackathon agenda (event schedule with modules, challenges, gatekeeper validations, and judging criteria).",
  lab:
    "Detailed end-to-end labs. Each lab MUST walk the participant from a clean environment all the way to a validated working system: (1) prerequisites and role assignments, (2) provisioning (az / azd / bicep / terraform — real commands, real parameter names), (3) application deployment and configuration, (4) how to run the gatekeeper / validation script and interpret its output, (5) troubleshooting for each step (common error → cause → fix), (6) cleanup commands. No black boxes — if a step depends on a value from a previous step, show exactly how to capture and reuse it.",
  challenge:
    "Goal-oriented participant challenges (what-to-do, not how-to). For EACH challenge produce: a one-line goal, the business rationale, the gatekeeper command(s) a participant must run to prove completion, a **Definition of Done / Acceptance Criteria** section listing every objective signal that marks the challenge as passed (specific resource states, HTTP codes, metric values, GitHub Actions results, security findings closed, etc.), expected time-to-solve, and progressive hints (3 tiers: nudge → targeted → near-solution). Do NOT reveal the full solution path; only the acceptance criteria.",
  session:
    "Session material (session plan, talk track with timing, slide outline with speaker notes, demo script with exact keystrokes and what to say at each beat).",
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
  lines.push("## Output instructions");
  lines.push(
    "Be concrete. Use real commands, real resource names prefixed with an abbreviation of the customer name, current API versions, cost/latency trade-offs, and secure defaults (managed identity over keys, least privilege, private networking where feasible). Use Mermaid for diagrams. Keep each script in a single consistent runtime (bash OR powershell OR a GitHub Actions workflow) and make it runnable top-to-bottom. When you reference a previous step's output, capture it into a variable and show how it is reused. Never claim something was 'done' without a gatekeeper check the participant can run."
  );
  return lines.join("\n");
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
