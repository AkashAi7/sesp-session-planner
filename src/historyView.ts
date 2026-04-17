import * as vscode from "vscode";
import { HistoryStore, PlanHistoryEntry } from "./history";

export class HistoryTreeItem extends vscode.TreeItem {
  constructor(public readonly entry: PlanHistoryEntry) {
    super(entry.title, vscode.TreeItemCollapsibleState.None);
    this.id = entry.id;
    const when = new Date(entry.createdAt).toLocaleString();
    this.description = `${entry.command} • ${when}`;
    this.tooltip = new vscode.MarkdownString(
      `**${entry.title}**\n\n` +
        `**Command:** \`/${entry.command}\`\n\n` +
        `**Technologies:** ${entry.technologies.join(", ") || "—"}\n\n` +
        `**Scenario:**\n\n${entry.scenario}`
    );
    this.contextValue = "sespHistoryEntry";
    this.iconPath = new vscode.ThemeIcon(iconFor(entry.command));
    this.command = {
      command: "sesp.rerunFromHistory",
      title: "Rerun in Chat",
      arguments: [entry.id]
    };
  }
}

function iconFor(cmd: string): string {
  switch (cmd) {
    case "hackathon": return "rocket";
    case "lab": return "beaker";
    case "challenge": return "target";
    case "onboarding": return "checklist";
    case "gatekeeper": return "shield";
    case "architecture": return "type-hierarchy";
    default: return "sparkle";
  }
}

export class SespHistoryProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
  private readonly _onDidChange = new vscode.EventEmitter<HistoryTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private readonly store: HistoryStore) {}

  refresh() {
    this._onDidChange.fire();
  }

  getTreeItem(el: HistoryTreeItem): vscode.TreeItem {
    return el;
  }

  getChildren(): HistoryTreeItem[] {
    return this.store.all().map((e) => new HistoryTreeItem(e));
  }
}
