import { describe, expect, it } from "vitest";
import { buildArtifactPackage } from "../src/artifactPack";
import type { CustomerBrief } from "../src/plannerView";

function brief(): CustomerBrief {
  return {
    customerName: "Contoso",
    industry: "Technology / ISV",
    customerContext: "Need an internal platform workshop.",
    conversationInsights: "Security and platform teams disagree on hosting choice.",
    constraints: "Must fit in existing Azure landing zone.",
    complianceTags: ["SOC 2"],
    tenant: "customer",
    audience: "Developers",
    skillLevel: "Intermediate",
    duration: "1 day",
    technologies: ["AKS", "GitHub Actions"],
    deliverables: ["lab", "challenge", "architecture"],
    engagementPreset: "workshop",
    useWorkIqInsights: true,
    emphasis: "Balanced (architecture + hands-on)",
    model: "gpt-4.1",
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
  });
});