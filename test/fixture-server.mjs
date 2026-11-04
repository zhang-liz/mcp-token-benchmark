// Smallest MCP server over stdio, so the test needs no network.
import { createInterface } from "node:readline";

const tools = [
  { name: "echo", description: "Echo text back", inputSchema: { type: "object", properties: { text: { type: "string" } } } },
  { name: "ping", description: "Reply with pong", inputSchema: { type: "object", properties: {} } },
];

for await (const line of createInterface({ input: process.stdin })) {
  const msg = JSON.parse(line);
  if (msg.id == null) continue;
  const result = msg.method === "tools/list" ? { tools } : { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "fixture", version: "1.0.0" } };
  console.log(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
}
