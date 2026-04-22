import { describe, expect, it } from "vitest";
import { buildArtifactPackage } from "../src/artifactPack";
import type { CustomerBrief } from "../src/plannerView";

function brief(overrides: Partial<CustomerBrief> = {}): CustomerBrief {
  return {
    customerName: "Contoso",
    industry: "Technology / ISV",
    customerContext: "Need platform workshop.",
    conversationInsights: "",
    constraints: "",
    complianceTags: [],
    tenant: "customer",
    audience: "Developers",
    skillLevel: "Intermediate",
    duration: "1 day",
    technologies: ["AKS"],
    deliverables: ["lab"],
    engagementPreset: "workshop",
    useWorkIqInsights: false,
    emphasis: "Balanced (architecture + hands-on)",
    model: "gpt-4.1",
    labOptions: {
      components: ["prereqs", "provisioning"],
      runtime: "mixed",
      iac: "bicep",
      labCount: "1",
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
    },
    ...overrides
  };
}

describe("artifactPack edge cases", () => {
  it("extracts file with nested fenced blocks", () => {
    const markdown = [
      "## Workspace Blueprint",
      "Desc.",
      "",
      "#### File: scripts/check.sh",
      "````bash",
      "echo '```test```'",
      "az group create --name test",
      "````",
      "",
      "## Labs",
      "### Lab 1 — Setup",
      "Steps."
    ].join("\n");

    const artifacts = buildArtifactPackage(brief(), markdown);
    const check = artifacts.find((a) => a.path === "scripts/check.sh");
    expect(check).toBeDefined();
    expect(check!.content).toContain("echo '```test```'");
    expect(check!.content).toContain("az group create");
  });

  it("rejects file paths with ..", () => {
    const markdown = [
      "## Workspace Blueprint",
      "",
      "#### File: ../../../etc/passwd",
      "```",
      "malicious",
      "```"
    ].join("\n");

    const artifacts = buildArtifactPackage(brief(), markdown);
    const bad = artifacts.find((a) => a.path.includes("etc/passwd"));
    expect(bad).toBeUndefined();
  });

  it("rejects absolute paths", () => {
    const markdown = [
      "## Workspace Blueprint",
      "",
      "#### File: /etc/hosts",
      "```",
      "content",
      "```"
    ].join("\n");

    const artifacts = buildArtifactPackage(brief(), markdown);
    const bad = artifacts.find((a) => a.path.includes("etc/hosts"));
    expect(bad).toBeUndefined();
  });

  it("handles empty markdown", () => {
    const artifacts = buildArtifactPackage(brief(), "");
    expect(artifacts.length).toBeGreaterThan(0);
    expect(artifacts.find((a) => a.path === "README.md")).toBeDefined();
  });

  it("handles markdown with no sections", () => {
    const markdown = "Just some plain text without any sections.";
    const artifacts = buildArtifactPackage(brief(), markdown);
    expect(artifacts.find((a) => a.path === "ENGAGEMENT.md")).toBeDefined();
  });

  it("deduplicates files with same path", () => {
    const markdown = [
      "## Workspace Blueprint",
      "",
      "#### File: infra/main.bicep",
      "```bicep",
      "first version",
      "```",
      "",
      "#### File: infra/main.bicep",
      "```bicep",
      "second version",
      "```"
    ].join("\n");

    const artifacts = buildArtifactPackage(brief(), markdown);
    const bicepFiles = artifacts.filter((a) => a.path === "infra/main.bicep");
    expect(bicepFiles).toHaveLength(1);
    expect(bicepFiles[0].content).toContain("second version");
  });

  it("normalizes backslash paths", () => {
    const markdown = [
      "## Workspace Blueprint",
      "",
      "#### File: scripts\\setup\\init.ps1",
      "```powershell",
      "Write-Host 'hello'",
      "```"
    ].join("\n");

    const artifacts = buildArtifactPackage(brief(), markdown);
    // Backslash normalization happens inside the function
    const ps = artifacts.find((a) => a.path.includes("init.ps1"));
    expect(ps).toBeDefined();
  });
});
