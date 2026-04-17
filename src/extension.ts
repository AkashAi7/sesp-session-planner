import * as vscode from "vscode";
import { SESP_SYSTEM_PROMPT } from "./sespPrompt";
import { SespSession } from "./sespSession";
import { runWithVsCodeLm } from "./lmFallback";

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

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("SESP");
  const sdkSession = new SespSession(output);

  const handler: vscode.ChatRequestHandler = async (request, _ctx, stream, token) => {
    const cfg = vscode.workspace.getConfiguration("sesp");
    const useSdk = cfg.get<boolean>("useCopilotSdk", true);

    const cmd = request.command;
    const raw = request.prompt?.trim() ?? "";

    if (!raw && !cmd) {
      stream.markdown(
        "Ask me to plan a **hackathon**, design a **lab**, author a **challenge**, generate **onboarding** scripts, a **gatekeeper** validator, or an **architecture**.\n\n" +
          "Try:\n- `/hackathon 4-hour AKS + GitHub Actions modernization`\n- `/lab Set up Azure DevOps + GitHub repo link with OIDC`\n- `/gatekeeper Verify an AKS cluster with ingress and HTTPS`\n"
      );
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

    stream.button({
      command: "sesp.saveLastAsMarkdown",
      title: "Save to workspace as Markdown",
      arguments: []
    });
  };

  const participant = vscode.chat.createChatParticipant("sesp.planner", handler);
  participant.iconPath = new vscode.ThemeIcon("mortar-board");

  // Standalone commands invoke the chat participant programmatically when possible.
  const openChatWith = async (preset: string, placeholder: string) => {
    const input = await vscode.window.showInputBox({
      prompt: placeholder,
      ignoreFocusOut: true
    });
    if (!input) return;
    await vscode.commands.executeCommand(
      "workbench.action.chat.open",
      { query: `@sesp /${preset} ${input}` }
    );
  };

  context.subscriptions.push(
    participant,
    output,
    vscode.commands.registerCommand("sesp.generateSessionPlan", () =>
      openChatWith("hackathon", "Describe the hackathon/session scenario")
    ),
    vscode.commands.registerCommand("sesp.generateLab", () =>
      openChatWith("lab", "Describe the lab topic (technologies, goal)")
    ),
    vscode.commands.registerCommand("sesp.generateGatekeeper", () =>
      openChatWith("gatekeeper", "Describe the challenge you need to validate")
    ),
    vscode.commands.registerCommand("sesp.saveLastAsMarkdown", async () => {
      // Lightweight helper: asks the user where to save a doc pasted from chat.
      const uri = await vscode.window.showSaveDialog({
        filters: { Markdown: ["md"] },
        saveLabel: "Save SESP plan"
      });
      if (!uri) return;
      const doc = await vscode.workspace.openTextDocument({
        language: "markdown",
        content:
          "<!-- Paste the SESP response above this line, then save. -->\n"
      });
      await vscode.window.showTextDocument(doc);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(doc.getText(), "utf8"));
    })
  );

  context.subscriptions.push({
    dispose: () => {
      void sdkSession.dispose();
    }
  });
}

export function deactivate() {
  /* disposed via subscriptions */
}
