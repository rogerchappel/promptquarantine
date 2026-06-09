# Orchestration Plan

`promptquarantine` is intended to run as a local or CI guard before untrusted prompt text is handed to an agent.

1. Build the CLI with `npm run build`.
2. Scan candidate text files with `promptquarantine scan`.
3. Generate a manifest for risky artifacts when review context needs to travel with an issue or handoff.
4. Run `npm run release:check` before publishing to keep tests, smoke checks, and package contents aligned.

The tool does not make policy decisions on its own. Downstream workflows should treat findings as review signals and keep a human approval step for destructive or high-impact actions.
