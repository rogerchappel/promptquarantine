# Task Breakdown

## Release readiness

- Keep the quarantine scanner fixtures representative of benign prompts, hostile issue bodies, and mixed logs.
- Run `npm run release:check` before publishing or tagging a release candidate.
- Confirm `npm run package:smoke` includes the CLI build output, fixtures, and support docs.

## Follow-up candidates

- Add more fixture cases for encoded prompt-injection markers.
- Document expected false positives and review guidance for security triage workflows.
