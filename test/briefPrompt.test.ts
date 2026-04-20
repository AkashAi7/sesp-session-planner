import { describe, expect, it } from "vitest";
import { buildBriefPrompt, briefTitle } from "../src/briefPrompt";
import type { CustomerBrief } from "../src/plannerView";

function baseBrief(overrides: Partial<CustomerBrief> = {}): CustomerBrief {
  return {
    customerName: "Contoso",
    industry: "Technology / ISV",
    customerContext: "They want to modernize their developer platform.",
    conversationInsights: "Customer is blocked on internal security review and wants proof points from prior workshops.",
    constraints: "",
    complianceTags: [],
    tenant: "customer",
    audience: "Developers",
    skillLevel: "Intermediate",
    duration: "4 hours",
    technologies: ["AKS", "GitHub Actions"],
    deliverables: ["lab", "session"],
    engagementPreset: "workshop",
    useWorkIqInsights: true,
    emphasis: "Balanced (architecture + hands-on)",
    model: "gpt-4.1",
    labOptions: {
      components: [
        "prereqs",
        "role-assignments",
        "provisioning",
        "app-deploy",
        "config",
        "gatekeeper-run",
        "troubleshooting",
        "cleanup"
      ],
      runtime: "mixed",
      iac: "bicep",
      labCount: "2",
      includeTimings: true,
      includeCost: true,
      includeSecurityReview: true,
      includeExpectedOutputs: true,
      depth: "exhaustive"
    },
    sessionOptions: {
      components: ["talk-track", "slide-outline"],
      structure: "mixed",
      slideCount: "20",
      topics: "",
      introDepth: "light-intro",
      wrapUp: "",
      format: "hybrid",
      interactivity: "medium"
    },
    ...overrides
  };
}

describe("briefTitle", () => {
  it("includes customer name and deliverables", () => {
    const title = briefTitle(baseBrief({ deliverables: ["lab", "architecture"] }));
    expect(title).toContain("Contoso");
    expect(title).toContain("lab");
    expect(title).toContain("architecture");
  });
});

describe("buildBriefPrompt", () => {
  it("includes Lab and Session specification blocks when selected", () => {
    const p = buildBriefPrompt(baseBrief());
    expect(p).toContain("## Lab specification");
    expect(p).toContain("## Session specification");
  });

  it("enforces technology coverage matrix rule when multiple technologies selected", () => {
    const p = buildBriefPrompt(baseBrief({ technologies: ["AKS", "GitHub Actions", "Azure OpenAI"] }));
    expect(p).toContain("### CRITICAL — Technology coverage across labs");
    expect(p).toContain("Coverage matrix");
    expect(p).toContain("Primary technology");
  });

  it("requires micro-steps and embedded exercises in lab spec", () => {
    const p = buildBriefPrompt(baseBrief());
    expect(p).toContain("numbered micro-steps");
    expect(p).toContain("Hands-on exercises");
    expect(p).toContain("Stretch goal");
  });

  it("includes conversation insight instructions when enabled", () => {
    const p = buildBriefPrompt(baseBrief());
    expect(p).toContain("## Conversation insights");
    expect(p).toContain("WorkIQ");
    expect(p).toContain("internal security review");
  });

  it("does not add tech coverage rule when only one technology selected", () => {
    const p = buildBriefPrompt(baseBrief({ technologies: ["AKS"] }));
    expect(p).not.toContain("### CRITICAL — Technology coverage across labs");
  });
});
