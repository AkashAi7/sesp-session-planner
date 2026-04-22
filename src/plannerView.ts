import * as vscode from "vscode";

export type Deliverable =
  | "hackathon"
  | "lab"
  | "challenge"
  | "session"
  | "onboarding"
  | "gatekeeper"
  | "architecture";

export interface LabOptions {
  components: string[]; // subset of LAB_COMPONENT_IDS
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
  components: string[]; // subset of SESSION_COMPONENT_IDS
  structure: "theory" | "demo" | "hands-on" | "mixed";
  slideCount: string;
  topics: string;
  introDepth: "assume-expertise" | "light-intro" | "full-intro";
  wrapUp: string;
  format: "in-person" | "virtual" | "hybrid";
  interactivity: "low" | "medium" | "high";
}

export interface CustomerBrief {
  customerName: string;
  industry: string;
  customerContext: string;
  conversationInsights: string;
  constraints: string;
  complianceTags: string[];
  tenant: "customer" | "microsoft" | "personal";
  audience: string;
  skillLevel: string;
  duration: string;
  technologies: string[];
  deliverables: Deliverable[];
  engagementPreset: "custom" | "workshop" | "briefing" | "hackathon" | "poc";
  useWorkIqInsights: boolean;
  emphasis: string;
  model: string;
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

export class SespPlannerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sesp.plannerView";
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onSubmit: (brief: CustomerBrief) => void | Promise<void>
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "submit") await this.onSubmit(msg.brief as CustomerBrief);
    });
  }

  reveal() {
    this.view?.show?.(true);
  }

  private renderHtml(webview: vscode.Webview): string {
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
  :root { --radius: 6px; --gap: 10px; }
  body {
    font-family: var(--vscode-font-family); font-size: var(--vscode-font-size);
    color: var(--vscode-foreground); padding: 14px; margin: 0; background: transparent;
  }
  header { margin-bottom: 14px; }
  header h1 { font-size: 15px; margin: 0 0 2px 0; font-weight: 600; letter-spacing: 0.01em; }
  header .sub { color: var(--vscode-descriptionForeground); font-size: 12px; }

  details {
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, #3c3c3c));
    border-radius: var(--radius); margin-bottom: 10px;
    background: var(--vscode-editor-background);
  }
  details > summary {
    cursor: pointer; padding: 8px 10px; font-weight: 600; font-size: 12px;
    list-style: none; display: flex; align-items: center; gap: 8px; user-select: none;
  }
  details > summary::-webkit-details-marker { display: none; }
  details > summary .caret { transition: transform 120ms ease; opacity: 0.7; }
  details[open] > summary .caret { transform: rotate(90deg); }
  details > summary .pill {
    margin-left: auto; font-weight: 500; font-size: 10px;
    background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
    padding: 1px 8px; border-radius: 999px;
  }
  details > summary .pill.ok {
    background: var(--vscode-testing-iconPassed, #3fb950); color: #fff;
  }
  .section-body { padding: 4px 12px 12px; }

  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--gap); }
  label { font-weight: 600; font-size: 12px; }
  .hint { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
  input, textarea, select {
    width: 100%; box-sizing: border-box;
    background: var(--vscode-input-background); color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: var(--radius); padding: 6px 8px;
    font-family: inherit; font-size: inherit;
  }
  textarea { resize: vertical; min-height: 60px; }
  input:focus, textarea:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder);
  }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
  .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--gap); }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 4px 12px; border-radius: 999px;
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #555));
    background: var(--vscode-input-background, transparent); color: var(--vscode-foreground);
    font-size: 11px; cursor: pointer; user-select: none;
    transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
  }
  .chip:hover { border-color: var(--vscode-focusBorder); }
  .chip.selected {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background); font-weight: 600;
  }
  .chip.selected::before { content: "✓ "; font-weight: 700; }
  .chip.selected:hover { background: var(--vscode-button-hoverBackground); border-color: var(--vscode-button-hoverBackground); }

  .radio-group { display: flex; gap: 0; border: 1px solid var(--vscode-input-border, #555); border-radius: 999px; overflow: hidden; width: fit-content; }
  .radio-group label {
    padding: 0; font-size: 11px; cursor: pointer; user-select: none;
    color: var(--vscode-foreground); background: var(--vscode-input-background);
    border-right: 1px solid var(--vscode-input-border, #555); font-weight: 500;
  }
  .radio-group label:last-child { border-right: none; }
  .radio-group input[type="radio"] { display: none; }
  .radio-group input[type="radio"]:checked + .rlabel {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground); font-weight: 700;
  }
  .radio-group .rlabel { padding: 5px 14px; display: inline-block; transition: background 80ms ease; }
  .radio-group .rlabel:hover { background: var(--vscode-toolbar-hoverBackground, rgba(127,127,127,0.15)); }

  .group-title {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground); margin: 10px 0 4px;
  }

  .deliverables { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .del {
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #555));
    border-radius: var(--radius); padding: 9px; cursor: pointer; user-select: none;
    display: flex; gap: 8px; align-items: flex-start;
    background: var(--vscode-input-background, transparent);
    transition: border-color 80ms ease, background 80ms ease;
  }
  .del:hover { border-color: var(--vscode-focusBorder); }
  .del .box {
    width: 16px; height: 16px; border-radius: 3px;
    border: 1px solid var(--vscode-checkbox-border, var(--vscode-panel-border, #888));
    background: var(--vscode-checkbox-background, transparent);
    flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: var(--vscode-checkbox-foreground, inherit);
  }
  .del.selected {
    border-color: var(--vscode-button-background);
    background: color-mix(in srgb, var(--vscode-button-background) 18%, transparent);
  }
  .del.selected .box {
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .del .name { font-weight: 600; font-size: 12px; }
  .del .desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; line-height: 1.4; }

  /* Deliverable options sub-panels */
  .opts {
    margin-top: 10px; border: 1px dashed var(--vscode-panel-border, #555);
    border-radius: var(--radius); padding: 10px 12px;
    background: color-mix(in srgb, var(--vscode-button-background) 6%, transparent);
  }
  .opts .opts-title {
    font-weight: 700; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase;
    color: var(--vscode-foreground); margin-bottom: 8px;
  }
  .opts .opts-title::before { content: "⚙  "; opacity: 0.7; }
  .opts[data-hidden="true"] { display: none; }

  .toggle-row { display: flex; flex-wrap: wrap; gap: 10px 16px; margin-top: 6px; }
  .toggle {
    display: inline-flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer; user-select: none;
  }
  .toggle input[type="checkbox"] { margin: 0; accent-color: var(--vscode-button-background); }

  .actions {
    display: flex; gap: 8px; margin-top: 14px;
    position: sticky; bottom: 0;
    background: var(--vscode-sideBar-background, transparent);
    padding: 10px 0 4px;
  }
  button.primary {
    flex: 1; background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    border: 0; padding: 9px 12px; border-radius: var(--radius);
    cursor: pointer; font-weight: 600;
  }
  button.primary:disabled { opacity: 0.5; cursor: not-allowed; }
  button.primary:hover:not(:disabled) { background: var(--vscode-button-hoverBackground); }
  button.secondary {
    background: transparent; color: var(--vscode-foreground);
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    padding: 9px 12px; border-radius: var(--radius); cursor: pointer;
  }
  .error { color: var(--vscode-errorForeground); font-size: 11px; min-height: 14px; }
  .preset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .preset-btn {
    border: 1px solid var(--vscode-panel-border, #555);
    background: var(--vscode-input-background, transparent);
    color: var(--vscode-foreground);
    border-radius: var(--radius);
    padding: 10px; text-align: left; cursor: pointer;
  }
  .preset-btn strong { display: block; font-size: 12px; margin-bottom: 2px; }
  .preset-btn small { color: var(--vscode-descriptionForeground); font-size: 11px; }
  .preset-btn.active { border-color: var(--vscode-button-background); background: color-mix(in srgb, var(--vscode-button-background) 12%, transparent); }
</style>
</head>
<body>
<header>
  <h1>Forge — Customer Engagement Studio</h1>
  <div class="sub">Brief the customer scenario — Forge generates every selected deliverable and drops it into your workspace.</div>
</header>

<details open>
  <summary><span class="caret">▸</span> Quick presets <span class="pill">optional</span></summary>
  <div class="section-body">
    <div class="preset-grid" id="presetGrid"></div>
    <div class="hint">Presets pre-select deliverables and defaults. You can still change everything afterward.</div>
  </div>
</details>

<details open>
  <summary><span class="caret">▸</span> 1. Customer <span class="pill" id="pill-customer">required</span></summary>
  <div class="section-body">
    <div class="row2">
      <div class="field">
        <label for="customerName">Customer name</label>
        <input id="customerName" placeholder="Contoso Ltd." />
      </div>
      <div class="field">
        <label for="industry">Industry</label>
        <select id="industry">
          <option value="">— Select —</option>
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
      <label for="customerContext">Customer context</label>
      <textarea id="customerContext" placeholder="What's their current state, pain points, strategic goals, existing stack, cloud maturity, team size, motivation for this engagement…"></textarea>
    </div>
    <div class="field">
      <label for="conversationInsights">Conversation notes / insights</label>
      <textarea id="conversationInsights" placeholder="Paste discovery-call notes, stakeholder concerns, objections, internal meeting notes, or WorkIQ-exported conversation snippets here…"></textarea>
      <div class="hint">Used to ground the package in real customer conversations.</div>
    </div>
  </div>
</details>

<details open>
  <summary><span class="caret">▸</span> 2. Constraints &amp; environment <span class="pill">optional</span></summary>
  <div class="section-body">
    <div class="field">
      <label for="constraints">Constraints</label>
      <textarea id="constraints" placeholder="Budget limits, approved regions, data residency, network policies, allowed SKUs, blocked services, timing…"></textarea>
    </div>

    <div class="group-title">Compliance</div>
    <div class="chips" id="complianceChips"></div>

    <div class="group-title" style="margin-top:14px;">Target environment</div>
    <div class="radio-group" id="tenantGroup">
      <label><input type="radio" name="tenant" value="customer" checked><span class="rlabel">Customer tenant</span></label>
      <label><input type="radio" name="tenant" value="microsoft"><span class="rlabel">Microsoft tenant</span></label>
      <label><input type="radio" name="tenant" value="personal"><span class="rlabel">Personal sandbox</span></label>
    </div>
    <div class="hint" id="tenantHint"></div>
    <div class="toggle-row" style="margin-top:10px;">
      <label class="toggle"><input type="checkbox" id="useWorkIqInsights">Use WorkIQ MCP insights if configured</label>
    </div>

    <div class="row3" style="margin-top:10px;">
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
    </div>
  </div>
</details>

<details open>
  <summary><span class="caret">▸</span> 3. Technologies <span class="pill" id="pill-tech">0 selected</span></summary>
  <div class="section-body">
    <div class="group-title">Azure</div>
    <div class="chips" id="azureChips"></div>
    <div class="group-title">GitHub</div>
    <div class="chips" id="githubChips"></div>
    <div class="group-title">AI / Data</div>
    <div class="chips" id="aiChips"></div>
    <div class="field" style="margin-top:10px;">
      <label for="customTech">Custom technologies</label>
      <input id="customTech" placeholder="Type a technology name and press Enter…" />
      <div class="chips" id="customTechChips" style="margin-top:6px;"></div>
      <div class="hint">Add technologies not in the lists above (e.g. Dapr, Pulumi, Redis).</div>
    </div>
  </div>
</details>

<details open>
  <summary><span class="caret">▸</span> 4. Deliverables <span class="pill" id="pill-del">0 selected</span></summary>
  <div class="section-body">
    <div class="deliverables" id="delGrid"></div>

    <!-- Lab options — visible only when 'lab' deliverable is selected -->
    <div class="opts" id="labOpts" data-hidden="true">
      <div class="opts-title">Lab options</div>
      <div class="group-title" style="margin-top:0;">Sections to include per lab</div>
      <div class="chips" id="labComponents"></div>
      <div class="row3" style="margin-top:10px;">
        <div class="field">
          <label for="labCount">Number of labs</label>
          <input id="labCount" type="number" min="1" max="20" />
        </div>
        <div class="field">
          <label for="labRuntime">Script runtime</label>
          <select id="labRuntime">
            <option value="mixed" selected>Mixed (bash + pwsh where idiomatic)</option>
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
            <option value="none">No IaC (az CLI only)</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Lab depth</label>
        <div class="radio-group">
          <label><input type="radio" name="labDepth" value="standard"><span class="rlabel">Standard</span></label>
          <label><input type="radio" name="labDepth" value="exhaustive" checked><span class="rlabel">Exhaustive (recommended)</span></label>
        </div>
      </div>
      <div class="toggle-row">
        <label class="toggle"><input type="checkbox" id="labTimings" checked>Per-step time estimates</label>
        <label class="toggle"><input type="checkbox" id="labCost" checked>Cost summary &amp; cleanup</label>
        <label class="toggle"><input type="checkbox" id="labSec" checked>Security review checklist</label>
        <label class="toggle"><input type="checkbox" id="labOut" checked>Expected output per command</label>
      </div>
    </div>

    <!-- Session options — visible only when 'session' deliverable is selected -->
    <div class="opts" id="sessionOpts" data-hidden="true">
      <div class="opts-title">Session material options</div>

      <div class="group-title" style="margin-top:0;">Components to include</div>
      <div class="chips" id="sessionComponents"></div>

      <div class="field" style="margin-top:10px;">
        <label for="sessionTopics">Topics / outline to cover</label>
        <textarea id="sessionTopics" placeholder="One bullet per topic — e.g. 'Why GitHub Actions vs Azure Pipelines', 'Live demo: OIDC federation to Azure', 'Q&A on GHAS alert triage'…"></textarea>
        <div class="hint">Forge will use these as the session's skeleton; leave empty to let Forge propose a full outline.</div>
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
          <label for="sessionSlides">Slide count (approx.)</label>
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

      <div class="row3">
        <div class="field">
          <label for="sessionFormat">Format</label>
          <select id="sessionFormat">
            <option value="in-person">In-person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid" selected>Hybrid</option>
          </select>
        </div>
        <div class="field">
          <label for="sessionInteractivity">Interactivity</label>
          <select id="sessionInteractivity">
            <option value="low">Low (presentation)</option>
            <option value="medium" selected>Medium (polls, Q&amp;A)</option>
            <option value="high">High (workshop)</option>
          </select>
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <span class="hint">Slide count is a target — Forge will adjust for duration.</span>
        </div>
      </div>

      <div class="field">
        <label for="sessionWrapUp">Wrap-up / takeaways</label>
        <textarea id="sessionWrapUp" placeholder="What must the attendees be able to do or decide after the session? Follow-up offers, next-step CTAs, homework…"></textarea>
      </div>
    </div>

    <div class="field" style="margin-top:10px;">
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
    <div class="field">
      <label for="model">Model</label>
      <select id="model">
        <option value="gpt-4.1" selected>gpt-4.1</option>
        <option value="claude-sonnet-4.5">claude-sonnet-4.5</option>
        <option value="gpt-5">gpt-5</option>
      </select>
    </div>
  </div>
</details>

<div class="error" id="error"></div>
<div class="actions">
  <button class="primary" id="submit">Generate deliverables</button>
  <button class="secondary" id="reset">Reset</button>
</div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  const compliance = ["GDPR","HIPAA","PCI-DSS","SOC 2","ISO 27001","FedRAMP","Azure Gov","EU Data Boundary"];
  const azure = ["AKS","Container Apps","App Service","Functions","ACR","API Management","Key Vault","Entra ID","Azure Monitor","Log Analytics","Azure DevOps","Bicep","Terraform","azd","Front Door","Private Link"];
  const github = ["GitHub Actions","GHAS","Copilot","Codespaces","Packages","Projects","OIDC federation","Dependabot","Environments & Protection Rules"];
  const aiData = ["Azure OpenAI","AI Foundry","Cosmos DB","Azure SQL","PostgreSQL Flex","AI Search","Fabric","Synapse","Event Hubs","Service Bus"];

  const deliverables = [
    { id: "hackathon",    name: "Hackathon",    desc: "Full agenda with modules, challenges, gatekeepers" },
    { id: "lab",          name: "Labs",         desc: "End-to-end: provisioning → app → gatekeeper → troubleshooting → cleanup" },
    { id: "challenge",    name: "Challenges",   desc: "Goals + acceptance criteria + progressive hints; no full solution" },
    { id: "session",      name: "Session material", desc: "Session plan, talk track, slide outline, demo script" },
    { id: "architecture", name: "Architecture", desc: "Mix-and-match Azure + GitHub design with Mermaid" },
    { id: "onboarding",   name: "Onboarding",   desc: "Prereqs, setup scripts, readiness validator" },
    { id: "gatekeeper",   name: "Gatekeepers",  desc: "Validation scripts / GitHub Actions per challenge" }
  ];

  const labComponents = [
    { id: "prereqs",           label: "Prerequisites" },
    { id: "role-assignments",  label: "Role assignments" },
    { id: "provisioning",      label: "Provisioning (IaC)" },
    { id: "app-deploy",        label: "App deploy" },
    { id: "config",            label: "Configuration" },
    { id: "gatekeeper-run",    label: "Gatekeeper run" },
    { id: "troubleshooting",   label: "Troubleshooting" },
    { id: "cleanup",           label: "Cleanup" }
  ];
  const sessionComponents = [
    { id: "talk-track",         label: "Talk track (with timing)" },
    { id: "slide-outline",      label: "Slide outline" },
    { id: "speaker-notes",      label: "Speaker notes" },
    { id: "demo-script",        label: "Demo script" },
    { id: "workshop",           label: "Workshop exercises" },
    { id: "qa-prompts",         label: "Q&A prompts" },
    { id: "pre-reads",          label: "Pre-reads" },
    { id: "follow-up",          label: "Post-session follow-up" },
    { id: "recording-checklist",label: "Recording checklist" }
  ];

  const TENANT_HINTS = {
    customer: "Generates IaC / commands that assume they will run inside the customer's own tenant and subscription. Scripts will use parameterized subscription / tenant / org placeholders and call out required customer consents.",
    microsoft: "Assumes you will dry-run this inside a Microsoft internal sandbox subscription where you already have Owner. Prefers short-lived resource groups and cleanup scripts.",
    personal: "Assumes a personal Azure subscription / GitHub user account. Prefers free tiers and low-cost SKUs; flags anything that needs a paid SKU."
  };

  const presets = [
    { id: "workshop", name: "Hands-on workshop", desc: "Labs + challenges + gatekeepers + onboarding" },
    { id: "briefing", name: "Customer briefing", desc: "Session + architecture + follow-up package" },
    { id: "hackathon", name: "Hackathon day", desc: "Agenda + labs + challenges + gatekeepers" },
    { id: "poc", name: "POC package", desc: "Architecture + labs + onboarding + session handoff" }
  ];

  const state = {
    preset: "custom",
    compliance: new Set(),
    tech: new Set(),
    customTech: new Set(),
    deliverables: new Set(["lab","challenge","gatekeeper"]),
    labComponents: new Set(${JSON.stringify([...LAB_COMPONENT_IDS])}),
    sessionComponents: new Set(${JSON.stringify(DEFAULT_SESSION_OPTIONS.components)})
  };

  function loadState() {
    try {
      const prev = vscode.getState();
      if (prev) {
        for (const k of Object.keys(prev.fields || {})) {
          const el = document.getElementById(k);
          if (el) el.value = prev.fields[k];
        }
        if (prev.tenant) {
          const r = document.querySelector('input[name="tenant"][value="' + prev.tenant + '"]');
          if (r) r.checked = true;
        }
        if (prev.labDepth) {
          const r = document.querySelector('input[name="labDepth"][value="' + prev.labDepth + '"]');
          if (r) r.checked = true;
        }
        if (prev.labToggles) {
          for (const [id,v] of Object.entries(prev.labToggles)) {
            const el = document.getElementById(id);
            if (el) el.checked = !!v;
          }
        }
        if (prev.useWorkIqInsights) {
          const workIqToggle = document.getElementById("useWorkIqInsights");
          if (workIqToggle) workIqToggle.checked = !!prev.useWorkIqInsights;
        }
        if (prev.preset) state.preset = prev.preset;
        state.compliance = new Set(prev.compliance || []);
        state.tech = new Set(prev.tech || []);
        state.customTech = new Set(prev.customTech || []);
        state.deliverables = new Set(prev.deliverables || ["lab","challenge","gatekeeper"]);
        state.labComponents = new Set(prev.labComponents || [...state.labComponents]);
        state.sessionComponents = new Set(prev.sessionComponents || [...state.sessionComponents]);
      }
    } catch {}
  }

  function getTenant() {
    const r = document.querySelector('input[name="tenant"]:checked');
    return r ? r.value : "customer";
  }
  function getLabDepth() {
    const r = document.querySelector('input[name="labDepth"]:checked');
    return r ? r.value : "exhaustive";
  }

  function saveState() {
    const fieldIds = ["customerName","industry","customerContext","conversationInsights","constraints","duration","audience","skillLevel","emphasis","model",
      "labCount","labRuntime","labIac",
      "sessionTopics","sessionStructure","sessionSlides","sessionIntro","sessionFormat","sessionInteractivity","sessionWrapUp"];
    const fields = {};
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      if (el) fields[id] = el.value;
    }
    const labToggles = {};
    for (const id of ["labTimings","labCost","labSec","labOut"]) {
      const el = document.getElementById(id);
      if (el) labToggles[id] = el.checked;
    }
    vscode.setState({
      fields,
      tenant: getTenant(),
      preset: state.preset,
      useWorkIqInsights: document.getElementById("useWorkIqInsights").checked,
      labDepth: getLabDepth(),
      labToggles,
      compliance: [...state.compliance],
      tech: [...state.tech],
      customTech: [...state.customTech],
      deliverables: [...state.deliverables],
      labComponents: [...state.labComponents],
      sessionComponents: [...state.sessionComponents]
    });
  }

  function renderPresets() {
    const grid = document.getElementById("presetGrid");
    grid.innerHTML = "";
    for (const preset of presets) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "preset-btn" + (state.preset === preset.id ? " active" : "");
      el.innerHTML = "<strong>" + preset.name + "</strong><small>" + preset.desc + "</small>";
      el.onclick = () => applyPreset(preset.id);
      grid.appendChild(el);
    }
  }

  function applyPreset(presetId) {
    state.preset = presetId;
    if (presetId === "workshop") {
      state.deliverables = new Set(["lab","challenge","gatekeeper","onboarding"]);
      document.getElementById("emphasis").value = "Hands-on heavy";
      document.getElementById("sessionStructure").value = "hands-on";
    } else if (presetId === "briefing") {
      state.deliverables = new Set(["session","architecture","onboarding"]);
      document.getElementById("emphasis").value = "Architecture heavy";
      document.getElementById("sessionStructure").value = "theory";
    } else if (presetId === "hackathon") {
      state.deliverables = new Set(["hackathon","lab","challenge","gatekeeper","onboarding"]);
      document.getElementById("emphasis").value = "Balanced (architecture + hands-on)";
      document.getElementById("sessionStructure").value = "mixed";
    } else if (presetId === "poc") {
      state.deliverables = new Set(["architecture","lab","onboarding","session"]);
      document.getElementById("emphasis").value = "Balanced (architecture + hands-on)";
      document.getElementById("sessionStructure").value = "demo";
    }
    renderPresets();
    renderDeliverables();
    updateDelPill();
    updateOptsVisibility();
    saveState();
  }

  function chip(container, value, label, set, onToggle) {
    const el = document.createElement("span");
    el.className = "chip" + (set.has(value) ? " selected" : "");
    el.textContent = label;
    el.onclick = () => {
      if (set.has(value)) { set.delete(value); el.classList.remove("selected"); }
      else { set.add(value); el.classList.add("selected"); }
      onToggle();
      saveState();
    };
    container.appendChild(el);
  }
  function renderChipGroup(containerId, items, set, onToggle, labelAccessor) {
    const c = document.getElementById(containerId);
    c.innerHTML = "";
    for (const t of items) {
      const value = typeof t === "string" ? t : t.id;
      const label = typeof t === "string" ? t : (labelAccessor ? labelAccessor(t) : t.label);
      chip(c, value, label, set, onToggle);
    }
  }

  function updateTechPill() {
    const p = document.getElementById("pill-tech");
    const count = state.tech.size + state.customTech.size;
    p.textContent = count + " selected";
    p.classList.toggle("ok", count > 0);
  }
  function updateDelPill() {
    const p = document.getElementById("pill-del");
    p.textContent = state.deliverables.size + " selected";
    p.classList.toggle("ok", state.deliverables.size > 0);
  }
  function updateCustomerPill() {
    const ok = document.getElementById("customerName").value.trim() && document.getElementById("customerContext").value.trim();
    const p = document.getElementById("pill-customer");
    p.textContent = ok ? "ready" : "required";
    p.classList.toggle("ok", !!ok);
  }
  function updateTenantHint() {
    document.getElementById("tenantHint").textContent = TENANT_HINTS[getTenant()] || "";
  }
  function updateOptsVisibility() {
    document.getElementById("labOpts").dataset.hidden     = state.deliverables.has("lab") ? "false" : "true";
    document.getElementById("sessionOpts").dataset.hidden = state.deliverables.has("session") ? "false" : "true";
  }

  function renderDeliverables() {
    const grid = document.getElementById("delGrid");
    grid.innerHTML = "";
    for (const d of deliverables) {
      const el = document.createElement("div");
      const selected = state.deliverables.has(d.id);
      el.className = "del" + (selected ? " selected" : "");
      el.innerHTML = '<div class="box">' + (selected ? "✓" : "") + '</div><div><div class="name">' + d.name + '</div><div class="desc">' + d.desc + '</div></div>';
      el.onclick = () => {
        if (state.deliverables.has(d.id)) state.deliverables.delete(d.id); else state.deliverables.add(d.id);
        renderDeliverables();
        updateDelPill();
        updateOptsVisibility();
        saveState();
      };
      grid.appendChild(el);
    }
  }

  function renderAll() {
    renderPresets();
    renderChipGroup("complianceChips", compliance, state.compliance, () => saveState());
    renderChipGroup("azureChips", azure, state.tech, updateTechPill);
    renderChipGroup("githubChips", github, state.tech, updateTechPill);
    renderChipGroup("aiChips", aiData, state.tech, updateTechPill);
    renderChipGroup("labComponents", labComponents, state.labComponents, () => saveState());
    renderChipGroup("sessionComponents", sessionComponents, state.sessionComponents, () => saveState());
    renderCustomTechChips();
    renderDeliverables();
    updateTechPill(); updateDelPill(); updateCustomerPill();
    updateTenantHint(); updateOptsVisibility();
  }

  function renderCustomTechChips() {
    const c = document.getElementById("customTechChips");
    c.innerHTML = "";
    for (const t of state.customTech) {
      const el = document.createElement("span");
      el.className = "chip selected";
      el.textContent = t;
      el.onclick = () => {
        state.customTech.delete(t);
        renderCustomTechChips();
        updateTechPill();
        saveState();
      };
      c.appendChild(el);
    }
  }
  document.getElementById("customTech").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = e.target;
      const val = input.value.trim();
      if (val && !state.tech.has(val) && !state.customTech.has(val)) {
        state.customTech.add(val);
        renderCustomTechChips();
        updateTechPill();
        saveState();
      }
      input.value = "";
    }
  });

  function gather() {
    return {
      customerName: document.getElementById("customerName").value.trim(),
      industry: document.getElementById("industry").value,
      customerContext: document.getElementById("customerContext").value.trim(),
      conversationInsights: document.getElementById("conversationInsights").value.trim(),
      constraints: document.getElementById("constraints").value.trim(),
      complianceTags: [...state.compliance],
      tenant: getTenant(),
      audience: document.getElementById("audience").value,
      skillLevel: document.getElementById("skillLevel").value,
      duration: document.getElementById("duration").value,
      technologies: [...state.tech, ...state.customTech],
      deliverables: [...state.deliverables],
      engagementPreset: state.preset,
      useWorkIqInsights: document.getElementById("useWorkIqInsights").checked,
      emphasis: document.getElementById("emphasis").value,
      model: document.getElementById("model").value,
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

  function validate(b) {
    if (!b.customerName) return "Customer name is required.";
    if (!b.customerContext) return "Customer context is required.";
    if (b.deliverables.length === 0) return "Select at least one deliverable.";
    if (b.technologies.length === 0) return "Select at least one technology.";
    if (b.deliverables.includes("lab") && b.labOptions.components.length === 0) return "Select at least one lab section to include.";
    if (b.deliverables.includes("session") && b.sessionOptions.components.length === 0) return "Select at least one session component.";
    // Contradiction checks
    const govCompliance = b.complianceTags.some(t => t === "FedRAMP" || t === "Azure Gov");
    if (govCompliance && b.tenant === "personal") return "FedRAMP / Azure Gov is incompatible with personal sandbox. Use customer or Microsoft tenant.";
    if (b.deliverables.includes("gatekeeper") && !b.deliverables.includes("challenge") && !b.deliverables.includes("lab")) return "Gatekeepers need at least one challenge or lab to validate.";
    return "";
  }

  // Default values
  document.getElementById("labCount").value = "3";
  document.getElementById("sessionSlides").value = "20";

  document.getElementById("submit").onclick = () => {
    const brief = gather();
    const err = validate(brief);
    const errEl = document.getElementById("error");
    errEl.textContent = err;
    if (err) return;
    vscode.postMessage({ type: "submit", brief });
  };
  document.getElementById("reset").onclick = () => {
    vscode.setState(undefined);
    for (const id of ["customerName","industry","customerContext","conversationInsights","constraints","sessionTopics","sessionWrapUp"]) document.getElementById(id).value = "";
    document.querySelector('input[name="tenant"][value="customer"]').checked = true;
    document.querySelector('input[name="labDepth"][value="exhaustive"]').checked = true;
    document.getElementById("useWorkIqInsights").checked = false;
    document.getElementById("duration").selectedIndex = 2;
    document.getElementById("audience").selectedIndex = 0;
    document.getElementById("skillLevel").selectedIndex = 1;
    document.getElementById("emphasis").selectedIndex = 0;
    document.getElementById("model").selectedIndex = 0;
    document.getElementById("labCount").value = "3";
    document.getElementById("labRuntime").value = "mixed";
    document.getElementById("labIac").value = "bicep";
    for (const id of ["labTimings","labCost","labSec","labOut"]) document.getElementById(id).checked = true;
    document.getElementById("sessionStructure").value = "mixed";
    document.getElementById("sessionSlides").value = "20";
    document.getElementById("sessionIntro").value = "light-intro";
    document.getElementById("sessionFormat").value = "hybrid";
    document.getElementById("sessionInteractivity").value = "medium";
    state.preset = "custom";
    state.compliance.clear();
    state.tech.clear();
    state.customTech.clear();
    state.deliverables = new Set(["lab","challenge","gatekeeper"]);
    state.labComponents = new Set(${JSON.stringify([...LAB_COMPONENT_IDS])});
    state.sessionComponents = new Set(${JSON.stringify(DEFAULT_SESSION_OPTIONS.components)});
    document.getElementById("error").textContent = "";
    renderAll();
  };

  ["customerName","customerContext","conversationInsights"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => { updateCustomerPill(); saveState(); });
  });
  [
    "industry","constraints","duration","audience","skillLevel","emphasis","model",
    "labCount","labRuntime","labIac",
    "sessionTopics","sessionStructure","sessionSlides","sessionIntro","sessionFormat","sessionInteractivity","sessionWrapUp"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", saveState);
    if (el && (el.tagName === "TEXTAREA" || el.type === "number" || el.type === "text")) el.addEventListener("input", saveState);
  });
  document.querySelectorAll('input[name="tenant"]').forEach((r) => {
    r.addEventListener("change", () => { updateTenantHint(); saveState(); });
  });
  document.querySelectorAll('input[name="labDepth"]').forEach((r) => {
    r.addEventListener("change", saveState);
  });
  for (const id of ["labTimings","labCost","labSec","labOut"]) {
    document.getElementById(id).addEventListener("change", saveState);
  }
  document.getElementById("useWorkIqInsights").addEventListener("change", saveState);

  loadState();
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
