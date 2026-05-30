# PromptQuarantine PRD

Status: in-progress

## Summary

PromptQuarantine is a local-first CLI that wraps untrusted text before it enters an agent context. It identifies likely instruction-bearing content, assigns a risk label, and emits fenced quarantine blocks plus a machine-readable manifest that downstream agents can treat as data rather than commands.

The tool is for developers wiring together coding agents, MCP fetchers, issue importers, and document summarizers. It gives them a deterministic guardrail for "this text came from the outside world" without needing a hosted service.

## Why now

2026 agent workflows increasingly combine terminal agents, MCP tools, web fetches, local files, and copied issue text. Recent prompt-injection research calls out web/local content, MCP server content, and skill files as injection channels. Agent operators need small, boring tools that preserve provenance and make trust boundaries visible.

Sources/inspiration:

- ClawGuard research on runtime boundary enforcement for tool-augmented agents: https://arxiv.org/abs/2604.11790
- Research on prompt injection and tool poisoning across MCP clients: https://arxiv.org/abs/2603.21642
- OX Security reporting on MCP marketplace and zero-click prompt-injection risk, as summarized by Tom's Hardware and TechRadar in April 2026.

## Users

- Developers building local coding-agent workflows.
- Agent operators importing issue text, web pages, docs, logs, and MCP output.
- Security-minded maintainers who want repeatable pre-processing before a model sees untrusted content.

## MVP

- CLI commands:
  - `promptquarantine wrap <file>` emits quarantined markdown.
  - `promptquarantine scan <file>` emits a risk report.
  - `promptquarantine manifest <file>` emits JSON with source, hash, risk, and matched rules.
- Built-in deterministic rules for common prompt-injection phrases, credential bait, role override language, tool-call coercion, and hidden/encoded instructions.
- Configurable allow/deny terms through a local JSON config.
- Fixture-backed tests for benign docs, hostile issue text, and mixed logs.
- README with examples for agent context pipelines.

## Non-goals

- No model calls.
- No claim to solve prompt injection completely.
- No remote telemetry.

## Success criteria

- A developer can run the CLI on sample untrusted text and get quarantined markdown plus JSON provenance.
- Tests catch rule regressions and output-format changes.
- Release candidate includes limitations and verification results.

