import { describe, expect, it } from "vitest";
import { HistoryStore, PlanHistoryEntry } from "../src/history";

/** Minimal in-memory Memento for testing */
class FakeMemento {
  private store = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  async update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
  keys(): readonly string[] {
    return [...this.store.keys()];
  }
  setKeysForSync(): void {}
}

function entry(id: string, overrides: Partial<PlanHistoryEntry> = {}): PlanHistoryEntry {
  return {
    id,
    title: `Entry ${id}`,
    kind: "brief",
    createdAt: Date.now(),
    summary: "test",
    ...overrides
  };
}

describe("HistoryStore", () => {
  it("adds and retrieves entries", async () => {
    const store = new HistoryStore(new FakeMemento() as any);
    await store.add(entry("a"));
    await store.add(entry("b"));
    expect(store.all()).toHaveLength(2);
    expect(store.get("a")?.id).toBe("a");
  });

  it("caps at 50 entries", async () => {
    const store = new HistoryStore(new FakeMemento() as any);
    for (let i = 0; i < 55; i++) {
      await store.add(entry(`e${i}`, { createdAt: i }));
    }
    const all = store.all();
    expect(all.length).toBeLessThanOrEqual(50);
  });

  it("updates an existing entry", async () => {
    const store = new HistoryStore(new FakeMemento() as any);
    await store.add(entry("x"));
    await store.update("x", { markdown: "# Result", status: "complete" });
    expect(store.get("x")?.markdown).toBe("# Result");
    expect(store.get("x")?.status).toBe("complete");
  });

  it("removes an entry", async () => {
    const store = new HistoryStore(new FakeMemento() as any);
    await store.add(entry("a"));
    await store.add(entry("b"));
    await store.remove("a");
    expect(store.all()).toHaveLength(1);
    expect(store.get("a")).toBeUndefined();
  });

  it("clears all entries", async () => {
    const store = new HistoryStore(new FakeMemento() as any);
    await store.add(entry("a"));
    await store.add(entry("b"));
    await store.clear();
    expect(store.all()).toHaveLength(0);
  });

  it("returns entries sorted by createdAt descending", async () => {
    const store = new HistoryStore(new FakeMemento() as any);
    await store.add(entry("old", { createdAt: 100 }));
    await store.add(entry("new", { createdAt: 200 }));
    const all = store.all();
    expect(all[0].id).toBe("new");
    expect(all[1].id).toBe("old");
  });

  it("get returns undefined for non-existent entry", () => {
    const store = new HistoryStore(new FakeMemento() as any);
    expect(store.get("nonexistent")).toBeUndefined();
  });
});
