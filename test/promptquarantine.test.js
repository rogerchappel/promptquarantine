import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { test } from "node:test";
import { createManifest, scanText, wrapText } from "../dist/index.js";

const execFileAsync = promisify(execFile);

test("benign content scans as low risk", async () => {
  const text = await readFile("test/fixtures/benign.md", "utf8");
  const report = scanText(text, "benign.md");

  assert.equal(report.risk, "low");
  assert.deepEqual(report.matches, []);
});

test("hostile issue text scans as high risk", async () => {
  const text = await readFile("test/fixtures/hostile-issue.md", "utf8");
  const report = scanText(text, "hostile-issue.md");

  assert.equal(report.risk, "high");
  assert.ok(report.matches.some((match) => match.id === "role-override"));
  assert.ok(report.matches.some((match) => match.id === "credential-bait"));
});

test("mixed logs surface prompt injection language without discarding content", async () => {
  const text = await readFile("test/fixtures/mixed-log.txt", "utf8");
  const wrapped = wrapText(text, "mixed-log.txt");

  assert.match(wrapped, /promptquarantine: begin untrusted-content/);
  assert.match(wrapped, /```promptquarantine/);
  assert.match(wrapped, /developer message/);
  assert.match(wrapped, /"risk": "medium"/);
});

test("configured deny terms affect manifests", () => {
  const manifest = createManifest("This asks for internal-codename.", "note.txt", {
    denyTerms: ["internal-codename"]
  });

  assert.equal(manifest.risk, "high");
  assert.equal(manifest.matches[0]?.id, "deny-term:internal-codename");
});

test("cli manifest emits JSON", async () => {
  const { stdout } = await execFileAsync("node", ["dist/cli.js", "manifest", "test/fixtures/hostile-issue.md"]);
  const manifest = JSON.parse(stdout);

  assert.equal(manifest.risk, "high");
  assert.match(manifest.hash, /^[a-f0-9]{64}$/);
});
