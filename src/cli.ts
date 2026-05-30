#!/usr/bin/env node
import { createManifest, loadConfigFile, readInputFile, scanText, wrapText } from "./index.js";

type Command = "wrap" | "scan" | "manifest";

type ParsedArgs = {
  command?: Command;
  file?: string;
  configPath?: string;
  help: boolean;
};

const usage = `Usage:
  promptquarantine wrap <file> [--config <path>]
  promptquarantine scan <file> [--config <path>]
  promptquarantine manifest <file> [--config <path>]

Commands:
  wrap       Emit fenced quarantined markdown with an embedded manifest
  scan       Emit a human-readable risk report
  manifest   Emit JSON provenance and matched rules
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(usage);
    return;
  }

  if (!args.command || !args.file) {
    throw new Error("missing command or file\n\n" + usage);
  }

  const [{ text, source }, config] = await Promise.all([readInputFile(args.file), loadConfigFile(args.configPath)]);

  if (args.command === "wrap") {
    process.stdout.write(wrapText(text, source, config));
    return;
  }

  if (args.command === "manifest") {
    process.stdout.write(JSON.stringify(createManifest(text, source, config), null, 2) + "\n");
    return;
  }

  const report = scanText(text, source, config);
  process.stdout.write(formatScanReport(report));
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { help: false };
  const remaining: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--config") {
      const configPath = argv[index + 1];
      if (!configPath) {
        throw new Error("--config requires a path");
      }
      parsed.configPath = configPath;
      index += 1;
      continue;
    }

    remaining.push(arg);
  }

  const [command, file] = remaining;
  if (command === "wrap" || command === "scan" || command === "manifest") {
    parsed.command = command;
  } else if (command) {
    throw new Error(`unknown command: ${command}\n\n${usage}`);
  }

  parsed.file = file;
  return parsed;
}

function formatScanReport(report: ReturnType<typeof scanText>): string {
  const lines = [
    `source: ${report.source}`,
    `hash: ${report.hash}`,
    `risk: ${report.risk}`,
    `bytes: ${report.bytes}`,
    "matches:"
  ];

  if (report.matches.length === 0) {
    lines.push("  none");
  } else {
    for (const match of report.matches) {
      lines.push(`  - ${match.id} (${match.risk}, ${match.count}): ${match.description}`);
    }
  }

  return lines.join("\n") + "\n";
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`promptquarantine: ${message}\n`);
  process.exitCode = 1;
});
