import * as vscode from "vscode";
import { HistoryStore, PlanHistoryEntry } from "./history";

export class HistoryTreeItem extends vscode.TreeItem {
  constructor(public readonly entry: PlanHistoryEntry) {
    super(entry.title, vscode.TreeItemCollapsibleState.None);
    this.id = entry.id;
    const when = new Date(entry.createdAt).toLocaleString();
    const deliverables = entry.brief?.deliverables?.join(", ") ?? "";
    const mode = entry.brief?.engagementMode ?? "";
    const status = entry.status ? `[${entry.status}]` : "";
    this.description = [mode, status, when].filter(Boolean).join(" • ");

    const tip = new vscode.MarkdownString();
    tip.appendMarkdown(`**${entry.title}**\n\n`);
    if (entry.brief) {
      tip.appendMarkdown(`**Customer:** ${entry.brief.customerName}\n\n`);
      if (entry.brief.industry) tip.appendMarkdown(`**Industry:** ${entry.brief.industry}\n\n`);
      tip.appendMarkdown(`**Mode:** ${entry.brief.engagementMode}\n\n`);
      if (entry.brief.technologies.length)
        tip.appendMarkdown(`**Technologies:** ${entry.brief.technologies.join(", ")}\n\n`);
      if (deliverables) tip.appendMarkdown(`**Deliverables:** ${deliverables}\n\n`);
      tip.appendMarkdown(`**Definition of success:** ${entry.brief.definitionOfSuccess}\n\n`);
    }
    if (entry.summary) tip.appendMarkdown(`\n${entry.summary}`);
    this.tooltip = tip;

    this.contextValue = "sespHistoryEntry";
    this.iconPath = new vscode.ThemeIcon(iconFor(entry));
    this.command = {
      command: "sesp.openHistoryEntry",
      title: "Open",
      arguments: [entry.id]
    };
  }
}

function iconFor(entry: PlanHistoryEntry): string {
  const mode = entry.brief?.engagementMode;
  switch (mode) {
    case "workshop": return "mortar-board";
    case "hackathon": return "rocket";
    case "briefing": return "book";
    case "poc": return "beaker";
    case "bootcamp": return "library";
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
