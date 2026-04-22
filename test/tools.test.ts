import { describe, expect, it } from "vitest";
import { toolSpecs } from "../src/tools";

describe("toolSpecs", () => {
  it("includes all expected tools", () => {
    const names = toolSpecs.map((t) => t.name);
    expect(names).toContain("recommend_architecture");
    expect(names).toContain("generate_gatekeeper");
    expect(names).toContain("fetch_workiq_materials");
    expect(names).toContain("generate_onboarding_plan");
  });

  describe("recommend_architecture", () => {
    const tool = toolSpecs.find((t) => t.name === "recommend_architecture")!;

    it("returns a catalog with scenario and constraints", async () => {
      const result = (await tool.handler({
        scenario: "migrate monolith to AKS",
        constraints: ["budget < $500/mo"]
      })) as any;
      expect(result.scenario).toBe("migrate monolith to AKS");
      expect(result.constraints).toEqual(["budget < $500/mo"]);
      expect(result.catalog.length).toBeGreaterThan(0);
    });

    it("defaults constraints to empty array", async () => {
      const result = (await tool.handler({ scenario: "test" })) as any;
      expect(result.constraints).toEqual([]);
    });
  });

  describe("generate_gatekeeper", () => {
    const tool = toolSpecs.find((t) => t.name === "generate_gatekeeper")!;

    it("creates checks from success criteria", async () => {
      const result = (await tool.handler({
        challengeTitle: "Deploy to AKS",
        successCriteria: ["Pod is running", "Service has external IP"]
      })) as any;
      expect(result.challengeTitle).toBe("Deploy to AKS");
      expect(result.checks).toHaveLength(2);
      expect(result.checks[0].id).toBe("check_1");
      expect(result.checks[1].description).toBe("Service has external IP");
      expect(result.runtime).toBe("bash");
    });

    it("uses preferred runtime when specified", async () => {
      const result = (await tool.handler({
        challengeTitle: "Test",
        successCriteria: ["done"],
        preferredRuntime: "powershell"
      })) as any;
      expect(result.runtime).toBe("powershell");
    });

    it("handles empty criteria list", async () => {
      const result = (await tool.handler({
        challengeTitle: "Empty",
        successCriteria: []
      })) as any;
      expect(result.checks).toHaveLength(0);
    });
  });

  describe("fetch_workiq_materials", () => {
    const tool = toolSpecs.find((t) => t.name === "fetch_workiq_materials")!;

    it("returns structured material query for customer", async () => {
      const result = (await tool.handler({
        customerName: "Contoso",
        topics: ["AKS migration"],
        fileTypes: ["pptx"]
      })) as any;
      expect(result.customerName).toBe("Contoso");
      expect(result.topics).toEqual(["AKS migration"]);
      expect(result.requestedFileTypes).toEqual(["pptx"]);
      expect(result.materialCategories.length).toBe(4);
    });

    it("defaults to common file types", async () => {
      const result = (await tool.handler({ customerName: "Fabrikam" })) as any;
      expect(result.requestedFileTypes).toEqual(["pptx", "pdf", "docx"]);
      expect(result.topics).toEqual([]);
    });
  });

  describe("generate_onboarding_plan", () => {
    const tool = toolSpecs.find((t) => t.name === "generate_onboarding_plan")!;

    it("returns sections for given technologies", async () => {
      const result = (await tool.handler({
        technologies: ["AKS", "GitHub Actions"]
      })) as any;
      expect(result.technologies).toEqual(["AKS", "GitHub Actions"]);
      expect(result.tenantType).toBe("customer");
      expect(result.sections.length).toBe(8);
    });

    it("uses specified tenant type", async () => {
      const result = (await tool.handler({
        technologies: ["Bicep"],
        tenantType: "microsoft"
      })) as any;
      expect(result.tenantType).toBe("microsoft");
    });
  });
});
