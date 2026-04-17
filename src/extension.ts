import * as vscode from "vscode";
import { SESP_SYSTEM_PROMPT } from "./sespPrompt";
import { SespSession } from "./sespSession";
import { runWithVsCodeLm } from "./lmFallback";
import { HistoryStore, PlanHistoryEntry } from "./history";
import { SespHistoryProvider, HistoryTreeItem } from "./historyView";
import { SespPlannerViewProvider, PlannerFormPayload } from "./plannerView";

const COMMAND_TEMPLATES: Record<string, (input: string) => string> = {
  hackathon: (input) =>
    `Design a complete hackathon plan for the following scenario. Use the full Output Format (sections 1–5) from your system prompt. Scenario:\n\n${input}`,
  lab: (input) =>
    `Generate a step-by-step infrastructure lab ("how-to") with exact CLI commands and IaC snippets for:\n\n${input}`,
  challenge: (input) =>
    `Generate a goal-oriented participant challenge ("what-to-do") with hints and success criteria, but do NOT reveal the full solution. Topic:\n\n${input}`,
  onboarding: (input) =>
    `Produce a complete onboarding / "Smooth Start" package (prerequisite checklist, setup scripts, and a readiness validator) for a session that uses:\n\n${input}`,
  gatekeeper: (input) =>
    `Generate a gatekeeper validation artifact (script or GitHub Actions workflow) that verifies participant completion. Include the exact checks and exit semantics. Challenge description:\n\n${input}`,
  architecture: (input) =>
    `Mix and match Azure + GitHub products into a cohesive architecture for the following scenario. Produce a Mermaid diagram and justify every component choice:\n\n${input}`
};

