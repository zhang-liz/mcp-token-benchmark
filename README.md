# MCP Token Benchmark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

How many context tokens does an MCP server's tool definitions cost, before the agent does anything?

This repo benchmarks 9 popular MCP servers, finds a **25× efficiency spread** between the best and worst, and includes a redesign of the worst offender (Notion, 17,161 tokens) that cuts it to 773 tokens (**95.5% reduction**) with the same workflow coverage.

Full results and analysis: [REPORT.md](REPORT.md)

## Results at a glance

| Server | Tools | Tokens | % of 200K context |
|---|---:|---:|---:|
| notion (official) | 24 | 17,161 | 8.6% |
| firecrawl | 26 | 16,565 | 8.3% |
| github (archived npm) | 26 | 3,546 | 1.8% |
| slack | 8 | 679 | 0.3% |

A realistic 5-server setup (notion, github, playwright, filesystem, slack) occupies **26,224 tokens (13.1%)** of a 200K context window on every request. Where the cost lives: for the worst server, **97% is inputSchema**, not descriptions.

## Quick start

```bash
git clone https://github.com/zhang-liz/mcp-token-benchmark.git
cd mcp-token-benchmark
npm install

# benchmark any npx-runnable MCP server
node benchmark.mjs "<label>" npx -y <mcp-package> [args...]

# examples
node benchmark.mjs "filesystem" npx -y @modelcontextprotocol/server-filesystem /tmp
node benchmark.mjs "slack" npx -y @modelcontextprotocol/server-slack
```

Output: per-tool and total token counts for the server's `tools/list` response, serialized as `{name, description, inputSchema}`. This is the static cost the server adds to every request.

Regenerate the report from `results/`:

```bash
node summarize.mjs
```

## Method

1. Spawn the server over stdio
2. Send `initialize` and `tools/list`, the standard MCP handshake
3. Serialize each tool definition (name + description + inputSchema) as JSON
4. Count tokens with the o200k_base tokenizer

This measures the floor: real clients add their own framing around tool definitions, so actual costs run higher. Absolute counts differ somewhat under other tokenizers; the rankings are what matter.

## Repository layout

| Path | Purpose |
|---|---|
| `benchmark.mjs` | Spawns a server over stdio, runs the MCP handshake, counts tokens |
| `summarize.mjs` | Builds REPORT.md from `results/*.json` |
| `results/` | Raw per-server output, tool definitions included |
| `notion-redesigned.json` | The 7-tool workflow-level redesign of the Notion server |
| `REPORT.md` | Full results, per-tool breakdown, and the before/after redesign |

## Caveats

- The o200k tokenizer is a proxy; Anthropic's tokenizer differs slightly but relative ratios hold.
- The github row is the archived npm server (`@modelcontextprotocol/server-github`), benchmarked because it is still what npx installs.
- Servers were benchmarked at their npm latest on 2026-07-08; raw JSON is committed in `results/` for reproducibility.
- The Notion redesign is definitions-only: it measures context cost, not task success. A task-suite comparison is future work.

## Contributing

Issues and PRs are welcome. The most useful contributions: benchmark runs for servers not yet in `results/` (just commit the JSON output of `benchmark.mjs`), and corrections if a vendor ships a leaner server version.

## License

[MIT](LICENSE)
