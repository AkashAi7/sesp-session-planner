import * as vscode from "vscode";
import type { CustomerBrief } from "./plannerView";

export interface PlanHistoryEntry {
  id: string;
  title: string;
  kind: "brief" | "chat";
  createdAt: number;
  brief?: CustomerBrief;
  summary: string;
  markdown?: string;
}

const KEY = "sesp.history.v2";

export class HistoryStore {
  constructor(private readonly memento: vscode.Memento) {}

  all(): PlanHistoryEntry[] {
    return (this.memento.get<PlanHistoryEntry[]>(KEY) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  async add(entry: PlanHistoryEntry): Promise<void> {
    const list = this.memento.get<PlanHistoryEntry[]>(KEY) ?? [];
    list.push(entry);
    await this.memento.update(KEY, list.slice(-50));
  }

  async update(id: string, patch: Partial<PlanHistoryEntry>): Promise<void> {
    const list = (this.memento.get<PlanHistoryEntry[]>(KEY) ?? []).map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    await this.memento.update(KEY, list);
  }

  async remove(id: string): Promise<void> {
    const list = (this.memento.get<PlanHistoryEntry[]>(KEY) ?? []).filter((e) => e.id !== id);
    await this.memento.update(KEY, list);
  }

  async clear(): Promise<void> {
    await this.memento.update(KEY, []);
  }

  get(id: string): PlanHistoryEntry | undefined {
    return (this.memento.get<PlanHistoryEntry[]>(KEY) ?? []).find((e) => e.id === id);
  }
}
