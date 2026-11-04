import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { encode } from "gpt-tokenizer";

const root = new URL("..", import.meta.url).pathname;
const committed = (file) => readFileSync(join(root, file), "utf8");

function results() {
  return readdirSync(join(root, "results"))
    .map((f) => JSON.parse(committed(join("results", f))))
    .filter((r) => !r.error && r.toolCount > 0);
}

test("benchmark counts the tokens of each tool definition", () => {
  const out = execFileSync(process.execPath, ["benchmark.mjs", "fixture", process.execPath, "test/fixture-server.mjs"], { cwd: root, encoding: "utf8" });
  const r = JSON.parse(out);
  assert.equal(r.toolCount, 2);
  const expected = r.raw.map((t) => encode(JSON.stringify({ name: t.name, description: t.description, inputSchema: t.inputSchema })).length);
  assert.deepEqual(r.perTool.map((t) => t.tokens), expected);
  assert.equal(r.totalTokens, expected[0] + expected[1]);
});

test("committed results recount to the same tokens", () => {
  for (const r of results()) {
    const counts = r.raw.map((t) => encode(JSON.stringify({ name: t.name, description: t.description, inputSchema: t.inputSchema })).length);
    assert.equal(counts.reduce((a, b) => a + b, 0), r.totalTokens, r.label);
  }
});

test("REPORT.md has the rows that summarize builds from results", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-report-"));
  cpSync(join(root, "results"), join(dir, "results"), { recursive: true });
  execFileSync(process.execPath, [join(root, "summarize.mjs")], { cwd: dir, stdio: "ignore" });
  const rows = readFileSync(join(dir, "REPORT.md"), "utf8").split("\n").filter((l) => /^\| .* \| [\d,]+ \|/.test(l));
  assert.ok(rows.length > 10);
  const report = committed("REPORT.md");
  for (const row of rows) assert.ok(report.includes(row), `REPORT.md is missing: ${row}`);
});

test("README headline numbers match results", () => {
  const totals = results().map((r) => r.totalTokens);
  const spread = Math.max(...totals) / Math.min(...totals);
  assert.equal(Math.floor(spread), 25);
  const stack = ["notion", "github", "playwright", "filesystem", "slack"];
  const stackTotal = results().filter((r) => stack.includes(r.label)).reduce((s, r) => s + r.totalTokens, 0);
  assert.ok(committed("README.md").includes(stackTotal.toLocaleString("en-US")));
});
