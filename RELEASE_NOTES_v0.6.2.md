# Forge v0.6.2 — SDK compatibility fix + correct package reveal

This patch fixes two issues that affected the installed `0.6.1` release.

## What changed

- Fixed a **Copilot SDK runtime compatibility** problem in the packaged VSIX.
  Forge now patches the SDK's broken `vscode-jsonrpc/node` import to
  `vscode-jsonrpc/node.js` before loading, which avoids the extension-host module
  resolution failure seen in the installed build.
- Fixed the saved-output UX so Forge now reveals the **generated package folder**
  instead of implying that only the root `README.md` is the saved result.
- Updated the results panel banner text to make it explicit that Forge saves a
  package directory containing the generated workspace files and folders.

## Quality and validation

- Verified the release with:
  - `npm run compile`
  - `npm test`
  - `npm run package`

## Install

1. Download `sesp-session-planner-0.6.2.vsix` from the assets below.
2. **Extensions** → `...` → **Install from VSIX...**
3. Reload window.