import type { CustomerBrief, Deliverable } from "./plannerView";

const DELIVERABLE_LABEL: Record<Deliverable, string> = {
  hackathon: "Hackathon agenda (full event plan with modules, challenges, gatekeepers)",
  lab: "Detailed step-by-step labs (how-to with exact CLI / IaC commands)",
  challenge: "Participant challenges (what-to-do with hints & success criteria, no full solutions)",
  session: "Session material (session plan, talk track, slide outline, demo script)",
  onboarding: "Onboarding package (prerequisite checklist, setup scripts, readiness validator)",
  gatekeeper: "Gatekeeper validators (scripts or GitHub Actions per challenge)",
  architecture: "Architecture (Mermaid diagram + component rationale)"
};

export function briefTitle(brief: CustomerBrief): string {
  const kinds = brief.deliverables.join(", ");
  return `${brief.customerName} — ${kinds || "plan"}`;
}

export function buildBriefPrompt(brief: CustomerBrief): string {
  const lines: string[] = [];
  lines.push("# Customer Engagement Brief");
  lines.push("");
  lines.push(`**Customer:** ${brief.customerName}`);
  if (brief.industry) lines.push(`**Industry:** ${brief.industry}`);
  lines.push(`**Tenant for the event:** ${brief.tenant}`);
  lines.push(`**Audience:** ${brief.audience} (${brief.skillLevel})`);
  lines.push(`**Duration:** ${brief.duration}`);
  if (brief.eventDate) lines.push(`**Event date:** ${brief.eventDate}`);
  lines.push(`**Emphasis:** ${brief.emphasis}`);
  lines.push("");
  lines.push("## Customer context");
  lines.push(brief.customerContext);
  lines.push("");
  if (brief.constraints || brief.complianceTags.length) {
    lines.push("## Constraints");
    if (brief.constraints) lines.push(brief.constraints);
    if (brief.complianceTags.length) lines.push(`**Compliance:** ${brief.complianceTags.join(", ")}`);
    lines.push("");
  }
  lines.push("## Technologies in scope");
  lines.push(brief.technologies.map((t) => `- ${t}`).join("\n"));
  lines.push("");
  lines.push("## Required deliverables");
  lines.push("Produce **all** of the following, each as its own top-level section with a clear `## ` heading:");
  lines.push("");
  for (const d of brief.deliverables) lines.push(`- **${titleFor(d)}** — ${DELIVERABLE_LABEL[d]}`);
  lines.push("");
  lines.push("## Output instructions");
  lines.push(
    "Tailor every section to the customer context and constraints above. Call out where the customer's existing stack, industry, or compliance posture changes the design. Be concrete: real commands, real resource names (prefixed with an abbreviation of the customer name), current-API code, cost/latency trade-offs, and secure defaults (managed identity, least privilege, private networking where feasible). When you include a diagram, use Mermaid. When you include a script, pick a single consistent runtime per script (bash OR powershell OR a GitHub Actions workflow) and make it runnable top-to-bottom."
  );
  return lines.join("\n");
}

function titleFor(d: Deliverable): string {
  switch (d) {
    case "hackathon": return "Hackathon Agenda";
    case "lab": return "Labs";
    case "challenge": return "Challenges";
    case "session": return "Session Material";
    case "onboarding": return "Onboarding Package";
    case "gatekeeper": return "Gatekeeper Validators";
    case "architecture": return "Architecture";
  }
}
