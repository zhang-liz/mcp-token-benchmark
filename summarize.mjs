// Build a markdown report from results/*.json
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const results = readdirSync("results")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`results/${f}`, "utf8")))
  .filter((r) => !r.error && r.toolCount > 0)
  .sort((a, b) => b.totalTokens - a.totalTokens);

const CONTEXT = 200_000;
const pct = (t) => ((t / CONTEXT) * 100).toFixed(1) + "%";

let md = `# MCP Tool-Definition Token Benchmark

Measured ${new Date().toISOString().slice(0, 10)}. Method: spawn each server over stdio,
call \`initialize\` + \`tools/list\`, serialize each tool definition
(\`name\` + \`description\` + \`inputSchema\`) as JSON, count tokens with the
o200k_base tokenizer. This measures the *static* cost a server adds to every
request before the agent does anything.

## Per-server totals

| Server | Tools | Tokens | % of 200K context | Avg tokens/tool |
|---|---:|---:|---:|---:|
`;

for (const r of results) {
  md += `| ${r.label} | ${r.toolCount} | ${r.totalTokens.toLocaleString()} | ${pct(r.totalTokens)} | ${Math.round(r.totalTokens / r.toolCount)} |\n`;
}

const all = results.flatMap((r) => r.perTool.map((t) => ({ ...t, server: r.label })));
all.sort((a, b) => b.tokens - a.tokens);

md += `\n## 15 most expensive individual tools\n\n| Tool | Server | Tokens |\n|---|---|---:|\n`;
for (const t of all.slice(0, 15)) md += `| ${t.name} | ${t.server} | ${t.tokens.toLocaleString()} |\n`;

const stack = ["notion", "github", "playwright", "filesystem", "slack"];
const stackTotal = results.filter((r) => stack.includes(r.label)).reduce((s, r) => s + r.totalTokens, 0);
md += `\n## A realistic 5-server setup (${stack.join(", ")})\n\nTotal: **${stackTotal.toLocaleString()} tokens** = **${pct(stackTotal)}** of a 200K context window — on every single request, before the agent takes any action.\n`;

md += `\n## Notes / caveats\n
- o200k tokenizer is a proxy; Anthropic's tokenizer differs slightly but relative ratios hold.
- Clients add their own framing around tool defs, so real-world cost is a bit higher than these floors.
- Servers benchmarked at their npm latest on the date above; raw JSON in \`results/\`.
`;

writeFileSync("REPORT.md", md);
console.log(md);
