// Headless smoke test: exercises the Copilot SDK session (same config the
// extension uses) without VS Code, to prove the agent pipeline works.
// Requires the GitHub Copilot CLI to be installed and authenticated.
//
// Run via npm: npm run smoke -- "Your prompt here"

import { SESP_SYSTEM_PROMPT } from "../src/sespPrompt";
import { buildSdkTools } from "../src/tools";
import { loadCopilotSdk } from "../src/sdkLoader";

async function main() {
  const prompt =
    process.argv.slice(2).join(" ").trim() ||
    "/architecture Mix AKS + GitHub Actions + GHAS for a 2-hour devsecops lab. Respond in under 8 bullets.";

  const sdk = await loadCopilotSdk();
  const tools = await buildSdkTools();

  const client = new sdk.CopilotClient();
  const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
    systemMessage: { content: SESP_SYSTEM_PROMPT },
    tools,
    onPermissionRequest: sdk.approveAll
  });

  let chars = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session.on((event: any) => {
    if (event.type === "assistant.message_delta") {
      const delta = event.data?.deltaContent ?? "";
      chars += delta.length;
      process.stdout.write(delta);
    }
    if (event.type === "tool.execution_start") {
      process.stderr.write(`\n[tool-start] ${event.data?.toolName}\n`);
    }
    if (event.type === "session.error") {
      process.stderr.write(`\n[session.error] ${event.data?.message}\n`);
    }
  });

  try {
    await session.sendAndWait({ prompt });
    console.log(`\n\n[smoke] OK — streamed ${chars} chars.`);
  } finally {
    await client.stop();
  }
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err);
  process.exit(1);
});
