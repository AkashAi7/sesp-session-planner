import * as vscode from "vscode";

export interface PlannerFormPayload {
  command: string; // hackathon | lab | challenge | onboarding | gatekeeper | architecture
  title: string;
  scenario: string;
  audience: string;
  duration: string;
  technologies: string[];
  tone: string;
}

export class SespPlannerViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sesp.plannerView";

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly onSubmit: (payload: PlannerFormPayload) => void | Promise<void>
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.renderHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "submit") {
        await this.onSubmit(msg.payload as PlannerFormPayload);
      }
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
      "font-src " + webview.cspSource
    ].join("; ");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SESP Planner</title>
<style>
  :root {
    --radius: 6px;
    --gap: 10px;
  }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
    padding: 12px;
    margin: 0;
  }
  h2 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
  }
  .subtitle {
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-bottom: 14px;
  }
  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--gap); }
  label { font-weight: 600; font-size: 12px; }
  input, textarea, select {
    width: 100%;
    box-sizing: border-box;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: var(--radius);
    padding: 6px 8px;
    font-family: inherit;
    font-size: inherit;
  }
  textarea { resize: vertical; min-height: 70px; }
  input:focus, textarea:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
  }
  .cmd-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    margin-bottom: var(--gap);
  }
  .cmd {
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border, #3c3c3c));
    border-radius: var(--radius);
    padding: 8px;
    cursor: pointer;
    user-select: none;
    background: var(--vscode-editor-background);
    transition: border-color 80ms ease, background 80ms ease;
  }
  .cmd:hover { border-color: var(--vscode-focusBorder); }
  .cmd.selected {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
    color: var(--vscode-list-activeSelectionForeground);
  }
  .cmd .name { font-weight: 600; font-size: 12px; }
  .cmd .desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }

  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip {
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    background: var(--vscode-editor-background);
    font-size: 11px;
    cursor: pointer;
    user-select: none;
  }
  .chip.selected {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
  .actions { display: flex; gap: 8px; margin-top: 14px; }
  button.primary {
    flex: 1;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 0;
    padding: 8px 12px;
    border-radius: var(--radius);
    cursor: pointer;
    font-weight: 600;
  }
  button.primary:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary {
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    padding: 8px 12px;
    border-radius: var(--radius);
    cursor: pointer;
  }
  .section-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
    margin: 14px 0 6px;
  }
</style>
</head>
<body>
  <h2>Solution Engineer Session Planner</h2>
  <div class="subtitle">Compose a session, hackathon, or lab and send it to <code>@sesp</code>.</div>

  <div class="section-title">Mode</div>
  <div class="cmd-grid" id="cmdGrid"></div>

  <div class="field">
    <label for="title">Title</label>
    <input id="title" placeholder="e.g., DevSecOps Fast Track Hackathon" />
  </div>

  <div class="field">
    <label for="scenario">Scenario / Goal</label>
    <textarea id="scenario" placeholder="Describe the business scenario and learning objectives…"></textarea>
  </div>

  <div class="row2">
    <div class="field">
      <label for="duration">Duration</label>
      <select id="duration">
        <option>1 hour</option>
        <option>2 hours</option>
        <option selected>4 hours</option>
        <option>Half day</option>
        <option>1 day</option>
        <option>2 days</option>
      </select>
    </div>
    <div class="field">
      <label for="audience">Audience</label>
      <select id="audience">
        <option>Developers – beginner</option>
        <option selected>Developers – intermediate</option>
        <option>Developers – advanced</option>
        <option>Platform / DevOps engineers</option>
        <option>Architects</option>
        <option>Security engineers</option>
      </select>
    </div>
  </div>

  <div class="section-title">Technologies</div>
  <div class="chips" id="azureChips"></div>
  <div style="height:6px"></div>
  <div class="chips" id="githubChips"></div>

  <div class="field" style="margin-top: var(--gap);">
    <label for="tone">Emphasis</label>
    <select id="tone">
      <option selected>Balanced (architecture + hands-on)</option>
      <option>Hands-on heavy (more labs & challenges)</option>
      <option>Architecture heavy (design & trade-offs)</option>
      <option>Security-first (DevSecOps)</option>
      <option>AI-first (GenAI, RAG, Copilot)</option>
    </select>
  </div>

  <div class="actions">
    <button class="primary" id="submit">Generate in Chat</button>
    <button class="secondary" id="reset">Reset</button>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();

  const commands = [
    { id: "hackathon",    name: "Hackathon",    desc: "Full plan with modules, challenges, gatekeepers" },
    { id: "lab",          name: "Lab",          desc: "Step-by-step how-to with CLI + IaC" },
    { id: "challenge",    name: "Challenge",    desc: "Goal-oriented task with hints & success criteria" },
    { id: "architecture", name: "Architecture", desc: "Mix-and-match Azure + GitHub design" },
    { id: "onboarding",   name: "Onboarding",   desc: "Prereqs, setup scripts, readiness validator" },
    { id: "gatekeeper",   name: "Gatekeeper",   desc: "Validation script / GitHub Action" }
  ];

  const azureTech = [
    "AKS","Container Apps","App Service","Functions","ACR","Azure OpenAI","Cosmos DB","Azure SQL","Key Vault","Monitor","Entra ID","Bicep","azd","API Management"
  ];
  const githubTech = [
    "GitHub Actions","GHAS","Copilot","Codespaces","Packages","Projects","Advanced Security","OIDC federation"
  ];

  let selectedCommand = "hackathon";
  const selectedTech = new Set();

  function renderCommands() {
    const grid = document.getElementById("cmdGrid");
    grid.innerHTML = "";
    for (const c of commands) {
      const el = document.createElement("div");
      el.className = "cmd" + (c.id === selectedCommand ? " selected" : "");
      el.innerHTML = '<div class="name">' + c.name + '</div><div class="desc">' + c.desc + '</div>';
      el.onclick = () => { selectedCommand = c.id; renderCommands(); };
      grid.appendChild(el);
    }
  }

  function renderChips(containerId, items) {
    const c = document.getElementById(containerId);
    c.innerHTML = "";
    for (const t of items) {
      const el = document.createElement("span");
      el.className = "chip" + (selectedTech.has(t) ? " selected" : "");
      el.textContent = t;
      el.onclick = () => {
        if (selectedTech.has(t)) selectedTech.delete(t); else selectedTech.add(t);
        renderChips(containerId, items);
      };
      c.appendChild(el);
    }
  }

  function reset() {
    selectedCommand = "hackathon";
    selectedTech.clear();
    document.getElementById("title").value = "";
    document.getElementById("scenario").value = "";
    document.getElementById("duration").selectedIndex = 2;
    document.getElementById("audience").selectedIndex = 1;
    document.getElementById("tone").selectedIndex = 0;
    renderCommands();
    renderChips("azureChips", azureTech);
    renderChips("githubChips", githubTech);
  }

  document.getElementById("submit").onclick = () => {
    const payload = {
      command: selectedCommand,
      title: document.getElementById("title").value.trim(),
      scenario: document.getElementById("scenario").value.trim(),
      audience: document.getElementById("audience").value,
      duration: document.getElementById("duration").value,
      technologies: Array.from(selectedTech),
      tone: document.getElementById("tone").value
    };
    if (!payload.scenario) {
      document.getElementById("scenario").focus();
      return;
    }
    vscode.postMessage({ type: "submit", payload });
  };
  document.getElementById("reset").onclick = reset;

  renderCommands();
  renderChips("azureChips", azureTech);
  renderChips("githubChips", githubTech);
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
