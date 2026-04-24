import * as path from "path";
import type { CustomerBrief } from "./plannerView";

export interface GeneratedArtifact {
  path: string;
  content: string;
}

const SECTION_PATHS: Array<{ match: RegExp; path: string }> = [
  { match: /workspace blueprint|repository structure|workspace structure/i, path: "workspace/README.md" },
  { match: /event overview/i, path: "docs/overview.md" },
  { match: /architecture/i, path: "architecture/architecture.md" },
  { match: /onboarding|smooth start|environment setup/i, path: "onboarding/readiness.md" },
  { match: /hackathon/i, path: "hackathon/agenda.md" },
  { match: /labs?/i, path: "labs/README.md" },
  { match: /challenges?/i, path: "challenges/README.md" },
  { match: /session/i, path: "sessions/session-material.md" },
  { match: /gatekeeper/i, path: "gatekeepers/validators.md" }
];

export function buildArtifactPackage(brief: CustomerBrief, markdown: string): GeneratedArtifact[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  // Strip forge-file tags from the master document so ENGAGEMENT.md stays clean
  const engagementContent = stripForgeFileTags(normalized);
  const sections = splitSections(engagementContent);
  const files: GeneratedArtifact[] = [];

  files.push({ path: "ENGAGEMENT.md", content: engagementContent + "\n" });
  files.push({ path: "docs/customer-brief.md", content: buildCustomerBriefDoc(brief) });

  if (brief.conversationInsights.trim()) {
    files.push({
      path: "insights/conversation-insights.md",
      content: `# Conversation Insights\n\n${brief.conversationInsights.trim()}\n`
    });
  }

  // Prefer structured <forge-file> tags; fall back to #### File: heading scan
  const forgeFileArtifacts = parseForgeFiles(normalized);
  if (forgeFileArtifacts !== null) {
    files.push(...forgeFileArtifacts);
  } else {
    files.push(...extractFileArtifacts(normalized));
  }

  for (const section of sections) {
    const sectionPath = mapSectionPath(section.title);
    const cleanedSection = stripEmbeddedFileArtifacts(section.raw).trim();
    files.push({ path: sectionPath, content: ensureTrailingNewline(cleanedSection || section.raw.trim()) });

    if (/labs?/i.test(section.title)) {
      files.push(...splitSubArtifacts(section, "labs", /^lab\b/i));
    }
    if (/challenges?/i.test(section.title)) {
      files.push(...splitSubArtifacts(section, "challenges", /^challenge\b/i));
    }
    if (/hackathon/i.test(section.title)) {
      files.push(...splitSubArtifacts(section, "hackathon/modules", /^(module|challenge)\b/i));
    }
  }

  const deduped = dedupeArtifacts(files);
  deduped.unshift({ path: "README.md", content: buildPackageReadme(brief, deduped) });
  deduped.push({ path: "PACKAGE_INDEX.md", content: buildPackageIndex(deduped) });
  return dedupeArtifacts(deduped);
}

/**
 * Parse structured <forge-file path="...">...</forge-file> tags emitted by the model.
 * Returns null if no forge-file tags are found (fall back to heading scan).
 */
export function parseForgeFiles(markdown: string): GeneratedArtifact[] | null {
  const matches = [...markdown.matchAll(/<forge-file\s+path="([^"]+)">(\s*[\s\S]*?\s*)<\/forge-file>/g)];
  if (matches.length === 0) return null;
  const files: GeneratedArtifact[] = [];
  for (const match of matches) {
    const filePath = normalizeArtifactPath(match[1]);
    if (!filePath) continue;
    files.push({ path: filePath, content: ensureTrailingNewline(match[2].trim()) });
  }
  return files.length > 0 ? files : null;
}

