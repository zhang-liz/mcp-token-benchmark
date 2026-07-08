# MCP Tool-Definition Token Benchmark

Measured 2026-07-08. Method: spawn each server over stdio,
call `initialize` + `tools/list`, serialize each tool definition
(`name` + `description` + `inputSchema`) as JSON, count tokens with the
o200k_base tokenizer. This measures the *static* cost a server adds to every
request before the agent does anything.

## Per-server totals

| Server | Tools | Tokens | % of 200K context | Avg tokens/tool |
|---|---:|---:|---:|---:|
| notion | 24 | 17,161 | 8.6% | 715 |
| firecrawl | 26 | 16,565 | 8.3% | 637 |
| github (archived npm) | 26 | 3,546 | 1.8% | 136 |
| playwright | 23 | 3,198 | 1.6% | 139 |
| filesystem | 14 | 1,640 | 0.8% | 117 |
| everything | 13 | 1,084 | 0.5% | 83 |
| context7 | 2 | 977 | 0.5% | 489 |
| memory | 9 | 900 | 0.4% | 100 |
| sequential-thinking | 1 | 852 | 0.4% | 852 |
| slack | 8 | 679 | 0.3% | 85 |

Labeling note: the github row is the archived npm server
(`@modelcontextprotocol/server-github`), benchmarked because it is still what
npx installs. The current official Go-based server exposes several times more
tools; rerunning against it would widen the spread.

## 15 most expensive individual tools

| Tool | Server | Tokens |
|---|---|---:|
| firecrawl_monitor_create | firecrawl | 2,012 |
| firecrawl_scrape | firecrawl | 1,934 |
| firecrawl_search | firecrawl | 1,833 |
| firecrawl_search_feedback | firecrawl | 1,347 |
| API-update-page-markdown | notion | 1,268 |
| firecrawl_interact | firecrawl | 1,161 |
| firecrawl_parse | firecrawl | 1,144 |
| firecrawl_crawl | firecrawl | 1,124 |
| API-post-search | notion | 1,083 |
| firecrawl_monitor_check | firecrawl | 901 |
| firecrawl_agent | firecrawl | 892 |
| API-patch-page | notion | 876 |
| sequentialthinking | sequential-thinking | 852 |
| API-post-page | notion | 806 |
| firecrawl_feedback | firecrawl | 791 |

## A realistic 5-server setup (notion, github, playwright, filesystem, slack)

Total: **26,224 tokens** = **13.1%** of a 200K context window, occupied on
every request before the agent takes any action.

## Notes / caveats

- o200k tokenizer is a proxy; Anthropic's tokenizer differs slightly but relative ratios hold.
- Clients add their own framing around tool defs, so real-world cost is a bit higher than these floors.
- Servers benchmarked at their npm latest on the date above; raw JSON in `results/`.

## Before/after: redesigning the Notion server

Where Notion's 17,161 tokens actually live: **97% is inputSchema**. Every tool
embeds Notion's full rich-text object model as JSON-schema `$defs`. Even
`API-get-user`, which takes a single string parameter, costs 591 tokens.
The descriptions are OpenAPI dumps too (tool names like `API-patch-page`,
descriptions listing HTTP error codes), but they're only 3% of the cost.

Redesign applied (same workflow coverage, 24 tools → 7):

- **Workflow tools, not API mirrors:** `write_page` replaces post-page,
  patch-page, patch-block-children, update-page-markdown, update-a-block,
  delete-a-block, move-page
- **Markdown in/out instead of block trees:** the schema shrinks to
  `{content: string}`; the server translates internally (the official server
  already does this for its two markdown tools)
- **Flat schemas, no $defs:** filter/property syntax explained in one line of
  description instead of exhaustive nested schema

| | Tools | Tokens | Avg/tool |
|---|---:|---:|---:|
| Official Notion MCP | 24 | 17,161 | 715 |
| Redesigned | 7 | 773 | 110 |

The redesigned server (773 tokens) costs about the same as Slack's official
server (679). Well-designed MCP servers cluster around this size regardless
of domain complexity. Full redesigned definitions: `notion-redesigned.json`.
