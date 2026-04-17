import * as vscode from "vscode";

/**
 * Fallback path when the GitHub Copilot SDK / CLI is unavailable. Uses the
 * VS Code Language Model API so the extension still works in vanilla VS Code
 * with GitHub Copilot Chat installed.
 */
export async function runWithVsCodeLm(
  systemPrompt: string,
  userPrompt: string,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  model?: vscode.LanguageModelChat
): Promise<string> {
  const chosen =
    model ??
    (await vscode.lm.selectChatModels({ vendor: "copilot", family: "gpt-4o" }))[0] ??
    (await vscode.lm.selectChatModels({ vendor: "copilot" }))[0];

  if (!chosen) {
    stream.markdown(
      "> **SESP fallback error:** No Copilot language model is available. Install GitHub Copilot Chat or configure `sesp.useCopilotSdk` with the Copilot CLI."
    );
    return "";
  }

  const messages = [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    vscode.LanguageModelChatMessage.User(userPrompt)
  ];

  const response = await chosen.sendRequest(messages, {}, token);
  let full = "";
  for await (const chunk of response.text) {
    full += chunk;
    stream.markdown(chunk);
  }
  return full;
}
