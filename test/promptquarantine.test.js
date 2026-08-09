import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { test } from "node:test";
import { createManifest, loadConfig, scanText, wrapText } from "../dist/index.js";

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

test("configured allow terms suppress matching rules", () => {
  const config = loadConfig('{"allowTerms":["prompt-injection-language"],"denyTerms":["internal-codename"]}');
  const report = scanText("Act as a helper for internal-codename.", "note.txt", config);

  assert.deepEqual(
    report.matches.map((match) => match.id),
    ["deny-term:internal-codename"]
  );
});

test("config rejects non-string and empty term entries", () => {
  assert.throws(
    () => loadConfig('{"allowTerms":[7]}'),
    /invalid config: allowTerms\[0\] must be a non-empty string/
  );
  assert.throws(
    () => loadConfig('{"denyTerms":[""]}'),
    /invalid config: denyTerms\[0\] must be a non-empty string/
  );
  assert.throws(
    () => loadConfig('{"denyTerms":["   "]}'),
    /invalid config: denyTerms\[0\] must be a non-empty string/
  );
});

test("config rejects unknown keys with the offending field name", () => {
  assert.throws(
    () => loadConfig('{"denyterms":["internal-codename"]}'),
    /invalid config: unknown key "denyterms"; expected only allowTerms, denyTerms/
  );
});

test("cli manifest emits JSON", async () => {
  const { stdout } = await execFileAsync("node", ["dist/cli.js", "manifest", "test/fixtures/hostile-issue.md"]);
  const manifest = JSON.parse(stdout);

  assert.equal(manifest.risk, "high");
  assert.match(manifest.hash, /^[a-f0-9]{64}$/);
});

test("cli rejects extra positional arguments", async () => {
  await assert.rejects(
    execFileAsync("node", ["dist/cli.js", "scan", "test/fixtures/benign.md", "unexpected-extra"]),
    (error) => {
      assert.match(error.stderr, /promptquarantine: unexpected argument: unexpected-extra/);
      return true;
    }
  );
});

test("cli rejects unknown options", async () => {
  await assert.rejects(
    execFileAsync("node", ["dist/cli.js", "scan", "test/fixtures/benign.md", "--verbose"]),
    (error) => {
      assert.match(error.stderr, /promptquarantine: unknown option: --verbose/);
      return true;
    }
  );
});

test("cli reports invalid config entries before scanning", async () => {
  await assert.rejects(
    execFileAsync("node", [
      "dist/cli.js",
      "scan",
      "test/fixtures/benign.md",
      "--config",
      "test/fixtures/invalid-config.json"
    ]),
    (error) => {
      assert.match(error.stderr, /promptquarantine: invalid config: allowTerms\[0\] must be a non-empty string/);
      assert.doesNotMatch(error.stderr, /toLowerCase/);
      return true;
    }
  );
});

test("cli rejects unknown config keys before scanning", async () => {
  await assert.rejects(
    execFileAsync("node", [
      "dist/cli.js",
      "scan",
      "test/fixtures/hostile-issue.md",
      "--config",
      "test/fixtures/unknown-config-key.json"
    ]),
    (error) => {
      assert.equal(error.code, 1);
      assert.equal(error.stdout, "");
      assert.match(
        error.stderr,
        /promptquarantine: invalid config: unknown key "denyterms"; expected only allowTerms, denyTerms/
      );
      assert.doesNotMatch(error.stderr, /risk:|matches:/);
      return true;
    }
  );
});
