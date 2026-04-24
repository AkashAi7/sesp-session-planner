import * as vscode from "vscode";
import {
  Deliverable,
  EngagementMode,
  CustomerBrief,
  DEFAULT_LAB_OPTIONS,
  DEFAULT_SESSION_OPTIONS,
  LAB_COMPONENT_IDS,
  SESSION_COMPONENT_IDS
} from "./plannerDefaults";
export type {
  Deliverable,
  EngagementMode,
  LabOptions,
  SessionOptions,
  ReadinessProfile,
  DeliveryRoles,
  CustomerBrief
} from "./plannerDefaults";
export {
  LAB_COMPONENT_IDS,
  SESSION_COMPONENT_IDS,
  DEFAULT_LAB_OPTIONS,
  DEFAULT_SESSION_OPTIONS
} from "./plannerDefaults";

const MODE_DELIVERABLES: Record<EngagementMode, Deliverable[]> = {
  workshop: ["lab", "challenge", "gatekeeper", "onboarding", "session", "architecture"],
  hackathon: ["hackathon", "challenge", "gatekeeper", "onboarding", "session", "architecture"],
  briefing: ["session", "architecture", "onboarding"],
  poc: ["architecture", "lab", "gatekeeper", "onboarding", "session"],
  bootcamp: ["lab", "challenge", "gatekeeper", "session", "onboarding", "architecture"]
};

export function deliverablesForMode(mode: EngagementMode): Deliverable[] {
  return [...MODE_DELIVERABLES[mode]];
}