function buildPromptFromForm(p: PlannerFormPayload): { prompt: string; summary: string } {
  const techLine = p.technologies.length ? `\n**Technologies:** ${p.technologies.join(", ")}` : "";
  const titleLine = p.title ? `\n**Title:** ${p.title}` : "";
  const summary = [p.title || "Untitled", p.duration, p.audience].filter(Boolean).join(" • ");
  const composed =
    `${p.scenario}\n\n` +
    `**Duration:** ${p.duration}\n` +
    `**Audience:** ${p.audience}\n` +
    `**Emphasis:** ${p.tone}` +
    techLine +
    titleLine;
  const prompt = (COMMAND_TEMPLATES[p.command] ?? ((s: string) => s))(composed);
  return { prompt, summary };
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("SESP");
  const sdkSession = new SespSession(output);
  const store = new HistoryStore(context.globalState);
  const historyProvider = new SespHistoryProvider(store);

  // ---------- Chat participant ----------
  const handler: vscode.ChatRequestHandler = async (request, _ctx, stream, token) => {
    const cfg = vscode.workspace.getConfiguration("sesp");
    const useSdk = cfg.get<boolean>("useCopilotSdk", true);

    const cmd = request.command;
    const raw = request.prompt?.trim() ?? "";

    if (!raw && !cmd) {
      stream.markdown(
        "Ask me to plan a **hackathon**, **lab**, **challenge**, **onboarding**, **gatekeeper**, or **architecture**.\n\n" +
          "Or open the **SESP Planner** from the activity bar for a guided form."
      );
      stream.button({ command: "sesp.openPlanner", title: "Open SESP Planner" });
      return;
    }

    const userPrompt = cmd && COMMAND_TEMPLATES[cmd] ? COMMAND_TEMPLATES[cmd](raw) : raw;

    try {
      if (useSdk) {
        stream.progress("Planning with GitHub Copilot SDK…");
        await sdkSession.run(userPrompt, stream, token);
      } else {
        stream.progress("Planning with VS Code Language Model API…");
        await runWithVsCodeLm(SESP_SYSTEM_PROMPT, userPrompt, stream, token, request.model);
      }
    } catch (err: any) {
      output.appendLine(`[sesp] SDK error: ${err?.stack ?? err}`);
      stream.markdown(
        `> **Copilot SDK unavailable** (\`${err?.message ?? err}\`). Falling back to VS Code Language Model API.\n\n`
      );
      try {
        await runWithVsCodeLm(SESP_SYSTEM_PROMPT, userPrompt, stream, token, request.model);
      } catch (err2: any) {
        stream.markdown(`\n\n**Fallback also failed:** ${err2?.message ?? err2}`);
      }
    }

    stream.button({ command: "sesp.openPlanner", title: "Open Planner" });
  };

  const participant = vscode.chat.createChatParticipant("sesp.planner", handler);
  participant.iconPath = new vscode.ThemeIcon("mortar-board");

  // ---------- Planner webview ----------
  const sendToChat = async (payload: PlannerFormPayload) => {
    const { prompt, summary } = buildPromptFromForm(payload);
    const title = payload.title?.trim() || summary || `${payload.command} plan`;

    const entry: PlanHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      command: payload.command,
      scenario: payload.scenario,
      technologies: payload.technologies,
      createdAt: Date.now(),
      prompt
    };
    await store.add(entry);
    historyProvider.refresh();

    await vscode.commands.executeCommand("workbench.action.chat.open", {
      query: `@sesp /${payload.command} ${prompt}`
    });
  };

  const plannerProvider = new SespPlannerViewProvider(context.extensionUri, sendToChat);

  // ---------- History tree ----------
  const historyTree = vscode.window.createTreeView("sesp.historyView", {
    treeDataProvider: historyProvider,
    showCollapseAll: false
  });

  // ---------- Quick Start wizard ----------
  const quickStart = async () => {
    const pick = await vscode.window.showQuickPick(
      [
        { label: "$(rocket) Hackathon", detail: "Full plan with modules, challenges, gatekeepers", cmd: "hackathon" },
        { label: "$(beaker) Lab", detail: "Step-by-step how-to with CLI + IaC", cmd: "lab" },
        { label: "$(target) Challenge", detail: "Goal-oriented task with hints & success criteria", cmd: "challenge" },
        { label: "$(type-hierarchy) Architecture", detail: "Mix-and-match Azure + GitHub design", cmd: "architecture" },
        { label: "$(checklist) Onboarding", detail: "Prereqs, setup scripts, readiness validator", cmd: "onboarding" },
        { label: "$(shield) Gatekeeper", detail: "Validation script / GitHub Action", cmd: "gatekeeper" }
      ],
      { placeHolder: "What do you want to plan?", matchOnDetail: true }
    );
    if (!pick) return;

    const scenario = await vscode.window.showInputBox({
      prompt: `Describe the ${pick.cmd} scenario`,
      placeHolder: "e.g., Migrate a legacy monolith to AKS with GitHub Actions and GHAS",
      ignoreFocusOut: true
    });
    if (!scenario) return;

    await sendToChat({
      command: pick.cmd,
      title: "",
      scenario,
      audience: "Developers – intermediate",
      duration: "4 hours",
      technologies: [],
      tone: "Balanced (architecture + hands-on)"
    });
  };

  // ---------- Status bar ----------
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "$(rocket) SESP";
  status.tooltip = "Open the Solution Engineer Session Planner";
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
      const ok = await vscode.window.showWarningMessage(
        "Clear all SESP history?",
        { modal: true },
        "Clear"
      );
      if (ok === "Clear") {
        await store.clear();
        historyProvider.refresh();
      }
    }),
    vscode.commands.registerCommand("sesp.rerunFromHistory", async (arg: HistoryTreeItem | string) => {
      const id = typeof arg === "string" ? arg : arg?.entry?.id;
      const entry = store.all().find((e) => e.id === id);
      if (!entry) return;
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: `@sesp /${entry.command} ${entry.prompt}`
      });
    }),
    vscode.commands.registerCommand("sesp.deleteFromHistory", async (arg: HistoryTreeItem) => {
      if (!arg?.entry?.id) return;
      await store.remove(arg.entry.id);
      historyProvider.refresh();
    }),

    // Legacy commands kept for backward compat
    vscode.commands.registerCommand("sesp.generateSessionPlan", () => quickStart()),
    vscode.commands.registerCommand("sesp.generateLab", async () => {
      const s = await vscode.window.showInputBox({ prompt: "Describe the lab topic", ignoreFocusOut: true });
      if (s) await sendToChat({ command: "lab", title: "", scenario: s, audience: "Developers – intermediate", duration: "2 hours", technologies: [], tone: "Hands-on heavy (more labs & challenges)" });
    }),
    vscode.commands.registerCommand("sesp.generateGatekeeper", async () => {
      const s = await vscode.window.showInputBox({ prompt: "Describe the challenge to validate", ignoreFocusOut: true });
      if (s) await sendToChat({ command: "gatekeeper", title: "", scenario: s, audience: "Developers – intermediate", duration: "1 hour", technologies: [], tone: "Balanced (architecture + hands-on)" });
    })
  );

  context.subscriptions.push({ dispose: () => void sdkSession.dispose() });
}

export function deactivate() {
  /* handled via subscriptions */
}
