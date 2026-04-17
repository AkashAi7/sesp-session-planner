import * as vscode from "vscode";

export type Deliverable =
  | "hackathon"
  | "lab"
  | "challenge"
  | "session"
  | "onboarding"
  | "gatekeeper"
  | "architecture";

export interface CustomerBrief {
  customerName: string;
  industry: string;
  customerContext: string;
  constraints: string;
  complianceTags: string[];
  tenant: "customer" | "microsoft" | "personal";
  audience: string;
  skillLevel: string;
  duration: string;
  technologies: string[];
  deliverables: Deliverable[];
  emphasis: string;
  model: string;
}

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
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    padding: 14px; margin: 0; background: transparent;
  }
  header { margin-bottom: 14px; }
  header h1 { font-size: 15px; margin: 0 0 2px 0; font-weight: 600; letter-spacing: 0.01em; }
  header .sub { color: var(--vscode-descriptionForeground); font-size: 12px; }

  details {
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, #3c3c3c));
    border-radius: var(--radius);
    margin-bottom: 10px;
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
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 1px 8px; border-radius: 999px;
  }
  details > summary .pill.ok {
    background: var(--vscode-testing-iconPassed, #3fb950);
    color: #fff;
  }
  .section-body { padding: 4px 12px 12px; }

  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--gap); }
  label { font-weight: 600; font-size: 12px; }
  .hint { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
  input, textarea, select {
    width: 100%; box-sizing: border-box;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: var(--radius); padding: 6px 8px;
    font-family: inherit; font-size: inherit;
  }
  textarea { resize: vertical; min-height: 60px; }
  input:focus, textarea:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
  }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
  .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--gap); }

  /* Chips — capsules with a clearly visible selected state */
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 4px 12px; border-radius: 999px;
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #555));
    background: var(--vscode-input-background, transparent);
    color: var(--vscode-foreground);
    font-size: 11px; cursor: pointer; user-select: none;
    transition: background 80ms ease, border-color 80ms ease, color 80ms ease;
  }
  .chip:hover {
    border-color: var(--vscode-focusBorder);
  }
  .chip.selected {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
    font-weight: 600;
  }
  .chip.selected::before {
    content: "✓ ";
    font-weight: 700;
  }
  .chip.selected:hover {
    background: var(--vscode-button-hoverBackground);
    border-color: var(--vscode-button-hoverBackground);
  }

  /* Radio-group (capsule-shaped segmented control) */
  .radio-group { display: flex; gap: 0; border: 1px solid var(--vscode-input-border, #555); border-radius: 999px; overflow: hidden; width: fit-content; }
  .radio-group label {
    padding: 5px 14px; font-size: 11px; cursor: pointer; user-select: none;
    color: var(--vscode-foreground); background: var(--vscode-input-background);
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
  .radio-group .rlabel {
    padding: 5px 14px; display: inline-block; transition: background 80ms ease;
  }
  .radio-group .rlabel:hover { background: var(--vscode-toolbar-hoverBackground, rgba(127,127,127,0.15)); }

  .group-title {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground); margin: 10px 0 4px;
  }

  .deliverables { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .del {
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border, #555));
    border-radius: var(--radius);
    padding: 9px; cursor: pointer; user-select: none;
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
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .del .name { font-weight: 600; font-size: 12px; }
  .del .desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; line-height: 1.4; }

  .actions {
    display: flex; gap: 8px; margin-top: 14px;
    position: sticky; bottom: 0;
    background: var(--vscode-sideBar-background, transparent);
    padding: 10px 0 4px;
  }
  button.primary {
    flex: 1; background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
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
</style>
</head>
<body>
<header>
  <h1>Forge — Customer Engagement Studio</h1>
  <div class="sub">Brief the customer scenario — Forge generates every selected deliverable and drops it into your workspace.</div>
</header>

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
  </div>
</details>

<details open>
  <summary><span class="caret">▸</span> 4. Deliverables <span class="pill" id="pill-del">0 selected</span></summary>
  <div class="section-body">
    <div class="deliverables" id="delGrid"></div>
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

  const TENANT_HINTS = {
    customer: "Generates IaC / commands that assume they will run inside the customer's own tenant and subscription. Scripts will use parameterized subscription / tenant / org placeholders and call out required customer consents.",
    microsoft: "Assumes you will dry-run this inside a Microsoft internal sandbox subscription where you already have Owner. Prefers short-lived resource groups and cleanup scripts.",
    personal: "Assumes a personal Azure subscription / GitHub user account. Prefers free tiers and low-cost SKUs; flags anything that needs a paid SKU."
  };

  const state = {
    compliance: new Set(),
    tech: new Set(),
    deliverables: new Set(["lab","challenge","gatekeeper"])
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
          const radio = document.querySelector('input[name="tenant"][value="' + prev.tenant + '"]');
          if (radio) radio.checked = true;
        }
        state.compliance = new Set(prev.compliance || []);
        state.tech = new Set(prev.tech || []);
        state.deliverables = new Set(prev.deliverables || ["lab","challenge","gatekeeper"]);
      }
    } catch {}
  }

  function getTenant() {
    const r = document.querySelector('input[name="tenant"]:checked');
    return r ? r.value : "customer";
  }

  function saveState() {
    const fieldIds = ["customerName","industry","customerContext","constraints","duration","audience","skillLevel","emphasis","model"];
    const fields = {};
    for (const id of fieldIds) {
      const el = document.getElementById(id);
      if (el) fields[id] = el.value;
    }
    vscode.setState({
      fields,
      tenant: getTenant(),
      compliance: [...state.compliance],
      tech: [...state.tech],
      deliverables: [...state.deliverables]
    });
  }

  function chip(container, value, set, onToggle) {
    const el = document.createElement("span");
    el.className = "chip" + (set.has(value) ? " selected" : "");
    el.textContent = value;
    el.onclick = () => {
      if (set.has(value)) { set.delete(value); el.classList.remove("selected"); }
      else { set.add(value); el.classList.add("selected"); }
      onToggle();
      saveState();
    };
    container.appendChild(el);
  }

  function renderChipGroup(containerId, items, set, onToggle) {
    const c = document.getElementById(containerId);
    c.innerHTML = "";
    for (const t of items) chip(c, t, set, onToggle);
  }

  function updateTechPill() {
    const p = document.getElementById("pill-tech");
    p.textContent = state.tech.size + " selected";
    p.classList.toggle("ok", state.tech.size > 0);
  }
  function updateDelPill() {
    const p = document.getElementById("pill-del");
    p.textContent = state.deliverables.size + " selected";
    p.classList.toggle("ok", state.deliverables.size > 0);
  }
  function updateCustomerPill() {
    const ok = document.getElementById("customerName").value.trim() && document.getElementById("customerContext").value.trim();
    const pill = document.getElementById("pill-customer");
    pill.textContent = ok ? "ready" : "required";
    pill.classList.toggle("ok", !!ok);
  }
  function updateTenantHint() {
    document.getElementById("tenantHint").textContent = TENANT_HINTS[getTenant()] || "";
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
        saveState();
      };
      grid.appendChild(el);
    }
  }

  function renderAll() {
    renderChipGroup("complianceChips", compliance, state.compliance, () => saveState());
    renderChipGroup("azureChips", azure, state.tech, updateTechPill);
    renderChipGroup("githubChips", github, state.tech, updateTechPill);
    renderChipGroup("aiChips", aiData, state.tech, updateTechPill);
    renderDeliverables();
    updateTechPill();
    updateDelPill();
    updateCustomerPill();
    updateTenantHint();
  }

  function gather() {
    return {
      customerName: document.getElementById("customerName").value.trim(),
      industry: document.getElementById("industry").value,
      customerContext: document.getElementById("customerContext").value.trim(),
      constraints: document.getElementById("constraints").value.trim(),
      complianceTags: [...state.compliance],
      tenant: getTenant(),
      audience: document.getElementById("audience").value,
      skillLevel: document.getElementById("skillLevel").value,
      duration: document.getElementById("duration").value,
      technologies: [...state.tech],
      deliverables: [...state.deliverables],
      emphasis: document.getElementById("emphasis").value,
      model: document.getElementById("model").value
    };
  }

  function validate(b) {
    if (!b.customerName) return "Customer name is required.";
    if (!b.customerContext) return "Customer context is required.";
    if (b.deliverables.length === 0) return "Select at least one deliverable.";
    if (b.technologies.length === 0) return "Select at least one technology.";
    return "";
  }

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
    for (const id of ["customerName","industry","customerContext","constraints"]) document.getElementById(id).value = "";
    document.querySelector('input[name="tenant"][value="customer"]').checked = true;
    document.getElementById("duration").selectedIndex = 2;
    document.getElementById("audience").selectedIndex = 0;
    document.getElementById("skillLevel").selectedIndex = 1;
    document.getElementById("emphasis").selectedIndex = 0;
    document.getElementById("model").selectedIndex = 0;
    state.compliance.clear();
    state.tech.clear();
    state.deliverables = new Set(["lab","challenge","gatekeeper"]);
    document.getElementById("error").textContent = "";
    renderAll();
  };

  ["customerName","customerContext"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => { updateCustomerPill(); saveState(); });
  });
  ["industry","constraints","duration","audience","skillLevel","emphasis","model"].forEach((id) => {
    document.getElementById(id).addEventListener("change", saveState);
  });
  document.querySelectorAll('input[name="tenant"]').forEach((r) => {
    r.addEventListener("change", () => { updateTenantHint(); saveState(); });
  });

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
