import { describe, expect, it } from "vitest";
import { buildArtifactPackage } from "../src/artifactPack";
import type { CustomerBrief } from "../src/plannerView";

function brief(): CustomerBrief {
  return {
    customerName: "Contoso",
    industry: "Technology / ISV",
    engagementMode: "workshop",
    customerContext: "Need an internal platform workshop.",
    definitionOfSuccess: "Teams complete the platform labs and agree on a reference architecture.",
    conversationInsights: "Security and platform teams disagree on hosting choice.",
    constraints: "Must fit in existing Azure landing zone.",
    complianceTags: ["SOC 2"],
    tenant: "customer",
    audience: "Developers",
    skillLevel: "Intermediate",
    duration: "1 day",
    technologies: ["AKS", "GitHub Actions"],
    deliverables: ["lab", "challenge", "architecture"],
    useWorkIqInsights: true,
    emphasis: "Balanced (architecture + hands-on)",
    model: "gpt-4.1",
    readiness: {
      status: "yellow",
      environment: "Landing zone exists with limited quotas.",
      accessAndApprovals: "RBAC needs pre-approval.",
      logistics: "Onsite with breakout tables.",
      blockers: "Hosting decision still open."
    },
    deliveryRoles: {
      facilitatorProfile: "Facilitators need timing, answer keys, and escalation guidance.",
      supportModel: "guided",
      participantProfile: "Participants build in teams and compare trade-offs.",
      participantGrouping: "teams"
    },
    labOptions: {
      components: ["prereqs", "provisioning", "app-deploy"],
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
      components: ["talk-track"],
      structure: "mixed",
      slideCount: "20",
      topics: "",
      introDepth: "light-intro",
      wrapUp: "",
      format: "hybrid",
      interactivity: "medium"
    }
  };
}

describe("buildArtifactPackage", () => {
  it("creates a repo-like multi-file package", () => {
    const markdown = [
      "## Workspace Blueprint",
      "Workspace tree.",
      "",
      "#### File: infra/main.bicep",
      "```bicep",
      "resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {",
      "  name: 'ctsoappdev'",
      "}",
      "```",
      "",
      "#### File: .github/workflows/gatekeeper-lab-01.yml",
      "```yaml",
      "name: gatekeeper-lab-01",
      "on: workflow_dispatch",
      "```",
      "",
      "## Event Overview",
      "Summary.",
      "",
      "## Architecture",
      "Architecture details.",
      "",
      "## Labs",
      "### Lab 1 — AKS foundation",
      "Step-by-step.",
      "",
      "### Lab 2 — GitHub Actions deployment",
      "Step-by-step.",
      "",
      "## Challenges",
      "### Challenge 1 — Secure the pipeline",
      "Acceptance criteria."
    ].join("\n");

    const artifacts = buildArtifactPackage(brief(), markdown);
    const paths = artifacts.map((artifact) => artifact.path);

    expect(paths).toContain("README.md");
    expect(paths).toContain("ENGAGEMENT.md");
    expect(paths).toContain("workspace/README.md");
    expect(paths).toContain("docs/overview.md");
    expect(paths).toContain("architecture/architecture.md");
    expect(paths).toContain("infra/main.bicep");
    expect(paths).toContain(".github/workflows/gatekeeper-lab-01.yml");
    expect(paths).toContain("labs/README.md");
    expect(paths).toContain("labs/01-lab-1-aks-foundation.md");
    expect(paths).toContain("labs/02-lab-2-github-actions-deployment.md");
    expect(paths).toContain("challenges/01-challenge-1-secure-the-pipeline.md");
    expect(paths).toContain("insights/conversation-insights.md");

    const engagementDoc = artifacts.find((artifact) => artifact.path === "docs/customer-brief.md");
    expect(engagementDoc?.content).toContain("Engagement mode");
    expect(engagementDoc?.content).toContain("Definition of success");
    expect(engagementDoc?.content).toContain("Delivery roles");
  });
});