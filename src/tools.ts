import { loadCopilotSdk } from "./sdkLoader";

/**
 * Custom tool *specs*. They're plain objects; the real SDK `defineTool` is
 * applied lazily when the session is created (the SDK is ESM-only, so we can't
 * call it at top-level in a CJS extension).
 */

export interface SespToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<unknown>;
}

export const toolSpecs: SespToolSpec[] = [
  {
    name: "recommend_architecture",
    description:
      "Recommend an Azure + GitHub architecture for a given scenario. Returns a list of components with rationale.",
    parameters: {
      type: "object",
      properties: {
        scenario: {
          type: "string",
          description: "The session/hackathon scenario, e.g. 'migrate monolith to AKS with CI/CD'."
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          description: "Optional constraints (budget, duration, audience skill level, required products)."
        }
      },
      required: ["scenario"]
    },
    handler: async ({ scenario, constraints }: { scenario: string; constraints?: string[] }) => {
      const catalog = [
        { product: "Azure Kubernetes Service", category: "compute", useWhen: "microservices, container orchestration" },
        { product: "Azure Container Apps", category: "compute", useWhen: "serverless containers, event-driven workloads" },
        { product: "Azure App Service", category: "compute", useWhen: "web apps, quick PaaS hosting" },
        { product: "Azure Functions", category: "compute", useWhen: "event-driven, short-lived serverless" },
        { product: "Azure Container Registry", category: "artifacts", useWhen: "private container images" },
        { product: "Azure OpenAI", category: "ai", useWhen: "GenAI / RAG scenarios" },
        { product: "Azure SQL / Cosmos DB", category: "data", useWhen: "relational / NoSQL data" },
        { product: "Azure Key Vault", category: "security", useWhen: "secrets, certs, keys" },
        { product: "Azure Monitor + Log Analytics", category: "observability", useWhen: "telemetry, diagnostics" },
        { product: "Microsoft Entra ID", category: "identity", useWhen: "workforce + workload identity" },
        { product: "GitHub Actions", category: "cicd", useWhen: "CI/CD for any scenario" },
        { product: "GitHub Advanced Security", category: "security", useWhen: "code/secret/dependency scanning" },
        { product: "GitHub Codespaces", category: "environment", useWhen: "zero-setup dev environments for participants" },
        { product: "GitHub Copilot", category: "productivity", useWhen: "AI pair-programming segments" },
        { product: "GitHub Packages", category: "artifacts", useWhen: "private package hosting" }
      ];
      return { scenario, constraints: constraints ?? [], catalog };
    }
  },
  {
    name: "generate_gatekeeper",
    description:
      "Produce a gatekeeper validation specification for a challenge. Returns the validation shape the model should emit as a script or GitHub Action.",
    parameters: {
      type: "object",
      properties: {
        challengeTitle: { type: "string" },
        successCriteria: {
          type: "array",
          items: { type: "string" },
          description: "Observable conditions that prove the challenge is done."
        },
        preferredRuntime: {
          type: "string",
          enum: ["bash", "powershell", "python", "github-actions"],
          description: "The runtime the SE prefers for the gatekeeper."
        }
      },
      required: ["challengeTitle", "successCriteria"]
    },
    handler: async (args: { challengeTitle: string; successCriteria: string[]; preferredRuntime?: string }) => ({
      challengeTitle: args.challengeTitle,
      runtime: args.preferredRuntime ?? "bash",
      checks: args.successCriteria.map((c, i) => ({
        id: `check_${i + 1}`,
        description: c,
        severity: "blocking"
      })),
      exitSemantics: "Exit 0 when all checks pass, non-zero with a summary of failing checks otherwise."
    })
  },
  {
    name: "generate_onboarding_plan",
    description:
      "Return a structured onboarding / prerequisite checklist for a session (tooling, quotas, RBAC, identity).",
    parameters: {
      type: "object",
      properties: {
        technologies: {
          type: "array",
          items: { type: "string" },
          description: "Technologies used in the session (e.g., ['AKS', 'GitHub Actions', 'Bicep'])."
        },
        tenantType: {
          type: "string",
          enum: ["customer", "microsoft", "personal"],
          description: "Whose Azure/GitHub tenant the event runs in."
        }
      },
      required: ["technologies"]
    },
    handler: async ({ technologies, tenantType }: { technologies: string[]; tenantType?: string }) => ({
      technologies,
      tenantType: tenantType ?? "customer",
      sections: [
        "Local tooling (az, gh, docker, bicep, terraform, node, python as applicable)",
        "Azure subscription + resource provider registrations",
        "Azure quota checks (vCPUs, public IPs, regional capacity)",
        "RBAC: Contributor on rg, User Access Administrator for role assignments if needed",
        "Microsoft Entra ID: app registration / managed identity plan",
        "GitHub org access, PAT or GitHub App, Actions minutes, runner availability",
        "Networking prerequisites (outbound allow-list, private endpoints if applicable)",
        "Readiness validator script that fails fast with clear remediation"
      ]
    })
  }
];

/** Materialize tool specs into real SDK tools (called lazily at session start). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildSdkTools(): Promise<any[]> {
  const sdk = await loadCopilotSdk();
  return toolSpecs.map((spec) =>
    sdk.defineTool(spec.name, {
      description: spec.description,
      parameters: spec.parameters,
      handler: spec.handler
    })
  );
}
