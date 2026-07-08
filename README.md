# MCP Token Benchmark

How many context tokens does an MCP server's tool definitions cost, before the agent does anything?

This repo benchmarks 9 popular MCP servers, finds a **25× efficiency spread** between the best and worst, and includes a redesign of the worst offender (Notion, 17,161 tokens) that cuts it to 773 tokens (**95.5% reduction**) with the same workflow coverage.

Full results and analysis: [REPORT.md](REPORT.md)

## Run it

```bash
npm install
node benchmark.mjs "<label>" npx -y <mcp-package> [args...]

# examples
node benchmark.mjs "filesystem" npx -y @modelcontextprotocol/server-filesystem /tmp
node benchmark.mjs "slack" npx -y @modelcontextprotocol/server-slack
```

Output: per-tool and total token counts (o200k tokenizer) for the server's `tools/list` response, serialized as `{name, description, inputSchema}`. This is the static cost the server adds to every request.

Regenerate the report from `results/`:

```bash
node summarize.mjs
```

## Files

- `benchmark.mjs`: spawns a server over stdio, runs the MCP handshake, counts tokens
- `summarize.mjs`: builds REPORT.md from `results/*.json`
- `results/`: raw per-server output (tool definitions included)
- `notion-redesigned.json`: the 7-tool workflow-level redesign of the Notion server
