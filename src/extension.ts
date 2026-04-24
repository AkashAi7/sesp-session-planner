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
  DEFAULT_SESSION_OPTIONS,
  deliverablesForMode
} from "./plannerView";
import { buildBriefPrompt, briefTitle, validateBrief } from "./briefPrompt";
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
    `Mix and match Azure + GitHub products into a cohesive architecture. Produce a Mermaid diagram and justify every component choice:\n\n${input}`,
  session: (input) =>
    `Produce a complete session delivery package (talk track with timing, slide outline, speaker notes, demo script, Q&A prompts) for the following scenario:\n\n${input}`
};

const QUICK_ARTIFACT_TYPES = [
  { label: "$(beaker) Lab", description: "End-to-end hands-on lab with CLI commands and IaC", value: "lab" },
  { label: "$(trophy) Challenge", description: "Goal-oriented challenge with acceptance criteria + hints", value: "challenge" },
  { label: "$(cloud) Architecture", description: "Mermaid diagram + component justification", value: "architecture" },
  { label: "$(check) Gatekeeper", description: "PASS/FAIL validation script or GitHub Actions workflow", value: "gatekeeper" },
  { label: "$(person) Onboarding", description: "Prerequisite checklist + setup scripts + readiness validator", value: "onboarding" },
  { label: "$(calendar) Hackathon", description: "Full hackathon plan with modules, challenges, and judging", value: "hackathon" },
  { label: "$(book) Session", description: "Talk track, slide outline, speaker notes, demo script", value: "session" }
] as const;

interface QuickTemplate {
  label: string;
  description: string;
  brief: Partial<CustomerBrief>;
}

