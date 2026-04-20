import * as vscode from "vscode";
import { SESP_SYSTEM_PROMPT } from "./sespPrompt";
import { buildSdkTools } from "./tools";
import { loadCopilotSdk } from "./sdkLoader";

/**
 * Wraps a long-lived GitHub Copilot SDK session so all chat turns share context.
 * The SDK is ESM-only and loaded via dynamic import at runtime.
 */
export class SespSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private session: any | undefined;
  private starting: Promise<void> | undefined;

  constructor(private readonly output: vscode.OutputChannel) {}

  private cfg() {
    return vscode.workspace.getConfiguration("sesp");
  }

  async ensureStarted(): Promise<void> {
    if (this.session) return;
    if (this.starting) return this.starting;

    this.starting = (async () => {
      const cfg = this.cfg();
      const cliPath = cfg.get<string>("cliPath") || undefined;
      const cliUrl = cfg.get<string>("cliUrl") || undefined;
      const workIqUrl = cfg.get<string>("workIqMcpUrl") || undefined;

      this.output.appendLine(
        `[sesp] starting Copilot SDK client (cliPath=${cliPath ?? "<PATH>"}, cliUrl=${cliUrl ?? "<spawn>"}, workIq=${workIqUrl ?? "<disabled>"})`
      );

      const sdk = await loadCopilotSdk();
      const tools = await buildSdkTools();

      this.client = new sdk.CopilotClient({
        cliPath,
        cliUrl,
        logLevel: "info"
      });

      const sessionConfig: Record<string, unknown> = {
        model: cfg.get<string>("model") ?? "gpt-4.1",
        streaming: true,
        systemMessage: { content: SESP_SYSTEM_PROMPT },
        tools,
        onPermissionRequest: sdk.approveAll
      };

      if (cfg.get<boolean>("enableGithubMcp")) {
        sessionConfig.mcpServers = {
          github: { type: "http", url: "https://api.githubcopilot.com/mcp/" }
        };
      }

      if (cfg.get<boolean>("enableWorkIqMcp") && workIqUrl) {
        sessionConfig.mcpServers = {
          ...(sessionConfig.mcpServers as Record<string, unknown> | undefined),
          workiq: { type: "http", url: workIqUrl }
        };
      }

      this.session = await this.client.createSession(sessionConfig);
      this.output.appendLine("[sesp] session ready");
    })();

    try {
      await this.starting;
    } finally {
      this.starting = undefined;
    }
  }

  async run(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<string> {
    return this.runTo(
      prompt,
      {
        onDelta: (d) => stream.markdown(d),
        onStatus: (s) => stream.progress(s)
      },
      token
    );
  }

  async runTo(
    prompt: string,
    sink: { onDelta: (d: string) => void; onStatus?: (s: string) => void },
    token: vscode.CancellationToken
  ): Promise<string> {
    await this.ensureStarted();
    if (!this.session) throw new Error("SESP session failed to initialize.");

    let full = "";
    let idleResolve: (() => void) | undefined;
    const idlePromise = new Promise<void>((resolve) => (idleResolve = resolve));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const off = this.session.on((event: any) => {
      if (token.isCancellationRequested) return;
      switch (event.type) {
        case "assistant.message_delta": {
          const delta = event.data?.deltaContent ?? "";
          if (delta) {
            full += delta;
            sink.onDelta(delta);
          }
          break;
        }
        case "tool.execution_start": {
          const name = event.data?.toolName ?? "tool";
          sink.onStatus?.(`Running tool: ${name}…`);
          break;
        }
        case "session.error": {
          const msg = event.data?.message ?? "Unknown session error";
          this.output.appendLine(`[sesp] session.error: ${msg}`);
          break;
        }
        case "session.idle": {
          idleResolve?.();
          break;
        }
      }
    });

    try {
      await this.session.sendAndWait({ prompt });
      await Promise.race([idlePromise, new Promise<void>((r) => setTimeout(r, 50))]);
    } finally {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (off as any)?.();
      } catch {
        /* best-effort */
      }
    }

    return full;
  }

  async dispose(): Promise<void> {
    try {
      await this.client?.stop();
    } catch (err) {
      this.output.appendLine(`[sesp] error stopping client: ${String(err)}`);
    }
    this.client = undefined;
    this.session = undefined;
  }
}
