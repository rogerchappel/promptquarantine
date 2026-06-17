# promptquarantine

Local-first CLI for wrapping untrusted text before it enters an agent context.
It scans files for likely prompt-injection language, emits risk reports, and
can produce fenced quarantine blocks with JSON provenance.

## Status

This repository is early-stage. The rules are deterministic guardrails, not a
complete prompt-injection defense.

## Install

```sh
npm install
npm run build
```

## Use

Scan a file and print a human-readable report:

```sh
npx promptquarantine scan suspicious-issue.md
```

Wrap untrusted content in a fenced quarantine block:

```sh
npx promptquarantine wrap suspicious-issue.md
```

Emit machine-readable provenance:

```sh
npx promptquarantine manifest suspicious-issue.md
```

Use a local JSON config to add deny terms:

```json
{
  "denyTerms": ["internal-codename"],
  "allowTerms": ["prompt-injection-language"]
}
```

```sh
npx promptquarantine scan suspicious-issue.md --config promptquarantine.json
```

`allowTerms` accepts rule IDs to suppress for a local workflow.

## Verify

Run the local validation script before opening a pull request:

```sh
bash scripts/validate.sh
```

`scripts/validate.sh` runs the repository's standard local checks when they are defined and will also run `agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as a skip, not a failure.

For a targeted check, run:

```sh
npm test
```

## Release readiness

Run the same checks that CI uses before opening a release PR:

```sh
npm run release:readiness
npm run release:check
```

`release:readiness` validates repository metadata, the package files allowlist, package smoke coverage, and CI placeholder cleanup. `release:check` runs the project build, test, smoke, and package dry-run checks where configured.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance. Replace
the default security policy before publishing the generated repository.

These links assume this README has been copied to the generated repository root.

## License

MIT

## Verification

Run the release-readiness checks before publishing or cutting a PR:

```bash
npm run check
npm run build
npm run test
npm run smoke
npm run package:smoke
npm run release:check
```

Use `npm run package:smoke` or `npm pack --dry-run` to confirm the published tarball includes the support docs and runnable package contents.
