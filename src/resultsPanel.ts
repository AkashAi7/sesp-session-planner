import * as vscode from "vscode";

/**
 * A dedicated editor panel that renders the SESP response as a proper document
 * (markdown → HTML), with streaming, a copy button, and a "Save to workspace"
 * button. This removes the dependency on the Copilot Chat view as the only
 * surface for results.
 */
export class SespResultsPanel {
  private static panels = new Map<string, SespResultsPanel>();

  public readonly onDidClose = new vscode.EventEmitter<void>();

  private panel: vscode.WebviewPanel;
  private buffer = "";
  private title: string;

  static create(title: string, extensionUri: vscode.Uri): SespResultsPanel {
    const p = new SespResultsPanel(title, extensionUri);
    this.panels.set(p.panel.viewType + ":" + Date.now(), p);
    return p;
  }

  private constructor(title: string, private readonly extensionUri: vscode.Uri) {
    this.title = title;
    this.panel = vscode.window.createWebviewPanel(
      "sesp.resultsPanel",
      title,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [extensionUri] }
    );
    this.panel.iconPath = vscode.Uri.joinPath(extensionUri, "media", "sesp.svg");
    this.panel.webview.html = this.renderHtml();

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg?.type === "save") await this.saveToWorkspace();
      if (msg?.type === "copy") await vscode.env.clipboard.writeText(this.buffer);
      if (msg?.type === "openMarkdown") await this.openMarkdown();
    });

    this.panel.onDidDispose(() => {
      this.onDidClose.fire();
      this.onDidClose.dispose();
    });
  }

  setStatus(text: string) {
    this.panel.webview.postMessage({ type: "status", text });
  }

  appendMarkdown(delta: string) {
    this.buffer += delta;
    this.panel.webview.postMessage({ type: "delta", delta });
  }

  done() {
    this.panel.webview.postMessage({ type: "done" });
  }

  reveal() {
    this.panel.reveal();
  }

  dispose() {
    this.panel.dispose();
  }

  get markdown(): string {
    return this.buffer;
  }

  private safeFilename(): string {
    return this.title.replace(/[^\w\-]+/g, "_").slice(0, 80) || "sesp-plan";
  }

  private async saveToWorkspace() {
    const ws = vscode.workspace.workspaceFolders?.[0];
    const defaultUri = ws
      ? vscode.Uri.joinPath(ws.uri, `${this.safeFilename()}.md`)
      : vscode.Uri.file(`${this.safeFilename()}.md`);
    const uri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { Markdown: ["md"] },
      saveLabel: "Save SESP plan"
    });
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(this.buffer, "utf8"));
    const open = await vscode.window.showInformationMessage(
      `Saved ${uri.fsPath}`,
      "Open"
    );
    if (open === "Open") await vscode.window.showTextDocument(uri);
  }

  private async openMarkdown() {
    const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: this.buffer });
    await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
  }

  private renderHtml(): string {
    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `style-src ${this.panel.webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
      `img-src ${this.panel.webview.cspSource} data: https:`,
      `font-src ${this.panel.webview.cspSource}`
    ].join("; ");

    // Using marked via CDN for markdown rendering; falls back to escaped text if blocked.
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<title>${escapeHtml(this.title)}</title>
<style>
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 0; margin: 0;
  }
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
  }
  .toolbar .title { font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toolbar .status { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .toolbar button {
    background: transparent; color: var(--vscode-foreground);
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px;
  }
  .toolbar button:hover { background: var(--vscode-toolbar-hoverBackground, rgba(127,127,127,0.1)); }
  .toolbar button.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }
  .toolbar button.primary:hover { background: var(--vscode-button-hoverBackground); }

  main {
    max-width: 920px; margin: 0 auto; padding: 24px 32px 80px;
    line-height: 1.55;
  }
  main h1 { font-size: 22px; border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c); padding-bottom: 6px; margin-top: 1.4em; }
  main h2 { font-size: 18px; margin-top: 1.6em; }
  main h3 { font-size: 15px; margin-top: 1.4em; }
  main p, main li { font-size: 13px; }
  main code {
    background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
    padding: 1px 5px; border-radius: 3px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
  }
  main pre {
    background: var(--vscode-textCodeBlock-background, rgba(127,127,127,0.15));
    padding: 12px; border-radius: 6px; overflow-x: auto;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 12px;
  }
  main pre code { background: transparent; padding: 0; }
  main table { border-collapse: collapse; margin: 12px 0; }
  main th, main td { border: 1px solid var(--vscode-panel-border, #3c3c3c); padding: 4px 8px; font-size: 12px; }
  main blockquote { border-left: 3px solid var(--vscode-textBlockQuote-border, #888); padding-left: 10px; color: var(--vscode-descriptionForeground); }
  .caret {
    display: inline-block; width: 8px; height: 14px; vertical-align: text-bottom;
    background: var(--vscode-foreground); opacity: 0.6;
    animation: blink 1s step-end infinite;
    margin-left: 2px;
  }
  @keyframes blink { 50% { opacity: 0; } }
</style>
</head>
<body>
<div class="toolbar">
  <div class="title">${escapeHtml(this.title)}</div>
  <div class="status" id="status">Starting…</div>
  <button id="copyBtn">Copy</button>
  <button id="openBtn">Open as .md</button>
  <button class="primary" id="saveBtn">Save to workspace</button>
</div>
<main id="content"><em>Awaiting response…</em></main>

<script nonce="${nonce}" src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const content = document.getElementById("content");
  const status = document.getElementById("status");
  let buffer = "";
  let streaming = true;

  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;" }[c])); }
  function render() {
    const md = buffer;
    if (window.marked) {
      content.innerHTML = window.marked.parse(md) + (streaming ? '<span class="caret"></span>' : "");
    } else {
      content.innerHTML = "<pre>" + escapeHtml(md) + "</pre>" + (streaming ? '<span class="caret"></span>' : "");
    }
  }

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (m.type === "delta") { buffer += m.delta; render(); }
    else if (m.type === "status") { status.textContent = m.text; }
    else if (m.type === "done") { streaming = false; status.textContent = "Done"; render(); }
  });

  document.getElementById("copyBtn").onclick = () => vscode.postMessage({ type: "copy" });
  document.getElementById("saveBtn").onclick = () => vscode.postMessage({ type: "save" });
  document.getElementById("openBtn").onclick = () => vscode.postMessage({ type: "openMarkdown" });
</script>
</body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function getNonce(): string {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}
