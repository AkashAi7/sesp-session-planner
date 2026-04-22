import { describe, expect, it } from "vitest";
import {
  SESP_SYSTEM_PROMPT,
  SESP_ROLE_PROMPT,
  SESP_CAPABILITIES_PROMPT,
  SESP_FORMAT_PROMPT,
  SESP_STYLE_PROMPT
} from "../src/sespPrompt";

describe("sespPrompt sections", () => {
  it("SESP_ROLE_PROMPT contains role identity", () => {
    expect(SESP_ROLE_PROMPT).toContain("Role and Identity");
    expect(SESP_ROLE_PROMPT).toContain("Solution Engineer Session Planner");
    expect(SESP_ROLE_PROMPT).toContain("Azure");
    expect(SESP_ROLE_PROMPT).toContain("GitHub");
  });

  it("SESP_CAPABILITIES_PROMPT contains all 6 capabilities", () => {
    expect(SESP_CAPABILITIES_PROMPT).toContain("Technology Mix-and-Match Engine");
    expect(SESP_CAPABILITIES_PROMPT).toContain("Session and Hackathon Planning");
    expect(SESP_CAPABILITIES_PROMPT).toContain("Lab and Challenge Generation");
    expect(SESP_CAPABILITIES_PROMPT).toContain("Gatekeeper Validation");
    expect(SESP_CAPABILITIES_PROMPT).toContain("Customer Onboarding");
    expect(SESP_CAPABILITIES_PROMPT).toContain("Insight-Aware Planning");
  });

  it("SESP_FORMAT_PROMPT contains all 6 output sections", () => {
    expect(SESP_FORMAT_PROMPT).toContain("Workspace Blueprint");
    expect(SESP_FORMAT_PROMPT).toContain("Event Overview");
    expect(SESP_FORMAT_PROMPT).toContain("Architecture and Technology Stack");
    expect(SESP_FORMAT_PROMPT).toContain("Environment Setup and Onboarding");
    expect(SESP_FORMAT_PROMPT).toContain("Step-by-Step Execution Plan");
    expect(SESP_FORMAT_PROMPT).toContain("Gatekeeper Validation");
  });

  it("SESP_STYLE_PROMPT contains style and file artifact rules", () => {
    expect(SESP_STYLE_PROMPT).toContain("Professional");
    expect(SESP_STYLE_PROMPT).toContain("#### File:");
    expect(SESP_STYLE_PROMPT).toContain("repo-ready");
    expect(SESP_STYLE_PROMPT).toContain("fenced code block");
    expect(SESP_STYLE_PROMPT).toContain("### Lab N");
    expect(SESP_STYLE_PROMPT).toContain("### Challenge N");
  });

  it("SESP_SYSTEM_PROMPT is composed of all sections", () => {
    expect(SESP_SYSTEM_PROMPT).toContain(SESP_ROLE_PROMPT);
    expect(SESP_SYSTEM_PROMPT).toContain(SESP_CAPABILITIES_PROMPT);
    expect(SESP_SYSTEM_PROMPT).toContain(SESP_FORMAT_PROMPT);
    expect(SESP_SYSTEM_PROMPT).toContain(SESP_STYLE_PROMPT);
  });

  it("capabilities mention WorkIQ and presentations", () => {
    expect(SESP_CAPABILITIES_PROMPT).toContain("WorkIQ");
    expect(SESP_CAPABILITIES_PROMPT).toContain("presentations");
  });
});
