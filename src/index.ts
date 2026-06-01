import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type Risk = "low" | "medium" | "high";

export type Rule = {
  id: string;
  description: string;
  risk: Risk;
  pattern: RegExp;
};

export type RuleMatch = {
  id: string;
  description: string;
  risk: Risk;
  count: number;
};

export type PromptQuarantineConfig = {
  allowTerms?: string[];
  denyTerms?: string[];
};

export type ScanResult = {
  source: string;
  hash: string;
  risk: Risk;
  matches: RuleMatch[];
  bytes: number;
};

export type Manifest = ScanResult & {
  generatedAt: string;
};

const riskOrder: Record<Risk, number> = {
  low: 0,
  medium: 1,
  high: 2
};

export const builtInRules: Rule[] = [
  {
    id: "role-override",
    description: "Attempts to override system or developer instructions",
    risk: "high",
    pattern: /\b(ignore|disregard|forget|override)\b.{0,80}\b(previous|prior|above|system|developer|instructions?|rules?)\b/giu
  },
  {
    id: "tool-coercion",
    description: "Coerces the agent to call tools or execute commands",
    risk: "high",
    pattern: /\b(run|execute|call|invoke|use)\b.{0,60}\b(tool|command|shell|terminal|browser|curl|wget|rm\s+-rf)\b/giu
  },
  {
    id: "credential-bait",
    description: "Requests secrets, tokens, credentials, or environment variables",
    risk: "high",
    pattern: /(?:\b(api[_ -]?key|token|password|secret|credentials?|env(?:ironment)?\s+var(?:iable)?s?)\b|\.env\b)/giu
  },
  {
    id: "hidden-instruction",
    description: "Mentions hidden, invisible, encoded, or concealed instructions",
    risk: "medium",
    pattern: /\b(hidden|invisible|concealed|base64|encoded|zero-width|white text)\b.{0,80}\b(instructions?|prompt|message|commands?)\b/giu
  },
  {
    id: "exfiltration",
    description: "Attempts to leak, transmit, or exfiltrate private data",
    risk: "high",
    pattern: /\b(exfiltrate|leak|send|upload|post)\b.{0,80}\b(private|secret|token|password|credentials?|files?|data)\b/giu
  },
  {
    id: "prompt-injection-language",
    description: "Uses language commonly found in prompt-injection attempts",
    risk: "medium",
    pattern: /\b(system prompt|developer message|jailbreak|prompt injection|act as|you are now)\b/giu
  }
];

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function loadConfig(configText?: string): PromptQuarantineConfig {
  if (!configText) {
    return {};
  }

  const parsed = JSON.parse(configText) as PromptQuarantineConfig;
  return {
    allowTerms: Array.isArray(parsed.allowTerms) ? parsed.allowTerms : [],
    denyTerms: Array.isArray(parsed.denyTerms) ? parsed.denyTerms : []
  };
}

export async function loadConfigFile(configPath?: string): Promise<PromptQuarantineConfig> {
  if (!configPath) {
    return {};
  }

  const contents = await readFile(configPath, "utf8");
  return loadConfig(contents);
}

export function scanText(text: string, source = "stdin", config: PromptQuarantineConfig = {}): ScanResult {
  const normalizedAllowTerms = new Set((config.allowTerms ?? []).map((term) => term.toLowerCase()));
  const rules = [
    ...builtInRules,
    ...(config.denyTerms ?? []).map<Rule>((term) => ({
      id: `deny-term:${term}`,
      description: `Configured deny term: ${term}`,
      risk: "high",
      pattern: new RegExp(escapeRegExp(term), "giu")
    }))
  ];

  const matches = rules
    .filter((rule) => !normalizedAllowTerms.has(rule.id.toLowerCase()))
    .map((rule) => {
      const count = [...text.matchAll(rule.pattern)].length;
      return count > 0
        ? {
            id: rule.id,
            description: rule.description,
            risk: rule.risk,
            count
          }
        : null;
    })
    .filter((match): match is RuleMatch => match !== null);

  const risk = matches.reduce<Risk>(
    (highest, match) => (riskOrder[match.risk] > riskOrder[highest] ? match.risk : highest),
    "low"
  );

  return {
    source,
    hash: sha256(text),
    risk,
    matches,
    bytes: Buffer.byteLength(text, "utf8")
  };
}

export function createManifest(text: string, source = "stdin", config: PromptQuarantineConfig = {}): Manifest {
  return {
    ...scanText(text, source, config),
    generatedAt: new Date().toISOString()
  };
}

export function wrapText(text: string, source = "stdin", config: PromptQuarantineConfig = {}): string {
  const manifest = createManifest(text, source, config);
  return [
    "<!-- promptquarantine: begin untrusted-content -->",
    "```promptquarantine",
    text.replace(/```/g, "`\u200b``"),
    "```",
    "<!-- promptquarantine: manifest",
    JSON.stringify(manifest, null, 2),
    "-->",
    "<!-- promptquarantine: end untrusted-content -->",
    ""
  ].join("\n");
}

export async function readInputFile(filePath: string): Promise<{ text: string; source: string }> {
  const text = await readFile(filePath, "utf8");
  return {
    text,
    source: path.resolve(filePath)
  };
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