export class SespPlannerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sesp.plannerView";
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onSubmit: (brief: CustomerBrief) => void | Promise<void>,
    private readonly workIqEnabled: boolean = false
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview, this.workIqEnabled);
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "submit") await this.onSubmit(msg.brief as CustomerBrief);
      if (msg?.type === "insertTemplate") await vscode.commands.executeCommand("sesp.insertTemplate");
    });
  }

  reveal() {
    this.view?.show?.(true);
  }

  setGenerating(generating: boolean): void {
    this.view?.webview.postMessage({ type: "setGenerating", generating });
  }

  private renderHtml(webview: vscode.Webview, workIqEnabled: boolean): string {
    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`
    ].join("; ");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Forge</title>
<style>
  :root { --radius: 8px; --gap: 12px; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
    margin: 0;
    padding: 14px;
  }
  header { margin-bottom: 14px; }
  header h1 { font-size: 15px; margin: 0 0 4px 0; font-weight: 700; }
  header .sub { color: var(--vscode-descriptionForeground); font-size: 12px; line-height: 1.4; }
  .wizard-shell {
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, #3c3c3c));
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--vscode-editor-background);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
    background: color-mix(in srgb, var(--vscode-button-background) 6%, transparent);
  }
  .step-tab {
    border: 0;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    padding: 12px 10px;
    text-align: left;
    cursor: pointer;
    border-right: 1px solid var(--vscode-panel-border, #3c3c3c);
  }
  .step-tab:last-child { border-right: none; }
  .step-tab strong { display: block; font-size: 12px; color: inherit; }
  .step-tab span { display: block; font-size: 11px; margin-top: 2px; }
  .step-tab.active {
    color: var(--vscode-foreground);
    background: color-mix(in srgb, var(--vscode-button-background) 14%, transparent);
  }
  .step-tab.done strong::after { content: "  ✓"; color: var(--vscode-testing-iconPassed, #3fb950); }
  .panel { display: none; padding: 16px; }
  .panel.active { display: block; }
  .panel h2 { font-size: 13px; margin: 0 0 4px 0; }
  .panel .intro { color: var(--vscode-descriptionForeground); font-size: 11px; margin-bottom: 12px; line-height: 1.4; }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--gap); }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
  .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--gap); }
  label { font-weight: 600; font-size: 12px; }
  .hint { font-size: 11px; color: var(--vscode-descriptionForeground); }
  input, textarea, select {
    width: 100%;
    box-sizing: border-box;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: var(--radius);
    padding: 7px 9px;
    font-family: inherit;
    font-size: inherit;
  }
  textarea { resize: vertical; min-height: 72px; }
  input:focus, textarea:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
  }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .card {
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #555));
    border-radius: var(--radius);
    padding: 10px;
    cursor: pointer;
    background: var(--vscode-input-background, transparent);
  }
  .card.active {
    border-color: var(--vscode-button-background);
    background: color-mix(in srgb, var(--vscode-button-background) 14%, transparent);
  }
  .card strong { display: block; font-size: 12px; margin-bottom: 3px; }
  .card small { color: var(--vscode-descriptionForeground); font-size: 11px; line-height: 1.35; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 4px 12px;
    border-radius: 999px;
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #555));
    background: var(--vscode-input-background, transparent);
    color: var(--vscode-foreground);
    font-size: 11px;
    cursor: pointer;
    user-select: none;
  }
  .chip.selected {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
    font-weight: 600;
  }
  .chip.selected::before { content: "✓ "; }
  .group-title {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    margin: 10px 0 4px;
  }
  .radio-group {
    display: flex;
    gap: 0;
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 999px;
    overflow: hidden;
    width: fit-content;
  }
  .radio-group label {
    padding: 0;
    font-size: 11px;
    cursor: pointer;
    user-select: none;
    color: var(--vscode-foreground);
    background: var(--vscode-input-background);
    border-right: 1px solid var(--vscode-input-border, #555);
    font-weight: 500;
  }
  .radio-group label:last-child { border-right: none; }
  .radio-group input[type="radio"] { display: none; }
  .radio-group input[type="radio"]:checked + .rlabel {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    font-weight: 700;
  }
  .radio-group .rlabel { padding: 5px 14px; display: inline-block; }
  .toggle-row { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 4px; }
  .toggle { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; }
  .toggle input[type="checkbox"] { margin: 0; accent-color: var(--vscode-button-background); }
  .outputs {
    border: 1px dashed var(--vscode-panel-border, #555);
    border-radius: var(--radius);
    padding: 10px;
    background: color-mix(in srgb, var(--vscode-button-background) 6%, transparent);
    margin-bottom: 12px;
  }
  .outputs strong { display: block; font-size: 12px; margin-bottom: 8px; }
  .summary {
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin-bottom: 12px;
    background: color-mix(in srgb, var(--vscode-editor-background) 80%, var(--vscode-button-background) 4%);
  }
  .summary h3 { margin: 0 0 8px 0; font-size: 12px; }
  .summary ul { margin: 0; padding-left: 18px; }
  .summary li { margin-bottom: 4px; font-size: 12px; }
  .footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--vscode-panel-border, #3c3c3c);
    background: var(--vscode-sideBar-background, transparent);
    position: sticky;
    bottom: 0;
  }
  .footer .grow { flex: 1; }
  button {
    border-radius: var(--radius);
    padding: 9px 12px;
    cursor: pointer;
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    background: transparent;
    color: var(--vscode-foreground);
  }
  button.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
    font-weight: 700;
  }
  button.primary:hover { background: var(--vscode-button-hoverBackground); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { color: var(--vscode-errorForeground); font-size: 11px; min-height: 14px; }
  .req { color: var(--vscode-errorForeground); margin-left: 2px; font-weight: bold; }
</style>
</head>
<body>
<header>
  <h1>Forge Planner</h1>
  <div class="sub">Brief a customer once, generate a complete engagement package. For a quick single artifact, use <strong>Forge: Quick Generate</strong> (⌘/Ctrl+Shift+P).</div>
</header>
<div class="wizard-shell">
  <div class="steps" id="steps"></div>

  <section class="panel active" data-step="1">
    <h2>1. Engagement Goal</h2>
    <div class="intro">Pick the engagement mode first, then describe why the customer is doing this and what success must look like when the room is done.</div>

    <div class="field">
      <label>Engagement mode</label>
      <div class="cards" id="modeCards"></div>
    </div>

    <div class="outputs">
      <strong>Forge will generate</strong>
      <div class="chips" id="modeOutputs"></div>
      <div class="hint" id="modeHint" style="margin-top:8px;"></div>
    </div>

    <div class="row2">
      <div class="field">
        <label for="customerName">Customer name<span class="req">*</span></label>
        <input id="customerName" placeholder="Contoso Ltd." />
      </div>
      <div class="field">
        <label for="industry">Industry</label>
        <select id="industry">
          <option value="">- Select -</option>
          <option>Financial Services</option>
          <option>Healthcare &amp; Life Sciences</option>
          <option>Retail &amp; CPG</option>
          <option>Manufacturing</option>
          <option>Public Sector / Government</option>
          <option>Education</option>
          <option>Media &amp; Entertainment</option>
          <option>Energy</option>
          <option>Telco</option>
          <option>Technology / ISV</option>
          <option>Other</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="customerContext">Customer context<span class="req">*</span></label>
      <textarea id="customerContext" placeholder="Current state, pain points, strategic drivers, platform maturity, stakeholder tensions, and why this engagement matters now."></textarea>
    </div>

    <div class="field">
      <label for="definitionOfSuccess">Definition of success<span class="req">*</span></label>
      <textarea id="definitionOfSuccess" placeholder="Required. What must be true by the end of the workshop or hackathon? Example: every team deploys successfully, security signs off on the identity model, the customer chooses a reference architecture."></textarea>
    </div>

    <div class="row3">
      <div class="field">
        <label for="audience">Audience role</label>
        <select id="audience">
          <option>Developers</option>
          <option>Platform / DevOps engineers</option>
          <option>Architects</option>
          <option>Security engineers</option>
          <option>Data engineers</option>
          <option>Mixed technical audience</option>
        </select>
      </div>
      <div class="field">
        <label for="skillLevel">Skill level</label>
        <select id="skillLevel">
          <option>Beginner</option>
          <option selected>Intermediate</option>
          <option>Advanced</option>
        </select>
      </div>
      <div class="field">
        <label for="duration">Duration</label>
        <select id="duration">
          <option>1 hour</option>
          <option>2 hours</option>
          <option selected>4 hours</option>
          <option>Half day</option>
          <option>1 day</option>
          <option>2 days</option>
          <option>1 week</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label>Target environment</label>
      <div class="radio-group" id="tenantGroup">
        <label><input type="radio" name="tenant" value="customer" checked><span class="rlabel">Customer tenant</span></label>
        <label><input type="radio" name="tenant" value="microsoft"><span class="rlabel">Microsoft tenant</span></label>
        <label><input type="radio" name="tenant" value="personal"><span class="rlabel">Personal sandbox</span></label>
      </div>
      <div class="hint" id="tenantHint"></div>
    </div>
  </section>

  <section class="panel" data-step="2">
    <h2>2. Readiness</h2>
    <div class="intro">Capture what usually makes or breaks the day: environment readiness, approvals, logistics, blockers, compliance, and prior conversation context.</div>

    <div class="row2">
      <div class="field">
        <label for="readinessStatus">Readiness status</label>
        <select id="readinessStatus">
          <option value="green">Green - ready to execute</option>
          <option value="yellow" selected>Yellow - workable with tracked gaps</option>
          <option value="red">Red - major risks or blockers</option>
        </select>
      </div>
      <div class="field">
        <label for="constraints">Global constraints</label>
        <textarea id="constraints" placeholder="Budget caps, approved regions, restricted SKUs, network policies, data residency, change windows."></textarea>
      </div>
    </div>

    <div class="field">
      <label for="environmentReadiness">Environment readiness</label>
      <textarea id="environmentReadiness" placeholder="What already exists? Landing zone, subscriptions, pre-created resources, repo structure, baseline apps, dev boxes, approved services."></textarea>
    </div>

    <div class="field">
      <label for="accessPrereqs">Access and approvals</label>
      <textarea id="accessPrereqs" placeholder="RBAC, Entra approvals, GitHub org permissions, service principal approvals, allowlists, quota checks, who owns each prerequisite."></textarea>
    </div>

    <div class="row2">
      <div class="field">
        <label for="logisticsNotes">Logistics and delivery setup</label>
        <textarea id="logisticsNotes" placeholder="In-person or remote? Wi-Fi assumptions, breakout rooms, tenant handoff, machine setup path, fallback demo path, facilitator-to-attendee ratio."></textarea>
      </div>
      <div class="field">
        <label for="knownBlockers">Known blockers and risks</label>
        <textarea id="knownBlockers" placeholder="Security concerns, approvals still pending, customer skepticism, prior failed POCs, missing quota, time risk, unsupported services."></textarea>
      </div>
    </div>

    <div class="field">
      <label for="conversationInsights">Conversation notes / decision history</label>
      <textarea id="conversationInsights" placeholder="Discovery notes, stakeholder concerns, objections, internal prep notes, decisions already made, what the customer has already seen."></textarea>
      <div class="toggle-row">
${workIqEnabled ? '        <label class="toggle"><input type="checkbox" id="useWorkIqInsights">Use WorkIQ MCP insights and prior materials if configured</label>' : '        <input type="hidden" id="useWorkIqInsights" value="false" />'}
      </div>
    </div>

    <div class="group-title">Compliance</div>
    <div class="chips" id="complianceChips"></div>
  </section>

  <section class="panel" data-step="3">
    <h2>3. Experience Design</h2>
    <div class="intro">Separate facilitator needs from participant experience. Forge should generate both the participant path and the instructor operating model.</div>

    <div class="row2">
      <div class="field">
        <label for="facilitatorProfile">Facilitator guide focus</label>
        <textarea id="facilitatorProfile" placeholder="Who is leading? What do facilitators need: speaker notes, answer key, demo fallback, escalation path, timing control, judge rubric, room checkpoints."></textarea>
      </div>
      <div class="field">
        <label for="participantProfile">Participant experience</label>
        <textarea id="participantProfile" placeholder="What should participants experience? Example: guided build, pair debugging, team-based challenge flow, architecture trade-off discussion, take-home assets."></textarea>
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label for="supportModel">Support model</label>
        <select id="supportModel">
          <option value="light-touch">Light-touch</option>
          <option value="guided" selected>Guided</option>
          <option value="high-touch">High-touch</option>
        </select>
      </div>
      <div class="field">
        <label for="participantGrouping">Participant grouping</label>
        <select id="participantGrouping">
          <option value="individual">Individual</option>
          <option value="pairs">Pairs</option>
          <option value="teams" selected>Teams</option>
        </select>
      </div>
      <div class="field">
        <label for="emphasis">Emphasis</label>
        <select id="emphasis">
          <option selected>Balanced (architecture + hands-on)</option>
          <option>Hands-on heavy</option>
          <option>Architecture heavy</option>
          <option>Security-first (DevSecOps)</option>
          <option>AI-first (GenAI, RAG, Copilot)</option>
          <option>Cost-optimized</option>
        </select>
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label for="sessionStructure">Structure</label>
        <select id="sessionStructure">
          <option value="theory">Theory-heavy</option>
          <option value="demo">Demo-heavy</option>
          <option value="hands-on">Hands-on</option>
          <option value="mixed" selected>Mixed</option>
        </select>
      </div>
      <div class="field">
        <label for="sessionInteractivity">Interactivity</label>
        <select id="sessionInteractivity">
          <option value="low">Low</option>
          <option value="medium" selected>Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="field">
        <label for="sessionFormat">Format</label>
        <select id="sessionFormat">
          <option value="in-person">In-person</option>
          <option value="virtual">Virtual</option>
          <option value="hybrid" selected>Hybrid</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="sessionTopics">Topics / flow to cover</label>
      <textarea id="sessionTopics" placeholder="Key concepts, live demos, workshop modules, judging moments, architecture reviews, or debrief topics."></textarea>
    </div>

    <div class="field">
      <label for="sessionWrapUp">Wrap-up and handoff</label>
      <textarea id="sessionWrapUp" placeholder="What should attendees leave with? What should the facilitator debrief? What follow-up asks or next-step CTAs should be included?"></textarea>
    </div>
  </section>

  <section class="panel" data-step="4">
    <h2>4. Technical Scope</h2>
    <div class="intro">Define the technologies and the execution preferences. Forge will adapt the generated assets for the engagement mode you selected earlier.</div>

    <div class="group-title">Azure</div>
    <div class="chips" id="azureChips"></div>
    <div class="group-title">GitHub</div>
    <div class="chips" id="githubChips"></div>
    <div class="group-title">AI / Data</div>
    <div class="chips" id="aiChips"></div>

    <div class="field" style="margin-top:10px;">
      <label for="customTech">Custom technologies</label>
      <input id="customTech" placeholder="Type a technology name and press Enter..." />
      <div class="chips" id="customTechChips" style="margin-top:6px;"></div>
      <div class="hint">Add technologies not in the curated lists, such as Dapr, Pulumi, Redis, Backstage, or customer-specific tools.</div>
    </div>

    <div class="row3">
      <div class="field">
        <label for="model">Model</label>
        <select id="model">
          <option value="gpt-4.1" selected>gpt-4.1</option>
          <option value="claude-sonnet-4.5">claude-sonnet-4.5</option>
          <option value="gpt-5">gpt-5</option>
        </select>
      </div>
      <div class="field">
        <label for="sessionSlides">Slide count target</label>
        <input id="sessionSlides" type="number" min="3" max="120" />
      </div>
      <div class="field">
        <label for="sessionIntro">Intro depth</label>
        <select id="sessionIntro">
          <option value="assume-expertise">Assume expertise</option>
          <option value="light-intro" selected>Light intro</option>
          <option value="full-intro">Full intro</option>
        </select>
      </div>
    </div>

    <div class="outputs">
      <strong>Lab and execution options</strong>
      <div class="group-title" style="margin-top:0;">Lab components</div>
      <div class="chips" id="labComponents"></div>
      <div class="row3" style="margin-top:10px;">
        <div class="field">
          <label for="labCount">Number of labs / modules</label>
          <input id="labCount" type="number" min="1" max="20" />
        </div>
        <div class="field">
          <label for="labRuntime">Runtime</label>
          <select id="labRuntime">
            <option value="mixed" selected>Mixed</option>
            <option value="bash">bash only</option>
            <option value="pwsh">PowerShell only</option>
            <option value="actions">GitHub Actions workflows</option>
          </select>
        </div>
        <div class="field">
          <label for="labIac">IaC flavor</label>
          <select id="labIac">
            <option value="bicep" selected>Bicep</option>
            <option value="azd">azd (+ Bicep)</option>
            <option value="terraform">Terraform</option>
            <option value="arm">ARM templates</option>
            <option value="none">No IaC</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Lab depth</label>
        <div class="radio-group">
          <label><input type="radio" name="labDepth" value="standard"><span class="rlabel">Standard</span></label>
          <label><input type="radio" name="labDepth" value="exhaustive" checked><span class="rlabel">Exhaustive</span></label>
        </div>
      </div>
      <div class="toggle-row">
        <label class="toggle"><input type="checkbox" id="labTimings" checked>Per-step timings</label>
        <label class="toggle"><input type="checkbox" id="labCost" checked>Cost and cleanup</label>
        <label class="toggle"><input type="checkbox" id="labSec" checked>Security review</label>
        <label class="toggle"><input type="checkbox" id="labOut" checked>Expected outputs</label>
      </div>

      <div class="group-title">Session components</div>
      <div class="chips" id="sessionComponents"></div>
    </div>
  </section>

  <section class="panel" data-step="5">
    <h2>5. Review and Generate</h2>
    <div class="intro">Check the generated brief summary before you run Forge. The summary emphasizes engagement mode, readiness risk, and the facilitator / participant split.</div>
    <div class="summary" id="reviewSummary"></div>
  </section>

  <div class="footer">
    <button id="resetBtn">Reset</button>
    <button id="templateBtn" title="Start from a pre-built template">$(library) Templates</button>
    <div class="grow"></div>
    <div class="error" id="error"></div>
    <button id="prevBtn">Back</button>
    <button id="nextBtn">Next</button>
    <button class="primary" id="submitBtn">Generate package</button>
  </div>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  const stepMeta = [
    { id: 1, title: "Goal", subtitle: "Mode + success" },
    { id: 2, title: "Readiness", subtitle: "Gaps + blockers" },
    { id: 3, title: "Experience", subtitle: "Facilitator + participant" },
    { id: 4, title: "Scope", subtitle: "Tech + options" },
    { id: 5, title: "Review", subtitle: "Generate" }
  ];

  const compliance = ["GDPR", "HIPAA", "PCI-DSS", "SOC 2", "ISO 27001", "FedRAMP", "Azure Gov", "EU Data Boundary"];
  const azure = ["AKS", "Container Apps", "App Service", "Functions", "ACR", "API Management", "Key Vault", "Entra ID", "Azure Monitor", "Log Analytics", "Azure DevOps", "Bicep", "Terraform", "azd", "Front Door", "Private Link"];
  const github = ["GitHub Actions", "GHAS", "Copilot", "Codespaces", "Packages", "Projects", "OIDC federation", "Dependabot", "Environments & Protection Rules"];
  const aiData = ["Azure OpenAI", "AI Foundry", "Cosmos DB", "Azure SQL", "PostgreSQL Flex", "AI Search", "Fabric", "Synapse", "Event Hubs", "Service Bus"];
  const labComponents = [
    { id: "prereqs", label: "Prerequisites" },
    { id: "role-assignments", label: "Role assignments" },
    { id: "provisioning", label: "Provisioning (IaC)" },
    { id: "app-deploy", label: "App deploy" },
    { id: "config", label: "Configuration" },
    { id: "gatekeeper-run", label: "Gatekeeper run" },
    { id: "troubleshooting", label: "Troubleshooting" },
    { id: "cleanup", label: "Cleanup" }
  ];
  const sessionComponents = [
    { id: "talk-track", label: "Talk track" },
    { id: "slide-outline", label: "Slide outline" },
    { id: "speaker-notes", label: "Speaker notes" },
    { id: "demo-script", label: "Demo script" },
    { id: "workshop", label: "Workshop exercises" },
    { id: "qa-prompts", label: "Q&A prompts" },
    { id: "pre-reads", label: "Pre-reads" },
    { id: "follow-up", label: "Follow-up" },
    { id: "recording-checklist", label: "Recording checklist" }
  ];
  const modes = [
    { id: "workshop", name: "Workshop", desc: "Labs, challenges, facilitator kit, and architecture with practical delivery assets.", hint: "Best when the room must leave able to do the work." },
    { id: "hackathon", name: "Hackathon", desc: "Team-based modules, judging, challenge flow, gatekeepers, and facilitator operations.", hint: "Best when collaboration, checkpoints, and judging matter." },
    { id: "briefing", name: "Briefing", desc: "Architecture-first session package, onboarding, and follow-up decision support.", hint: "Best for architecture alignment and executive / architect workshops." },
    { id: "poc", name: "POC Accelerator", desc: "Reference architecture, scoped labs, validation path, and customer handoff assets.", hint: "Best when the customer needs a near-term implementation path." },
    { id: "bootcamp", name: "Enablement Bootcamp", desc: "Training-oriented labs, instructor notes, practice exercises, and readiness validators.", hint: "Best for multi-module upskilling." }
  ];
  const modeDeliverables = ${JSON.stringify(MODE_DELIVERABLES)};
  const tenantHints = {
    customer: "Customer-owned tenant and org. Assume approvals must be explicit and every blocked prerequisite needs a clear owner.",
    microsoft: "Microsoft sandbox or internal tenant. Prefer fast iteration and short-lived environments.",
    personal: "Personal sandbox. Keep costs low and call out anything that requires paid SKU or enterprise org features."
  };

  const fieldIds = [
    "customerName", "industry", "customerContext", "definitionOfSuccess", "audience", "skillLevel", "duration",
    "constraints", "environmentReadiness", "accessPrereqs", "logisticsNotes", "knownBlockers", "conversationInsights",
    "facilitatorProfile", "participantProfile", "sessionTopics", "sessionWrapUp", "emphasis", "model",
    "readinessStatus", "supportModel", "participantGrouping", "sessionStructure", "sessionInteractivity", "sessionFormat",
    "sessionSlides", "sessionIntro", "labCount", "labRuntime", "labIac"
  ];

  const state = {
    step: 1,
    mode: "workshop",
    compliance: new Set(),
    tech: new Set(),
    customTech: new Set(),
    labComponents: new Set(${JSON.stringify([...LAB_COMPONENT_IDS])}),
    sessionComponents: new Set(${JSON.stringify(DEFAULT_SESSION_OPTIONS.components)})
  };

  function loadState() {
    try {
      const prev = vscode.getState();
      if (!prev) return;
      for (const id of fieldIds) {
        const el = document.getElementById(id);
        if (el && prev.fields && prev.fields[id] !== undefined) el.value = prev.fields[id];
      }
      state.step = prev.step || 1;
      state.mode = prev.mode || "workshop";
      state.compliance = new Set(prev.compliance || []);
      state.tech = new Set(prev.tech || []);
      state.customTech = new Set(prev.customTech || []);
      state.labComponents = new Set(prev.labComponents || [...state.labComponents]);
      state.sessionComponents = new Set(prev.sessionComponents || [...state.sessionComponents]);
      if (prev.tenant) {
        const radio = document.querySelector('input[name="tenant"][value="' + prev.tenant + '"]');
        if (radio) radio.checked = true;
      }
      if (prev.labDepth) {
        const radio = document.querySelector('input[name="labDepth"][value="' + prev.labDepth + '"]');
        if (radio) radio.checked = true;
      }
      if (prev.toggles) {
        for (const [id, value] of Object.entries(prev.toggles)) {
          const el = document.getElementById(id);
          if (el) el.checked = !!value;
        }
      }
    } catch {
      // ignore stale webview state
    }
  }

  function saveState() {
    const fields = {};
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      if (el) fields[id] = el.value;
    }
    const toggles = {};
    for (const id of ["useWorkIqInsights", "labTimings", "labCost", "labSec", "labOut"]) {
      const el = document.getElementById(id);
      if (el) toggles[id] = !!el.checked;
    }
    vscode.setState({
      step: state.step,
      mode: state.mode,
      fields,
      tenant: getTenant(),
      labDepth: getLabDepth(),
      toggles,
      compliance: [...state.compliance],
      tech: [...state.tech],
      customTech: [...state.customTech],
      labComponents: [...state.labComponents],
      sessionComponents: [...state.sessionComponents]
    });
  }

  function getTenant() {
    const selected = document.querySelector('input[name="tenant"]:checked');
    return selected ? selected.value : "customer";
  }

  function getLabDepth() {
    const selected = document.querySelector('input[name="labDepth"]:checked');
    return selected ? selected.value : "exhaustive";
  }

  function derivedDeliverables() {
    return modeDeliverables[state.mode] || [];
  }

  function chip(container, value, label, set, onToggle) {
    const el = document.createElement("span");
    el.className = "chip" + (set.has(value) ? " selected" : "");
    el.textContent = label;
    el.onclick = () => {
      if (set.has(value)) set.delete(value); else set.add(value);
      onToggle();
      saveState();
    };
    container.appendChild(el);
  }

  function renderChipGroup(containerId, items, set, onToggle) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    for (const item of items) {
      const value = typeof item === "string" ? item : item.id;
      const label = typeof item === "string" ? item : item.label;
      chip(container, value, label, set, onToggle);
    }
  }

  function renderModeCards() {
    const container = document.getElementById("modeCards");
    container.innerHTML = "";
    for (const mode of modes) {
      const el = document.createElement("div");
      el.className = "card" + (state.mode === mode.id ? " active" : "");
      el.innerHTML = "<strong>" + mode.name + "</strong><small>" + mode.desc + "</small>";
      el.onclick = () => {
        state.mode = mode.id;
        syncModeDefaults();
        renderModeCards();
        renderModeOutputs();
        renderReview();
        saveState();
      };
      container.appendChild(el);
    }
  }

  function syncModeDefaults() {
    if (state.mode === "briefing") {
      document.getElementById("sessionStructure").value = "theory";
      document.getElementById("sessionInteractivity").value = "low";
      document.getElementById("emphasis").value = "Architecture heavy";
    } else if (state.mode === "hackathon") {
      document.getElementById("sessionStructure").value = "hands-on";
      document.getElementById("sessionInteractivity").value = "high";
      document.getElementById("emphasis").value = "Hands-on heavy";
    } else if (state.mode === "poc") {
      document.getElementById("sessionStructure").value = "demo";
      document.getElementById("sessionInteractivity").value = "medium";
      document.getElementById("emphasis").value = "Balanced (architecture + hands-on)";
    } else if (state.mode === "bootcamp") {
      document.getElementById("sessionStructure").value = "hands-on";
      document.getElementById("sessionInteractivity").value = "high";
      document.getElementById("emphasis").value = "Hands-on heavy";
    } else {
      document.getElementById("sessionStructure").value = "mixed";
      document.getElementById("sessionInteractivity").value = "medium";
      document.getElementById("emphasis").value = "Balanced (architecture + hands-on)";
    }
  }

  function renderModeOutputs() {
    const container = document.getElementById("modeOutputs");
    container.innerHTML = "";
    for (const item of derivedDeliverables()) {
      const el = document.createElement("span");
      el.className = "chip selected";
      el.textContent = item;
      container.appendChild(el);
    }
    const selectedMode = modes.find((mode) => mode.id === state.mode);
    document.getElementById("modeHint").textContent = selectedMode ? selectedMode.hint : "";
  }

  function renderCustomTechChips() {
    const container = document.getElementById("customTechChips");
    container.innerHTML = "";
    for (const tech of state.customTech) {
      const el = document.createElement("span");
      el.className = "chip selected";
      el.textContent = tech;
      el.onclick = () => {
        state.customTech.delete(tech);
        renderCustomTechChips();
        renderReview();
        saveState();
      };
      container.appendChild(el);
    }
  }

  function renderSteps() {
    const container = document.getElementById("steps");
    container.innerHTML = "";
    for (const meta of stepMeta) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "step-tab" + (state.step === meta.id ? " active" : "") + (state.step > meta.id ? " done" : "");
      el.innerHTML = "<strong>" + meta.title + "</strong><span>" + meta.subtitle + "</span>";
      el.onclick = () => setStep(meta.id);
      container.appendChild(el);
    }
  }

  function setStep(step) {
    state.step = Math.max(1, Math.min(5, step));
    for (const panel of document.querySelectorAll(".panel")) {
      panel.classList.toggle("active", Number(panel.dataset.step) === state.step);
    }
    renderSteps();
    renderReview();
    document.getElementById("prevBtn").disabled = state.step === 1;
    document.getElementById("nextBtn").style.display = state.step === 5 ? "none" : "inline-flex";
    document.getElementById("submitBtn").style.display = state.step === 5 ? "inline-flex" : "none";
    saveState();
  }

  function renderReview() {
    const summary = document.getElementById("reviewSummary");
    const technologies = [...state.tech, ...state.customTech];
    summary.innerHTML = [
      "<h3>Summary</h3>",
      "<ul>",
      "<li><strong>Mode:</strong> " + state.mode + "</li>",
      "<li><strong>Outputs:</strong> " + derivedDeliverables().join(", ") + "</li>",
      "<li><strong>Success:</strong> " + escapeHtml(document.getElementById("definitionOfSuccess").value || "(required)") + "</li>",
      "<li><strong>Readiness:</strong> " + escapeHtml(document.getElementById("readinessStatus").value || "yellow") + " - " + escapeHtml(document.getElementById("knownBlockers").value || "no blockers noted") + "</li>",
      "<li><strong>Facilitator focus:</strong> " + escapeHtml(document.getElementById("facilitatorProfile").value || "(not specified)") + "</li>",
      "<li><strong>Participant experience:</strong> " + escapeHtml(document.getElementById("participantProfile").value || "(required)") + "</li>",
      "<li><strong>Technologies:</strong> " + escapeHtml(technologies.join(", ") || "(required)") + "</li>",
      "</ul>"
    ].join("");
  }

  function renderAll() {
    renderSteps();
    renderModeCards();
    renderModeOutputs();
    renderChipGroup("complianceChips", compliance, state.compliance, renderReview);
    renderChipGroup("azureChips", azure, state.tech, renderReview);
    renderChipGroup("githubChips", github, state.tech, renderReview);
    renderChipGroup("aiChips", aiData, state.tech, renderReview);
    renderChipGroup("labComponents", labComponents, state.labComponents, renderReview);
    renderChipGroup("sessionComponents", sessionComponents, state.sessionComponents, renderReview);
    renderCustomTechChips();
    updateTenantHint();
    renderReview();
    setStep(state.step);
  }

  function updateTenantHint() {
    document.getElementById("tenantHint").textContent = tenantHints[getTenant()] || "";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function gather() {
    return {
      customerName: document.getElementById("customerName").value.trim(),
      industry: document.getElementById("industry").value,
      engagementMode: state.mode,
      customerContext: document.getElementById("customerContext").value.trim(),
      definitionOfSuccess: document.getElementById("definitionOfSuccess").value.trim(),
      conversationInsights: document.getElementById("conversationInsights").value.trim(),
      constraints: document.getElementById("constraints").value.trim(),
      complianceTags: [...state.compliance],
      tenant: getTenant(),
      audience: document.getElementById("audience").value,
      skillLevel: document.getElementById("skillLevel").value,
      duration: document.getElementById("duration").value,
      technologies: [...state.tech, ...state.customTech],
      deliverables: derivedDeliverables(),
      useWorkIqInsights: document.getElementById("useWorkIqInsights").checked,
      emphasis: document.getElementById("emphasis").value,
      model: document.getElementById("model").value,
      readiness: {
        status: document.getElementById("readinessStatus").value,
        environment: document.getElementById("environmentReadiness").value.trim(),
        accessAndApprovals: document.getElementById("accessPrereqs").value.trim(),
        logistics: document.getElementById("logisticsNotes").value.trim(),
        blockers: document.getElementById("knownBlockers").value.trim()
      },
      deliveryRoles: {
        facilitatorProfile: document.getElementById("facilitatorProfile").value.trim(),
        supportModel: document.getElementById("supportModel").value,
        participantProfile: document.getElementById("participantProfile").value.trim(),
        participantGrouping: document.getElementById("participantGrouping").value
      },
      labOptions: {
        components: [...state.labComponents],
        runtime: document.getElementById("labRuntime").value,
        iac: document.getElementById("labIac").value,
        labCount: document.getElementById("labCount").value,
        depth: getLabDepth(),
        includeTimings: document.getElementById("labTimings").checked,
        includeCost: document.getElementById("labCost").checked,
        includeSecurityReview: document.getElementById("labSec").checked,
        includeExpectedOutputs: document.getElementById("labOut").checked
      },
      sessionOptions: {
        components: [...state.sessionComponents],
        structure: document.getElementById("sessionStructure").value,
        slideCount: document.getElementById("sessionSlides").value,
        topics: document.getElementById("sessionTopics").value.trim(),
        introDepth: document.getElementById("sessionIntro").value,
        wrapUp: document.getElementById("sessionWrapUp").value.trim(),
        format: document.getElementById("sessionFormat").value,
        interactivity: document.getElementById("sessionInteractivity").value
      }
    };
  }

  function validate(brief) {
    if (!brief.customerName) return "Customer name is required.";
    if (!brief.customerContext) return "Customer context is required.";
    if (!brief.definitionOfSuccess) return "Definition of success is required.";
    if (brief.technologies.length === 0) return "Select at least one technology.";
    if (brief.deliverables.includes("lab") && brief.labOptions.components.length === 0) return "Select at least one lab section.";
    if (brief.deliverables.includes("session") && brief.sessionOptions.components.length === 0) return "Select at least one session component.";
    const govCompliance = brief.complianceTags.some((t) => t === "FedRAMP" || t === "Azure Gov");
    if (govCompliance && brief.tenant === "personal") return "FedRAMP / Azure Gov is incompatible with personal sandbox.";
    return "";
  }

  function reset() {
    vscode.setState(undefined);
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
    document.getElementById("duration").value = "4 hours";
    document.getElementById("audience").value = "Developers";
    document.getElementById("skillLevel").value = "Intermediate";
    document.getElementById("readinessStatus").value = "yellow";
    document.getElementById("supportModel").value = "guided";
    document.getElementById("participantGrouping").value = "teams";
    document.getElementById("sessionStructure").value = "mixed";
    document.getElementById("sessionInteractivity").value = "medium";
    document.getElementById("sessionFormat").value = "hybrid";
    document.getElementById("sessionIntro").value = "light-intro";
    document.getElementById("sessionSlides").value = "20";
    document.getElementById("labCount").value = "3";
    document.getElementById("labRuntime").value = "mixed";
    document.getElementById("labIac").value = "bicep";
    document.getElementById("emphasis").value = "Balanced (architecture + hands-on)";
    document.getElementById("model").value = "gpt-4.1";
    document.getElementById("useWorkIqInsights").checked = false;
    document.getElementById("labTimings").checked = true;
    document.getElementById("labCost").checked = true;
    document.getElementById("labSec").checked = true;
    document.getElementById("labOut").checked = true;
    document.querySelector('input[name="tenant"][value="customer"]').checked = true;
    document.querySelector('input[name="labDepth"][value="exhaustive"]').checked = true;
    state.step = 1;
    state.mode = "workshop";
    state.compliance.clear();
    state.tech.clear();
    state.customTech.clear();
    state.labComponents = new Set(${JSON.stringify([...LAB_COMPONENT_IDS])});
    state.sessionComponents = new Set(${JSON.stringify(DEFAULT_SESSION_OPTIONS.components)});
    document.getElementById("error").textContent = "";
    syncModeDefaults();
    renderAll();
    saveState();
  }

  document.getElementById("customTech").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const value = event.target.value.trim();
    if (value && !state.tech.has(value) && !state.customTech.has(value)) {
      state.customTech.add(value);
      renderCustomTechChips();
      renderReview();
      saveState();
    }
    event.target.value = "";
  });

  for (const id of fieldIds) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("change", () => {
      renderReview();
      saveState();
    });
    if (el.tagName === "TEXTAREA" || el.type === "text" || el.type === "number") {
      el.addEventListener("input", () => {
        renderReview();
        saveState();
      });
    }
  }
  document.querySelectorAll('input[name="tenant"]').forEach((el) => el.addEventListener("change", () => {
    updateTenantHint();
    renderReview();
    saveState();
  }));
  document.querySelectorAll('input[name="labDepth"]').forEach((el) => el.addEventListener("change", saveState));
  ["useWorkIqInsights", "labTimings", "labCost", "labSec", "labOut"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      renderReview();
      saveState();
    });
  });

  document.getElementById("prevBtn").onclick = () => setStep(state.step - 1);
  document.getElementById("nextBtn").onclick = () => setStep(state.step + 1);
  document.getElementById("resetBtn").onclick = reset;
  document.getElementById("templateBtn").onclick = () => vscode.postMessage({ type: "insertTemplate" });
  document.getElementById("submitBtn").onclick = () => {
    const brief = gather();
    const err = validate(brief);
    document.getElementById("error").textContent = err;
    if (err) return;
    setGeneratingUI(true);
    vscode.postMessage({ type: "submit", brief });
  };

  function setGeneratingUI(generating) {
    const btn = document.getElementById("submitBtn");
    btn.disabled = generating;
    btn.textContent = generating ? "Generating…" : "Generate package";
  }

  window.addEventListener("message", (e) => {
    if (e.data?.type === "setGenerating") setGeneratingUI(e.data.generating);
  });

  loadState();
  if (!document.getElementById("sessionSlides").value) document.getElementById("sessionSlides").value = "20";
  if (!document.getElementById("labCount").value) document.getElementById("labCount").value = "3";
  syncModeDefaults();
  renderAll();
</script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}
