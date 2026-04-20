import * as vscode from "vscode";
import { SESP_SYSTEM_PROMPT } from "./sespPrompt";
import { SespSession } from "./sespSession";
import { runWithVsCodeLm, runWithVsCodeLmTo } from "./lmFallback";
import { HistoryStore, PlanHistoryEntry } from "./history";
import { SespHistoryProvider, HistoryTreeItem } from "./historyView";
import {
  SespPlannerViewProvider,
  CustomerBrief,
  DEFAULT_LAB_OPTIONS,
  DEFAULT_SESSION_OPTIONS
} from "./plannerView";
import { buildBriefPrompt, briefTitle } from "./briefPrompt";
import { SespResultsPanel } from "./resultsPanel";
import { autoSaveToWorkspace, createCustomerRepo } from "./customerRepo";

const CHAT_COMMAND_TEMPLATES: Record<string, (input: string) => string> = {
  hackathon: (input) =>
    `Design a complete hackathon plan for the following scenario. Use the full Output Format (sections 1–5) from your system prompt. Scenario:\n\n${input}`,
  lab: (input) =>
    `Generate an end-to-end lab (prereqs → provisioning → app deploy → gatekeeper validation → troubleshooting → cleanup) with exact CLI commands and IaC snippets for:\n\n${input}`,
  challenge: (input) =>
    `Generate a goal-oriented participant challenge (what-to-do) with progressive hints and a **Definition of Done / Acceptance Criteria** section, but do NOT reveal the full solution. Topic:\n\n${input}`,
  onboarding: (input) =>
    `Produce a complete onboarding / "Smooth Start" package (prerequisite checklist, setup scripts, and a readiness validator) for a session that uses:\n\n${input}`,
  gatekeeper: (input) =>
    `Generate a gatekeeper validation artifact (script or GitHub Actions workflow) that prints PASS/FAIL per acceptance criterion. Challenge description:\n\n${input}`,
  architecture: (input) =>
    `Mix and match Azure + GitHub products into a cohesive architecture. Produce a Mermaid diagram and justify every component choice:\n\n${input}`
};

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Forge");
  const sdkSession = new SespSession(output);
  const store = new HistoryStore(context.globalState);
  const historyProvider = new SespHistoryProvider(store);

  // ---------- Core generator: runs prompt into a Results panel ----------
  async function generateToPanel(title: string, prompt: string, brief: CustomerBrief | undefined, historyId?: string) {
    const cfg = vscode.workspace.getConfiguration("sesp");
    const useSdk = cfg.get<boolean>("useCopilotSdk", true);
    const autoSave = cfg.get<boolean>("autoSaveToWorkspace", true);
    const visibility = cfg.get<"private" | "internal" | "public">("customerRepoDefaultVisibility", "private");

    const panel = SespResultsPanel.create(title, context.extensionUri);
    panel.setStatus(useSdk ? "Planning with Copilot SDK…" : "Planning with VS Code LM…");

    const tokenSource = new vscode.CancellationTokenSource();
    panel.onDidClose.event(() => tokenSource.cancel());
    panel.onAction.event(async (action) => {
      if (action === "createRepo" && brief) {
        await createCustomerRepo({
          brief,
          markdown: panel.markdown,
          defaultVisibility: visibility,
          output
        });
      }
    });

    try {
      if (useSdk) {
        await sdkSession.runTo(
          prompt,
          { onDelta: (d) => panel.appendMarkdown(d), onStatus: (s) => panel.setStatus(s) },
          tokenSource.token
        );
      } else {
        await runWithVsCodeLmTo(
          SESP_SYSTEM_PROMPT,
          prompt,
          { onDelta: (d) => panel.appendMarkdown(d), onStatus: (s) => panel.setStatus(s) },
          tokenSource.token
        );
      }
    } catch (err: any) {
      output.appendLine(`[forge] generate error: ${err?.stack ?? err}`);
      panel.appendMarkdown(
        `\n\n> **Copilot SDK unavailable** (\`${err?.message ?? err}\`). Falling back to VS Code LM…\n\n`
      );
      try {
        await runWithVsCodeLmTo(
          SESP_SYSTEM_PROMPT,
          prompt,
          { onDelta: (d) => panel.appendMarkdown(d), onStatus: (s) => panel.setStatus(s) },
          tokenSource.token
        );
      } catch (err2: any) {
        panel.appendMarkdown(`\n\n**Fallback failed:** ${err2?.message ?? err2}`);
      }
    }

    panel.done();

    // Auto-save to workspace
    if (autoSave && brief) {
      try {
        const uri = await autoSaveToWorkspace(brief, panel.markdown);
        if (uri) panel.notifySaved(uri);
        else panel.setStatus("Done (open a workspace folder to auto-save)");
      } catch (err: any) {
        output.appendLine(`[forge] auto-save failed: ${err?.message ?? err}`);
      }
    }

    if (historyId) {
      await store.update(historyId, { markdown: panel.markdown });
      historyProvider.refresh();
    }
  }

  // ---------- Chat participant (ad-hoc prompts) ----------
  const handler: vscode.ChatRequestHandler = async (request, _ctx, stream, token) => {
    const cfg = vscode.workspace.getConfiguration("sesp");
    const useSdk = cfg.get<boolean>("useCopilotSdk", true);
    const cmd = request.command;
    const raw = request.prompt?.trim() ?? "";

    if (!raw && !cmd) {
      stream.markdown(
        "Open the **Forge Planner** from the activity bar for the full customer-brief experience, or use a slash command.\n"
      );
      stream.button({ command: "sesp.openPlanner", title: "Open Forge" });
      return;
    }

    const userPrompt = cmd && CHAT_COMMAND_TEMPLATES[cmd] ? CHAT_COMMAND_TEMPLATES[cmd](raw) : raw;

    try {
      if (useSdk) {
        stream.progress("Planning with GitHub Copilot SDK…");
        await sdkSession.run(userPrompt, stream, token);
      } else {
        stream.progress("Planning with VS Code Language Model API…");
        await runWithVsCodeLm(SESP_SYSTEM_PROMPT, userPrompt, stream, token, request.model);
      }
    } catch (err: any) {
      output.appendLine(`[forge] SDK error: ${err?.stack ?? err}`);
      stream.markdown(
        `> **Copilot SDK unavailable** (\`${err?.message ?? err}\`). Falling back to VS Code LM…\n\n`
      );
      try {
        await runWithVsCodeLm(SESP_SYSTEM_PROMPT, userPrompt, stream, token, request.model);
      } catch (err2: any) {
        stream.markdown(`\n\n**Fallback failed:** ${err2?.message ?? err2}`);
      }
    }

    stream.button({ command: "sesp.openPlanner", title: "Open Forge Planner" });
  };

  const participant = vscode.chat.createChatParticipant("sesp.planner", handler);
  participant.iconPath = new vscode.ThemeIcon("flame");

  // ---------- Planner webview submission ----------
  const submitBrief = async (brief: CustomerBrief) => {
    const title = briefTitle(brief);
    const prompt = buildBriefPrompt(brief);
    const entry: PlanHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      kind: "brief",
      createdAt: Date.now(),
      brief,
      summary: brief.customerContext.slice(0, 240)
    };
    await store.add(entry);
    historyProvider.refresh();
    await generateToPanel(title, prompt, brief, entry.id);
  };

  const plannerProvider = new SespPlannerViewProvider(context.extensionUri, submitBrief);

  // ---------- History tree ----------
  const historyTree = vscode.window.createTreeView("sesp.historyView", {
    treeDataProvider: historyProvider,
    showCollapseAll: false
  });

  // ---------- Quick Start wizard ----------
  const quickStart = async () => {
    const customerName = await vscode.window.showInputBox({
      prompt: "Customer name",
      placeHolder: "Contoso Ltd.",
      ignoreFocusOut: true
    });
    if (!customerName) return;
    const customerContext = await vscode.window.showInputBox({
      prompt: "One-line customer context / goal",
      placeHolder: "Wants to modernize monolith to containers on Azure with GitHub Actions + GHAS",
      ignoreFocusOut: true
    });
    if (!customerContext) return;

    const tenantPick = await vscode.window.showQuickPick(
      [
        { label: "Customer tenant", description: "Generated for customer's own subscription", value: "customer" },
        { label: "Microsoft tenant", description: "SE dry-run in MSFT sandbox", value: "microsoft" },
        { label: "Personal sandbox", description: "SE dry-run in personal account", value: "personal" }
      ],
      { placeHolder: "Target environment" }
    );
    if (!tenantPick) return;

    const deliverables = await vscode.window.showQuickPick(
      [
        { label: "Labs (end-to-end)", picked: true, value: "lab" },
        { label: "Challenges (with acceptance criteria)", picked: true, value: "challenge" },
        { label: "Gatekeepers", picked: true, value: "gatekeeper" },
        { label: "Hackathon agenda", picked: false, value: "hackathon" },
        { label: "Session material", picked: false, value: "session" },
        { label: "Architecture", picked: false, value: "architecture" },
        { label: "Onboarding", picked: false, value: "onboarding" }
      ],
      { canPickMany: true, placeHolder: "Select deliverables" }
    );
    if (!deliverables || deliverables.length === 0) return;

    await submitBrief({
      customerName,
      industry: "",
      customerContext,
      conversationInsights: "",
      constraints: "",
      complianceTags: [],
      tenant: tenantPick.value as CustomerBrief["tenant"],
      audience: "Developers",
      skillLevel: "Intermediate",
      duration: "4 hours",
      technologies: [],
      deliverables: deliverables.map((d) => d.value) as any,
      engagementPreset: "custom",
      useWorkIqInsights: false,
      emphasis: "Balanced (architecture + hands-on)",
      model: vscode.workspace.getConfiguration("sesp").get<string>("model") ?? "gpt-4.1",
      labOptions: { ...DEFAULT_LAB_OPTIONS },
      sessionOptions: { ...DEFAULT_SESSION_OPTIONS }
    });
  };

  // ---------- Status bar ----------
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "$(flame) Forge";
  status.tooltip = "Open the Forge Customer Engagement Studio";
  status.command = "sesp.openPlanner";
  const updateStatus = () => {
    if (vscode.workspace.getConfiguration("sesp").get<boolean>("showStatusBarItem", true)) status.show();
    else status.hide();
  };
  updateStatus();

  // ---------- Register ----------
  context.subscriptions.push(
    participant,
    output,
    historyTree,
    status,
    vscode.window.registerWebviewViewProvider(SespPlannerViewProvider.viewType, plannerProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("sesp.showStatusBarItem")) updateStatus();
    }),

    vscode.commands.registerCommand("sesp.openPlanner", async () => {
      await vscode.commands.executeCommand("workbench.view.extension.sesp");
      plannerProvider.reveal();
    }),
    vscode.commands.registerCommand("sesp.newPlan", () => plannerProvider.reveal()),
    vscode.commands.registerCommand("sesp.quickStart", quickStart),
    vscode.commands.registerCommand("sesp.openSettings", () =>
      vscode.commands.executeCommand("workbench.action.openSettings", "@ext:sesp.sesp-session-planner")
    ),

    vscode.commands.registerCommand("sesp.refreshHistory", () => historyProvider.refresh()),
    vscode.commands.registerCommand("sesp.clearHistory", async () => {
      const ok = await vscode.window.showWarningMessage("Clear all Forge history?", { modal: true }, "Clear");
      if (ok === "Clear") {
        await store.clear();
        historyProvider.refresh();
      }
    }),
    vscode.commands.registerCommand("sesp.openHistoryEntry", async (id: string) => {
      const entry = store.get(id);
      if (!entry) return;
      if (entry.markdown) {
        const panel = SespResultsPanel.create(entry.title, context.extensionUri);
        panel.setStatus("Restored from history");
        panel.appendMarkdown(entry.markdown);
        panel.done();
        if (entry.brief) {
          const cfg = vscode.workspace.getConfiguration("sesp");
          const visibility = cfg.get<"private" | "internal" | "public">("customerRepoDefaultVisibility", "private");
          panel.onAction.event(async (action) => {
            if (action === "createRepo") {
              await createCustomerRepo({
                brief: entry.brief!,
                markdown: panel.markdown,
                defaultVisibility: visibility,
                output
              });
            }
          });
        }
      } else if (entry.brief) {
        await generateToPanel(entry.title, buildBriefPrompt(entry.brief), entry.brief, entry.id);
      }
    }),
    vscode.commands.registerCommand("sesp.rerunFromHistory", async (arg: HistoryTreeItem | string) => {
      const id = typeof arg === "string" ? arg : arg?.entry?.id;
      const entry = id ? store.get(id) : undefined;
      if (!entry?.brief) return;
      await generateToPanel(entry.title, buildBriefPrompt(entry.brief), entry.brief, entry.id);
    }),
    vscode.commands.registerCommand("sesp.deleteFromHistory", async (arg: HistoryTreeItem) => {
      if (!arg?.entry?.id) return;
      await store.remove(arg.entry.id);
      historyProvider.refresh();
    }),
    vscode.commands.registerCommand("sesp.createCustomerRepoForEntry", async (arg: HistoryTreeItem | string) => {
      const id = typeof arg === "string" ? arg : arg?.entry?.id;
      const entry = id ? store.get(id) : undefined;
      if (!entry?.brief || !entry.markdown) {
        vscode.window.showWarningMessage("No rendered materials for this entry yet — open it first.");
        return;
      }
      const visibility = vscode.workspace
        .getConfiguration("sesp")
        .get<"private" | "internal" | "public">("customerRepoDefaultVisibility", "private");
      await createCustomerRepo({ brief: entry.brief, markdown: entry.markdown, defaultVisibility: visibility, output });
    }),

    // Legacy aliases
    vscode.commands.registerCommand("sesp.generateSessionPlan", () => quickStart()),
    vscode.commands.registerCommand("sesp.generateLab", () => quickStart()),
    vscode.commands.registerCommand("sesp.generateGatekeeper", () => quickStart())
  );

  context.subscriptions.push({ dispose: () => void sdkSession.dispose() });
}

export function deactivate() {
  /* handled via subscriptions */
}
