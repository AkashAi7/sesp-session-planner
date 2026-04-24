// Pure types and default values — no vscode dependency so tests can import safely.

export type Deliverable =
  | "hackathon"
  | "lab"
  | "challenge"
  | "session"
  | "onboarding"
  | "gatekeeper"
  | "architecture";

export type EngagementMode = "workshop" | "hackathon" | "briefing" | "poc" | "bootcamp";

export interface LabOptions {
  components: string[];
  runtime: "bash" | "pwsh" | "mixed" | "actions";
  iac: "azd" | "bicep" | "terraform" | "arm" | "none";
  labCount: string;
  includeTimings: boolean;
  includeCost: boolean;
  includeSecurityReview: boolean;
  includeExpectedOutputs: boolean;
  depth: "standard" | "exhaustive";
}

export interface SessionOptions {
  components: string[];
  structure: "theory" | "demo" | "hands-on" | "mixed";
  slideCount: string;
  topics: string;
  introDepth: "assume-expertise" | "light-intro" | "full-intro";
  wrapUp: string;
  format: "in-person" | "virtual" | "hybrid";
  interactivity: "low" | "medium" | "high";
}

export interface ReadinessProfile {
  status: "green" | "yellow" | "red";
  environment: string;
  accessAndApprovals: string;
  logistics: string;
  blockers: string;
}

export interface DeliveryRoles {
  facilitatorProfile: string;
  supportModel: "light-touch" | "guided" | "high-touch";
  participantProfile: string;
  participantGrouping: "individual" | "pairs" | "teams";
}

export interface CustomerBrief {
  customerName: string;
  industry: string;
  engagementMode: EngagementMode;
  customerContext: string;
  definitionOfSuccess: string;
  conversationInsights: string;
  constraints: string;
  complianceTags: string[];
  tenant: "customer" | "microsoft" | "personal";
  audience: string;
  skillLevel: string;
  duration: string;
  technologies: string[];
  deliverables: Deliverable[];
  useWorkIqInsights: boolean;
  emphasis: string;
  model: string;
  readiness: ReadinessProfile;
  deliveryRoles: DeliveryRoles;
  labOptions: LabOptions;
  sessionOptions: SessionOptions;
}

export const LAB_COMPONENT_IDS = [
  "prereqs",
  "role-assignments",
  "provisioning",
  "app-deploy",
  "config",
  "gatekeeper-run",
  "troubleshooting",
  "cleanup"
] as const;

export const SESSION_COMPONENT_IDS = [
  "talk-track",
  "slide-outline",
  "speaker-notes",
  "demo-script",
  "workshop",
  "qa-prompts",
  "pre-reads",
  "follow-up",
  "recording-checklist"
] as const;

export const DEFAULT_LAB_OPTIONS: LabOptions = {
  components: [...LAB_COMPONENT_IDS],
  runtime: "mixed",
  iac: "bicep",
  labCount: "3",
  includeTimings: true,
  includeCost: true,
  includeSecurityReview: true,
  includeExpectedOutputs: true,
  depth: "exhaustive"
};

export const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  components: ["talk-track", "slide-outline", "speaker-notes", "demo-script", "qa-prompts"],
  structure: "mixed",
  slideCount: "20",
  topics: "",
  introDepth: "light-intro",
  wrapUp: "",
  format: "hybrid",
  interactivity: "medium"
};
