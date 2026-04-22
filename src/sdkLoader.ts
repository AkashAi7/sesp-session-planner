// Lazy loader for @github/copilot-sdk.
// The SDK ships as ESM-only; VS Code extensions run as CJS. Using a dynamic
// import() lets CJS load ESM at runtime without a bundler.

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any | undefined;

let compatPatched = false;

export async function loadCopilotSdk(): Promise<any> {
  if (!cached) {
    const sdkDistDir = await ensureCopilotSdkCompat();
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    cached = await (new Function("s", "return import(s)") as (s: string) => Promise<any>)(
      pathToFileURL(path.join(sdkDistDir, "index.js")).href
    );
  }
  return cached;
}

async function ensureCopilotSdkCompat(): Promise<string> {
  const sdkDistDir = path.resolve(__dirname, "..", "node_modules", "@github", "copilot-sdk", "dist");
  if (compatPatched) return sdkDistDir;

  const sessionJsPath = path.join(sdkDistDir, "session.js");
  const sessionDtsPath = path.join(sdkDistDir, "session.d.ts");

  await patchImportPath(sessionJsPath);
  await patchImportPath(sessionDtsPath);
  compatPatched = true;
  return sdkDistDir;
}

async function patchImportPath(filePath: string): Promise<void> {
  try {
    const source = await fs.readFile(filePath, "utf8");
    if (!source.includes("vscode-jsonrpc/node\"") && !source.includes("vscode-jsonrpc/node'")) {
      return;
    }

    const patched = source
      .replace(/(["'])vscode-jsonrpc\/node\1/g, "$1vscode-jsonrpc/node.js$1");

    if (patched !== source) {
      await fs.writeFile(filePath, patched, "utf8");
    }
  } catch {
    // If the SDK layout changes or the extension install location is read-only,
    // fall through and let the normal import path surface the original error.
  }
}
