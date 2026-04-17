// Lazy loader for @github/copilot-sdk.
// The SDK ships as ESM-only; VS Code extensions run as CJS. Using a dynamic
// import() lets CJS load ESM at runtime without a bundler.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any | undefined;

export async function loadCopilotSdk(): Promise<any> {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    cached = await (new Function("s", "return import(s)") as (s: string) => Promise<any>)(
      "@github/copilot-sdk"
    );
  }
  return cached;
}
