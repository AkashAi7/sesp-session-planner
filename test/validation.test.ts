import { describe, expect, it } from "vitest";
import { validateBrief, buildBriefPrompt } from "../src/briefPrompt";
import type { CustomerBrief } from "../src/plannerView";
import {
  DEFAULT_LAB_OPTIONS,
  DEFAULT_SESSION_OPTIONS
} from "../src/plannerView";

function baseBrief(overrides: Partial<CustomerBrief> = {}): CustomerBrief {
  return {
    customerName: "Contoso",
    industry: "Technology / ISV",
    engagementMode: "workshop",
    customerContext: "Modernize developer platform.",
    definitionOfSuccess: "Participants complete the build and validate it with the gatekeepers.",
    conversationInsights: "",
    constraints: "",
    complianceTags: [],
    tenant: "customer",
    audience: "Developers",
    skillLevel: "Intermediate",
    duration: "4 hours",
    technologies: ["AKS", "GitHub Actions"],
    deliverables: ["lab", "challenge"],
    useWorkIqInsights: false,
    emphasis: "Balanced (architecture + hands-on)",
    model: "gpt-4.1",
    readiness: {
      status: "yellow",
      environment: "Sandbox subscription exists.",
      accessAndApprovals: "RBAC and org access need confirmation.",
      logistics: "Hybrid delivery setup.",
      blockers: "None"
    },
    deliveryRoles: {
      facilitatorProfile: "Lead facilitator needs a runbook and troubleshooting guide.",
      supportModel: "guided",
      participantProfile: "Participants work in teams through guided exercises.",
      participantGrouping: "teams"
    },
    labOptions: { ...DEFAULT_LAB_OPTIONS },
    sessionOptions: { ...DEFAULT_SESSION_OPTIONS },
    ...overrides
  };
}

describe("validateBrief", () => {
  it("returns empty string for a valid brief", () => {
    expect(validateBrief(baseBrief())).toBe("");
  });

  it("rejects missing customer name", () => {
    expect(validateBrief(baseBrief({ customerName: "" }))).toContain("Customer name");
  });

  it("rejects missing customer context", () => {
    expect(validateBrief(baseBrief({ customerContext: "  " }))).toContain("Customer context");
  });

  it("rejects empty deliverables", () => {
    expect(validateBrief(baseBrief({ deliverables: [] }))).toContain("generated output");
  });

  it("rejects empty technologies", () => {
    expect(validateBrief(baseBrief({ technologies: [] }))).toContain("technology");
  });

  it("rejects FedRAMP with personal tenant", () => {
    const err = validateBrief(baseBrief({ complianceTags: ["FedRAMP"], tenant: "personal" }));
    expect(err).toContain("FedRAMP");
    expect(err).toContain("incompatible");
  });

  it("rejects Azure Gov with personal tenant", () => {
    const err = validateBrief(baseBrief({ complianceTags: ["Azure Gov"], tenant: "personal" }));
    expect(err).toContain("incompatible");
  });

  it("allows FedRAMP with customer tenant", () => {
    expect(validateBrief(baseBrief({ complianceTags: ["FedRAMP"], tenant: "customer" }))).toBe("");
  });

  it("rejects gatekeeper-only without challenge or lab", () => {
    const err = validateBrief(baseBrief({ deliverables: ["gatekeeper"] }));
    expect(err).toContain("Gatekeepers");
  });

  it("allows gatekeeper with challenge", () => {
    expect(validateBrief(baseBrief({ deliverables: ["gatekeeper", "challenge"] }))).toBe("");
  });

  it("rejects lab with empty components", () => {
    const err = validateBrief(baseBrief({
      deliverables: ["lab"],
      labOptions: { ...DEFAULT_LAB_OPTIONS, components: [] }
    }));
    expect(err).toContain("lab section");
  });

  it("rejects missing definition of success", () => {
    const err = validateBrief(baseBrief({ definitionOfSuccess: "   " }));
    expect(err).toContain("Definition of success");
  });

  it("rejects missing readiness environment", () => {
    const err = validateBrief(baseBrief({ readiness: { ...baseBrief().readiness, environment: "" } }));
    expect(err).toContain("Environment readiness");
  });

  it("rejects missing facilitator profile", () => {
    const err = validateBrief(baseBrief({ deliveryRoles: { ...baseBrief().deliveryRoles, facilitatorProfile: "" } }));
    expect(err).toContain("Facilitator guide focus");
  });

  it("rejects session with empty components", () => {
    const err = validateBrief(baseBrief({
      deliverables: ["session"],
      sessionOptions: { ...DEFAULT_SESSION_OPTIONS, components: [] }
    }));
    expect(err).toContain("session component");
  });
});

describe("buildBriefPrompt — WorkIQ prior materials", () => {
  it("includes prior materials discovery when WorkIQ is enabled", () => {
    const p = buildBriefPrompt(baseBrief({ useWorkIqInsights: true }));
    expect(p).toContain("## Prior materials discovery");
    expect(p).toContain("presentations");
    expect(p).toContain(".pptx");
    expect(p).toContain("slide decks");
  });

  it("does not include prior materials when WorkIQ is disabled", () => {
    const p = buildBriefPrompt(baseBrief({ useWorkIqInsights: false }));
    expect(p).not.toContain("## Prior materials discovery");
  });
});

describe("buildBriefPrompt — challenge spec", () => {
  it("includes challenge specification when challenges selected", () => {
    const p = buildBriefPrompt(baseBrief({ deliverables: ["challenge"] }));
    expect(p).toContain("## Challenge specification");
    expect(p).toContain("Goal");
    expect(p).toContain("Acceptance Criteria");
    expect(p).toContain("Hints");
    expect(p).toContain("Gatekeeper");
    expect(p).toContain("Debrief");
  });
});

describe("buildBriefPrompt — tenant semantics", () => {
  it("generates customer tenant instruction", () => {
    const p = buildBriefPrompt(baseBrief({ tenant: "customer" }));
    expect(p).toContain("Customer tenant");
    expect(p).toContain("parameterized");
  });

  it("generates Microsoft tenant instruction", () => {
    const p = buildBriefPrompt(baseBrief({ tenant: "microsoft" }));
    expect(p).toContain("Microsoft tenant");
    expect(p).toContain("sandbox");
  });

  it("generates personal tenant instruction", () => {
    const p = buildBriefPrompt(baseBrief({ tenant: "personal" }));
    expect(p).toContain("Personal tenant");
    expect(p).toContain("free tiers");
  });
});

describe("buildBriefPrompt — compliance tags", () => {
  it("includes compliance tags when specified", () => {
    const p = buildBriefPrompt(baseBrief({ complianceTags: ["HIPAA", "SOC 2"], constraints: "must be HIPAA" }));
    expect(p).toContain("Compliance");
    expect(p).toContain("HIPAA");
    expect(p).toContain("SOC 2");
  });
});