const TEMPLATE_LIBRARY: QuickTemplate[] = [
  {
    label: "$(beaker) AKS Workshop",
    description: "Containerize + deploy to AKS with GitHub Actions CI/CD",
    brief: {
      customerName: "Workshop",
      engagementMode: "workshop",
      customerContext: "Team wants to containerize a Node.js app, push to ACR, and deploy to AKS with a full GitHub Actions CI/CD pipeline including GHAS scanning.",
      definitionOfSuccess: "Every team has a running AKS deployment triggered by a GitHub Actions workflow with GHAS enabled.",
      technologies: ["AKS", "Azure Container Registry", "GitHub Actions", "GHAS"],
      deliverables: ["lab", "challenge", "gatekeeper", "onboarding"],
      duration: "4 hours",
      skillLevel: "Intermediate",
      audience: "Platform / DevOps engineers"
    }
  },
  {
    label: "$(robot) Azure OpenAI RAG Hackathon",
    description: "Build a RAG app on Azure OpenAI + AI Search in a team hackathon",
    brief: {
      customerName: "Hackathon",
      engagementMode: "hackathon",
      customerContext: "Teams will build a Retrieval-Augmented Generation (RAG) chatbot using Azure OpenAI and Azure AI Search, grounded on customer documents uploaded to a Blob Storage container.",
      definitionOfSuccess: "Each team has a deployed RAG endpoint that answers questions from their document corpus with citations. Judges verify answer quality and latency.",
      technologies: ["Azure OpenAI", "Azure AI Search", "Azure Blob Storage", "GitHub Copilot"],
      deliverables: ["hackathon", "challenge", "gatekeeper", "onboarding", "architecture"],
      duration: "1 day",
      skillLevel: "Intermediate",
      audience: "Developers"
    }
  },
  {
    label: "$(shield) GitHub Advanced Security Enablement",
    description: "GHAS enablement bootcamp: secret scanning, code scanning, Dependabot",
    brief: {
      customerName: "Bootcamp",
      engagementMode: "bootcamp",
      customerContext: "Customer is enabling GitHub Advanced Security across their organization. SE needs labs covering: secret scanning alerts, code scanning with CodeQL, Dependabot dependency review, and a security overview dashboard.",
      definitionOfSuccess: "All participants have completed the secret scanning, code scanning, and Dependabot labs and can demonstrate how to triage and close findings.",
      technologies: ["GHAS", "GitHub Actions", "GitHub Enterprise"],
      deliverables: ["lab", "challenge", "gatekeeper", "session", "onboarding"],
      duration: "Half day",
      skillLevel: "Intermediate",
      audience: "Security engineers"
    }
  },
  {
    label: "$(cloud) Azure Landing Zone Briefing",
    description: "Architecture briefing: Azure Landing Zone + CAF + hub-spoke networking",
    brief: {
      customerName: "Briefing",
      engagementMode: "briefing",
      customerContext: "Customer is planning their Azure Landing Zone. SE needs to present CAF-aligned hub-spoke architecture, subscription topology, Entra ID hierarchy, policy guardrails, and a cost estimate.",
      definitionOfSuccess: "Customer stakeholders have agreed on a subscription topology, network design, and guardrail policy set. CTO signs off on the architecture.",
      technologies: ["Azure Landing Zone", "Azure Policy", "Entra ID", "Azure Networking"],
      deliverables: ["architecture", "session", "onboarding"],
      duration: "2 hours",
      skillLevel: "Advanced",
      audience: "Architects"
    }
  },
  {
    label: "$(zap) GitHub Copilot Developer Enablement",
    description: "Developer enablement workshop: Copilot in IDE, Chat, CLI, and PRs",
    brief: {
      customerName: "Workshop",
      engagementMode: "workshop",
      customerContext: "Developer team is being onboarded to GitHub Copilot. SE needs labs covering Copilot in VS Code (completions, Chat, /explain, /fix), Copilot CLI, and Copilot PR summarization.",
      definitionOfSuccess: "All developers have Copilot active in their editor, have completed the labs, and can use /explain, /fix, and Chat to accelerate their daily work.",
      technologies: ["GitHub Copilot", "GitHub Actions", "VS Code"],
      deliverables: ["lab", "challenge", "session", "onboarding"],
      duration: "4 hours",
      skillLevel: "Beginner",
      audience: "Developers"
    }
  }
];

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
    if (brief) {
      panel.setSavePackageHandler(() => autoSaveToWorkspace(brief, panel.markdown));
    }
    panel.setStatus(useSdk ? "Planning with Copilot SDK…" : "Planning with VS Code LM…");

    const tokenSource = new vscode.CancellationTokenSource();
    panel.onDidClose.event(() => tokenSource.cancel());
    panel.onAction.event(async (action) => {
      if (action === "cancel") {
        tokenSource.cancel();
        panel.setStatus("Cancelled");
        panel.done();
      } else if (action === "createRepo" && brief) {
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
      panel.setStatus("SDK unavailable — switching to VS Code LM…");
      void vscode.window.showWarningMessage(
        `Forge: Copilot SDK unavailable (${err?.message ?? err}). Falling back to VS Code Language Model.`,
        "Open Settings"
      ).then(pick => {
        if (pick === "Open Settings") vscode.commands.executeCommand("workbench.action.openSettings", "sesp");
      });
      try {
        await runWithVsCodeLmTo(
          SESP_SYSTEM_PROMPT,
          prompt,
          { onDelta: (d) => panel.appendMarkdown(d), onStatus: (s) => panel.setStatus(s) },
          tokenSource.token
        );
      } catch (err2: any) {
        panel.setStatus("Generation failed");
        void vscode.window.showErrorMessage(`Forge: Fallback LM also failed — ${err2?.message ?? err2}`);
      }
    }

    panel.done();

    // Auto-save to workspace
    if (autoSave && brief) {
      try {
        const result = await autoSaveToWorkspace(brief, panel.markdown);
        if (result) panel.notifySaved(result.uri, result.fileCount);
        else {
          panel.setStatus("Done");
          void vscode.window.showInformationMessage(
            "Forge: Open a workspace folder to enable auto-save of generated packages.",
            "Open Folder"
          ).then(pick => {
            if (pick === "Open Folder") vscode.commands.executeCommand("vscode.openFolder");
          });
        }
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
        "**Forge** helps you build complete customer engagement packages.\n\n" +
        "**Quick option \u2014 slash commands** (instant, no form required):\n" +
        "- `/hackathon <scenario>` \u2014 Full hackathon plan with modules, challenges, and gatekeepers\n" +
        "- `/lab <topic>` \u2014 End-to-end lab with CLI commands and IaC\n" +
        "- `/challenge <topic>` \u2014 Goal-oriented challenge with acceptance criteria\n" +
        "- `/gatekeeper <challenge>` \u2014 Validation script / GitHub Action\n" +
        "- `/architecture <stack>` \u2014 Mermaid diagram + component justification\n\n" +
        "**Full option \u2014 Forge Planner** (structured multi-deliverable package, readiness tracking, auto-save):\n"
      );
      stream.button({ command: "sesp.openPlanner", title: "Open Forge Planner" });
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
      stream.progress("Copilot SDK unavailable — switching to VS Code LM…");
      try {
        await runWithVsCodeLm(SESP_SYSTEM_PROMPT, userPrompt, stream, token, request.model);
      } catch (err2: any) {
        stream.markdown(`**Generation failed:** ${err2?.message ?? err2}`);
      }
    }

    if (!cmd) {
      stream.button({ command: "sesp.openPlanner", title: "Open Forge Planner" });
    }
  };

  const participant = vscode.chat.createChatParticipant("sesp.planner", handler);
  participant.iconPath = new vscode.ThemeIcon("flame");

  // ---------- Planner webview submission ----------
  const submitBrief = async (brief: CustomerBrief) => {
    const validationError = validateBrief(brief);
    if (validationError) {
      vscode.window.showWarningMessage(`Brief validation: ${validationError}`);
      return;
    }
    const title = briefTitle(brief);
    const prompt = buildBriefPrompt(brief);
    const entry: PlanHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      kind: "brief",
      createdAt: Date.now(),
      brief,
      summary: brief.customerContext.slice(0, 240),
      status: "pending"
    };
    if (store.all().length >= 45) {
      void vscode.window.showWarningMessage(
        `Forge: History is near its 50-entry limit (${store.all().length} entries saved). Oldest entries will be dropped automatically.`
      );
    }
    await store.add(entry);
    historyProvider.refresh();
    setGenerating(true);
    try {
      await generateToPanel(title, prompt, brief, entry.id);
      await store.update(entry.id, { status: "complete" });
    } catch (err: any) {
      await store.update(entry.id, { status: "failed" });
      output.appendLine(`[forge] generation failed for ${entry.id}: ${err?.message ?? err}`);
    } finally {
      setGenerating(false);
    }
    historyProvider.refresh();
  };

  // Mutable reference set after plannerProvider is constructed
  let setGenerating: (v: boolean) => void = () => {};

  const workIqEnabled = vscode.workspace.getConfiguration("sesp").get<boolean>("enableWorkIqMcp", false);
  const plannerProvider = new SespPlannerViewProvider(context.extensionUri, submitBrief, workIqEnabled);
  setGenerating = (v) => plannerProvider.setGenerating(v);

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

    const modePick = await vscode.window.showQuickPick(
      [
        { label: "Workshop", description: "Labs + challenges + facilitator assets", value: "workshop" },
        { label: "Hackathon", description: "Team-based modules + judging + challenge flow", value: "hackathon" },
        { label: "Briefing", description: "Architecture-first session package", value: "briefing" },
        { label: "POC Accelerator", description: "Scoped build plan + validation assets", value: "poc" },
        { label: "Enablement Bootcamp", description: "Training-oriented labs and instructor kit", value: "bootcamp" }
      ],
      { placeHolder: "Choose engagement mode" }
    );
    if (!modePick) return;

    await submitBrief({
      customerName,
      industry: "",
      engagementMode: modePick.value as CustomerBrief["engagementMode"],
      customerContext,
      definitionOfSuccess: "Participants complete the core flow, pass the validators, and leave with a reusable customer-ready package.",
      conversationInsights: "",
      constraints: "",
      complianceTags: [],
      tenant: tenantPick.value as CustomerBrief["tenant"],
      audience: "Developers",
      skillLevel: "Intermediate",
      duration: "4 hours",
      technologies: ["AKS", "GitHub Actions"],
      deliverables: deliverablesForMode(modePick.value as CustomerBrief["engagementMode"]),
      useWorkIqInsights: false,
      emphasis: "Balanced (architecture + hands-on)",
      model: vscode.workspace.getConfiguration("sesp").get<string>("model") ?? "gpt-4.1",
      readiness: {
        status: "yellow",
        environment: "Customer or SE sandbox environment exists but should be validated before the session.",
        accessAndApprovals: "Confirm RBAC, GitHub org permissions, and any Entra app approvals before the engagement.",
        logistics: "Plan for either local setup or Codespaces and have a fallback demo path.",
        blockers: "No blockers captured yet."
      },
      deliveryRoles: {
        facilitatorProfile: "The facilitator needs a clear talk track, timing checkpoints, and troubleshooting guidance.",
        supportModel: "guided",
        participantProfile: "Participants should follow a guided hands-on path and leave with reusable assets.",
        participantGrouping: "teams"
      },
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
    vscode.commands.registerCommand("sesp.generateGatekeeper", () => quickStart()),

    // Quick Generate: single artifact without the full wizard
    vscode.commands.registerCommand("sesp.quickArtifact", async () => {
      const typePick = await vscode.window.showQuickPick(
        QUICK_ARTIFACT_TYPES.map(t => ({ label: t.label, description: t.description, value: t.value })),
        { placeHolder: "What do you want to generate?", title: "Forge: Quick Generate" }
      );
      if (!typePick) return;

      const topic = await vscode.window.showInputBox({
        prompt: "Describe the topic or scenario",
        placeHolder: "e.g. Containerize a Node.js app on AKS with GitHub Actions CI/CD",
        ignoreFocusOut: true
      });
      if (!topic) return;

      const customerName = (await vscode.window.showInputBox({
        prompt: "Customer name (optional — press Enter to skip)",
        placeHolder: "Contoso Ltd.",
        ignoreFocusOut: true
      })) ?? "";

      type QuickValue = typeof QUICK_ARTIFACT_TYPES[number]["value"];
      const artifactValue = typePick.value as QuickValue;
      const quickBrief: CustomerBrief = {
        customerName: customerName || artifactValue,
        industry: "",
        engagementMode: artifactValue === "hackathon" ? "hackathon" : "workshop",
        customerContext: topic,
        definitionOfSuccess: "Participants complete the core flow, pass the validators, and leave with reusable assets.",
        conversationInsights: "",
        constraints: "",
        complianceTags: [],
        tenant: "customer",
        audience: "Developers",
        skillLevel: "Intermediate",
        duration: "4 hours",
        technologies: [],
        deliverables: [artifactValue as import("./plannerView").Deliverable],
        useWorkIqInsights: false,
        emphasis: "Balanced (architecture + hands-on)",
        model: vscode.workspace.getConfiguration("sesp").get<string>("model") ?? "gpt-4.1",
        readiness: { status: "yellow", environment: "", accessAndApprovals: "", logistics: "", blockers: "" },
        deliveryRoles: { facilitatorProfile: "", supportModel: "guided", participantProfile: "", participantGrouping: "teams" },
        labOptions: { ...DEFAULT_LAB_OPTIONS },
        sessionOptions: { ...DEFAULT_SESSION_OPTIONS }
      };

      const promptFn = CHAT_COMMAND_TEMPLATES[artifactValue];
      const prompt = promptFn ? promptFn(topic) : topic;
      const cleanLabel = typePick.label.replace(/\$\([\w-]+\)\s*/g, "");
      const title = customerName ? `${customerName} — ${cleanLabel}` : `${cleanLabel}: ${topic.slice(0, 60)}`;
      await generateToPanel(title, prompt, quickBrief);
    }),

    // Template Library: start from a pre-built scenario brief
    vscode.commands.registerCommand("sesp.insertTemplate", async () => {
      const pick = await vscode.window.showQuickPick(
        TEMPLATE_LIBRARY.map(t => ({ label: t.label, description: t.description, template: t })),
        { placeHolder: "Choose a starting template", title: "Forge: Use Template" }
      );
      if (!pick) return;

      const customerName = await vscode.window.showInputBox({
        prompt: "Customer name",
        placeHolder: "Contoso Ltd.",
        ignoreFocusOut: true,
        value: ""
      });
      if (!customerName) return;

      const t = pick.template;
      const brief: CustomerBrief = {
        customerName,
        industry: "",
        engagementMode: t.brief.engagementMode ?? "workshop",
        customerContext: t.brief.customerContext ?? "",
        definitionOfSuccess: t.brief.definitionOfSuccess ?? "",
        conversationInsights: "",
        constraints: "",
        complianceTags: [],
        tenant: "customer",
        audience: t.brief.audience ?? "Developers",
        skillLevel: t.brief.skillLevel ?? "Intermediate",
        duration: t.brief.duration ?? "4 hours",
        technologies: t.brief.technologies ?? [],
        deliverables: t.brief.deliverables ?? ["lab", "challenge", "gatekeeper"],
        useWorkIqInsights: false,
        emphasis: "Balanced (architecture + hands-on)",
        model: vscode.workspace.getConfiguration("sesp").get<string>("model") ?? "gpt-4.1",
        readiness: { status: "yellow", environment: "", accessAndApprovals: "", logistics: "", blockers: "" },
        deliveryRoles: { facilitatorProfile: "", supportModel: "guided", participantProfile: "", participantGrouping: "teams" },
        labOptions: { ...DEFAULT_LAB_OPTIONS },
        sessionOptions: { ...DEFAULT_SESSION_OPTIONS }
      };

      await submitBrief(brief);
    })
  );

  context.subscriptions.push({ dispose: () => void sdkSession.dispose() });
}

export function deactivate() {
  /* handled via subscriptions */
}
