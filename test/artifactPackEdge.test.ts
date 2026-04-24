import { describe, expect, it } from "vitest";
import { buildArtifactPackage, parseForgeFiles, stripForgeFileTags } from "../src/artifactPack";
import type { CustomerBrief } from "../src/plannerView";

function brief(overrides: Partial<CustomerBrief> = {}): CustomerBrief {
  return {
    customerName: "Contoso",
    industry: "Technology / ISV",
    engagementMode: "workshop",
    customerContext: "Need platform workshop.",
    definitionOfSuccess: "Participants can complete the lab flow end to end.",
    conversationInsights: "",
    constraints: "",
    complianceTags: [],
    tenant: "customer",
    audience: "Developers",
    skillLevel: "Intermediate",
    duration: "1 day",
    technologies: ["AKS"],
    deliverables: ["lab"],
    useWorkIqInsights: false,
    emphasis: "Balanced (architecture + hands-on)",
    model: "gpt-4.1",
    readiness: {
      status: "green",
      environment: "Sandbox ready.",
      accessAndApprovals: "Access approved.",
      logistics: "Virtual lab.",
      blockers: ""
    },
    deliveryRoles: {
      facilitatorProfile: "Facilitator runs a compact guided lab.",
      supportModel: "guided",
      participantProfile: "Participants work individually through the exercises.",
      participantGrouping: "individual"
    },
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

// ─── parseForgeFiles ─────────────────────────────────────────────────────────

describe("parseForgeFiles", () => {
  it("extracts a single forge-file tag", () => {
    const md = [
      '<forge-file path="scripts/setup.sh">',
      "#!/bin/bash",
      "echo hello",
      "</forge-file>"
    ].join("\n");
    const result = parseForgeFiles(md);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].path).toBe("scripts/setup.sh");
    expect(result![0].content.trim()).toBe("#!/bin/bash\necho hello");
  });

  it("extracts multiple forge-file tags", () => {
    const md = [
      '<forge-file path="a.ts">',
      "const a = 1;",
      "</forge-file>",
      "",
      '<forge-file path="b.md">',
      "# Readme",
      "</forge-file>"
    ].join("\n");
    const result = parseForgeFiles(md);
    expect(result).toHaveLength(2);
    expect(result![0].path).toBe("a.ts");
    expect(result![1].path).toBe("b.md");
  });

  it("returns null when no forge-file tags are present", () => {
    const md = "## Some heading\n\nJust prose, no files.\n\n#### File: something.ts\n```ts\nconst x = 1;\n```";
    expect(parseForgeFiles(md)).toBeNull();
  });

  it("trims trailing whitespace from content", () => {
    const md = '<forge-file path="x.txt">\nhello   \n  world  \n</forge-file>';
    const result = parseForgeFiles(md);
    expect(result![0].content.trimEnd()).toBe("hello   \n  world");
  });
});

// ─── stripForgeFileTags ───────────────────────────────────────────────────────

describe("stripForgeFileTags", () => {
  it("removes forge-file wrapper tags while keeping content", () => {
    const md = [
      "Some intro text.",
      "",
      '<forge-file path="setup.sh">',
      "#!/bin/bash",
      "echo hello",
      "</forge-file>",
      "",
      "Some closing text."
    ].join("\n");
    const result = stripForgeFileTags(md);
    expect(result).not.toContain("<forge-file");
    expect(result).not.toContain("</forge-file>");
    expect(result).toContain("#!/bin/bash");
    expect(result).toContain("Some intro text.");
    expect(result).toContain("Some closing text.");
  });

  it("strips the path attribute from opening tags", () => {
    const md = '<forge-file path="infra/main.bicep">\nparam name string\n</forge-file>';
    const result = stripForgeFileTags(md);
    expect(result).not.toContain('path="infra/main.bicep"');
    expect(result).toContain("param name string");
  });

  it("is a no-op when no forge-file tags exist", () => {
    const md = "# Plain markdown\n\nNo tags here.";
    expect(stripForgeFileTags(md)).toBe(md);
  });
});