/** Remove <forge-file> wrapper tags, keeping the content for display in ENGAGEMENT.md. */
export function stripForgeFileTags(markdown: string): string {
  if (!markdown.trim()) return markdown;
  return markdown
    .replace(/<forge-file\s+path="[^"]+">(\s*[\s\S]*?\s*)<\/forge-file>/g, (_match, content: string) => content.trim())
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSections(markdown: string): Array<{ title: string; raw: string; body: string }> {
  const matches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  if (matches.length === 0) {
    return [{ title: "Engagement", raw: `## Engagement\n\n${markdown}`, body: markdown }];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? markdown.length : markdown.length;
    const raw = markdown.slice(start, end).trim();
    const title = match[1].trim();
    const body = raw.replace(/^##\s+.+$/m, "").trim();
    return { title, raw, body };
  });
}

function splitSubArtifacts(
  section: { title: string; raw: string; body: string },
  baseDir: string,
  matcher: RegExp
): GeneratedArtifact[] {
  const matches = [...section.raw.matchAll(/^###\s+(.+)$/gm)];
  if (matches.length === 0) return [];

  const files: GeneratedArtifact[] = [];
  let ordinal = 1;
  for (let index = 0; index < matches.length; index++) {
    const title = matches[index][1].trim();
    if (!matcher.test(title)) continue;
    const start = matches[index].index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? section.raw.length : section.raw.length;
    const raw = section.raw.slice(start, end).trim();
    if (hasEmbeddedFileArtifacts(raw)) continue;
    const cleaned = stripEmbeddedFileArtifacts(raw.replace(/^###\s+.+$/m, "")).trim();
    if (!cleaned) continue;
    const fileName = `${String(ordinal).padStart(2, "0")}-${slug(title)}.md`;
    files.push({ path: `${baseDir}/${fileName}`, content: `## ${title}\n\n${cleaned}\n` });
    ordinal += 1;
  }
  return files;
}

function stripEmbeddedFileArtifacts(markdown: string): string {
  if (!markdown.trim()) return markdown;

  const matches = [...markdown.matchAll(/^#{4,6}\s+File:\s+.+$/gm)];
  if (matches.length === 0) return markdown.trim();

  let cleaned = "";
  let cursor = 0;

  for (let index = 0; index < matches.length; index++) {
    const start = matches[index].index ?? 0;
    const end = index + 1 < matches.length
      ? matches[index + 1].index ?? markdown.length
      : markdown.length;
    cleaned += markdown.slice(cursor, start);
    cursor = end;
  }

  cleaned += markdown.slice(cursor);
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

function hasEmbeddedFileArtifacts(markdown: string): boolean {
  return /^#{4,6}\s+File:\s+.+$/m.test(markdown) || /<forge-file\s+path="/.test(markdown);
}

function extractFileArtifacts(markdown: string): GeneratedArtifact[] {
  const matches = [...markdown.matchAll(/^#{4,6}\s+File:\s+(.+)$/gm)];
  if (matches.length === 0) return [];

  const files: GeneratedArtifact[] = [];
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const rawPath = match[1].trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? markdown.length : markdown.length;
    const block = markdown.slice(start, end).trim();
    const content = extractFileContent(block);
    const filePath = normalizeArtifactPath(rawPath);
    if (!filePath || !content) continue;
    files.push({ path: filePath, content: ensureTrailingNewline(content) });
  }
  return files;
}

function extractFileContent(block: string): string {
  // Handle nested fences by matching the outermost fence block properly.
  // Count the backtick length of the opening fence and match the same-length close.
  const fencedMatch = block.match(/^(`{3,})([^\n]*)\n([\s\S]*?)\n\1\s*$/m);
  if (fencedMatch) return fencedMatch[3].trimEnd();

  // Fallback: try standard triple-backtick (non-greedy across potential inner fences)
  const simple = block.match(/^```[^\n]*\n([\s\S]*?)\n```\s*$/m);
  if (simple) return simple[1].trimEnd();

  return block.trim();
}

function normalizeArtifactPath(rawPath: string): string | undefined {
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) return undefined;
  return normalized;
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

function mapSectionPath(title: string): string {
  const matched = SECTION_PATHS.find((entry) => entry.match.test(title));
  if (matched) return matched.path;
  return `docs/${slug(title)}.md`;
}

function buildCustomerBriefDoc(brief: CustomerBrief): string {
  const lines = [
    "# Customer Brief",
    "",
    `- **Customer:** ${brief.customerName}`,
    `- **Industry:** ${brief.industry || "—"}`,
    `- **Audience:** ${brief.audience} (${brief.skillLevel})`,
    `- **Duration:** ${brief.duration}`,
    `- **Engagement mode:** ${brief.engagementMode}`,
    `- **Tenant:** ${brief.tenant}`,
    `- **Technologies:** ${brief.technologies.join(", ") || "—"}`,
    `- **Deliverables:** ${brief.deliverables.join(", ") || "—"}`,
    `- **Use WorkIQ insights:** ${brief.useWorkIqInsights ? "Yes" : "No"}`,
    `- **Definition of success:** ${brief.definitionOfSuccess || "—"}`,
    "",
    "## Context",
    "",
    brief.customerContext || "—",
    ""
  ];

  if (brief.constraints.trim()) {
    lines.push("## Constraints", "", brief.constraints.trim(), "");
  }
  lines.push(
    "## Readiness",
    "",
    `- **Status:** ${brief.readiness.status}`,
    `- **Environment:** ${brief.readiness.environment || "—"}`,
    `- **Access / approvals:** ${brief.readiness.accessAndApprovals || "—"}`,
    `- **Logistics:** ${brief.readiness.logistics || "—"}`,
    `- **Blockers:** ${brief.readiness.blockers || "—"}`,
    ""
  );
  lines.push(
    "## Delivery roles",
    "",
    `- **Facilitator focus:** ${brief.deliveryRoles.facilitatorProfile || "—"}`,
    `- **Support model:** ${brief.deliveryRoles.supportModel}`,
    `- **Participant profile:** ${brief.deliveryRoles.participantProfile || "—"}`,
    `- **Participant grouping:** ${brief.deliveryRoles.participantGrouping}`,
    ""
  );
  if (brief.conversationInsights.trim()) {
    lines.push("## Conversation Notes", "", brief.conversationInsights.trim(), "");
  }
  return lines.join("\n");
}

function buildPackageReadme(brief: CustomerBrief, artifacts: GeneratedArtifact[]): string {
  const lines = [
    `# ${brief.customerName} Engagement Package`,
    "",
    `Generated by Forge for a **${brief.engagementMode}** scenario.`,
    "",
    "## What’s in this package",
    ""
  ];

  for (const artifact of artifacts) {
    if (artifact.path === "README.md") continue;
    lines.push(`- [${artifact.path}](./${artifact.path})`);
  }

  lines.push("", "## Quick start", "", "1. Read [docs/customer-brief.md](./docs/customer-brief.md).", "2. Use [PACKAGE_INDEX.md](./PACKAGE_INDEX.md) to navigate the artifacts.");
  return lines.join("\n") + "\n";
}

function buildPackageIndex(artifacts: GeneratedArtifact[]): string {
  const lines = ["# Package Index", "", "| Path | Purpose |", "| --- | --- |"]; 
  for (const artifact of artifacts) {
    lines.push(`| ${artifact.path} | ${describeArtifact(artifact.path)} |`);
  }
  return lines.join("\n") + "\n";
}

function describeArtifact(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized === "README.md") return "Package entry point";
  if (normalized === "ENGAGEMENT.md") return "Full generated master document";
  if (normalized === "workspace/README.md") return "Workspace/repository blueprint";
  if (normalized.includes("customer-brief")) return "Normalized customer brief and context";
  if (normalized.includes("conversation-insights")) return "Conversation notes and insight context";
  if (normalized.startsWith("infra/")) return "Infrastructure-as-code or deployment artifact";
  if (normalized.startsWith("scripts/")) return "Automation or helper script";
  if (normalized.startsWith(".github/")) return "GitHub automation or policy artifact";
  return `Generated artifact for ${path.dirname(normalized)}`;
}

function dedupeArtifacts(artifacts: GeneratedArtifact[]): GeneratedArtifact[] {
  const byPath = new Map<string, GeneratedArtifact>();
  for (const artifact of artifacts) {
    byPath.set(artifact.path.replace(/\\/g, "/"), { ...artifact, path: artifact.path.replace(/\\/g, "/") });
  }
  return [...byPath.values()];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";
}