import * as vscode from "vscode";

export interface PlanHistoryEntry {
  id: string;
  title: string;
  command: string; // hackathon | lab | challenge | onboarding | gatekeeper | architecture
  scenario: string;
  technologies: string[];
  createdAt: number;
  prompt: string;
}

const KEY = "sesp.history.v1";

export class HistoryStore {
  constructor(private readonly memento: vscode.Memento) {}

  all(): PlanHistoryEntry[] {
    return (this.memento.get<PlanHistoryEntry[]>(KEY) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
  }

  async add(entry: PlanHistoryEntry): Promise<void> {
    const list = this.memento.get<PlanHistoryEntry[]>(KEY) ?? [];
    list.push(entry);
    // cap at 50
    const trimmed = list.slice(-50);
    await this.memento.update(KEY, trimmed);
  }

  async remove(id: string): Promise<void> {
    const list = (this.memento.get<PlanHistoryEntry[]>(KEY) ?? []).filter((e) => e.id !== id);
    await this.memento.update(KEY, list);
  }

  async clear(): Promise<void> {
    await this.memento.update(KEY, []);
  }
}
