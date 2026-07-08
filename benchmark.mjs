// MCP tool-definition token benchmark.
// Spawns an MCP server over stdio, calls initialize + tools/list,
// and counts the tokens its tool definitions would occupy in context.
//
// Usage: node benchmark.js '<label>' '<command>' [args...]

import { spawn } from "node:child_process";
import { encode } from "gpt-tokenizer"; // o200k_base

const [label, cmd, ...args] = process.argv.slice(2);

const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env });
let buf = "";
const pending = new Map();

child.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch { /* non-JSON noise on stdout */ }
  }
});

function send(msg) {
  child.stdin.write(JSON.stringify(msg) + "\n");
}

function request(id, method, params) {
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 25000);
    send({ jsonrpc: "2.0", id, method, params });
  });
}

try {
  await request(1, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "token-benchmark", version: "1.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  const res = await request(2, "tools/list", {});
  const tools = res.result?.tools ?? [];

  const perTool = tools.map((t) => {
    const json = JSON.stringify({ name: t.name, description: t.description, inputSchema: t.inputSchema });
    return { name: t.name, tokens: encode(json).length, chars: json.length };
  });
  const total = perTool.reduce((s, t) => s + t.tokens, 0);

  console.log(JSON.stringify({ label, toolCount: tools.length, totalTokens: total, perTool, raw: tools }, null, 0));
} catch (e) {
  console.log(JSON.stringify({ label, error: e.message }));
} finally {
  child.kill();
  process.exit(0);
}
