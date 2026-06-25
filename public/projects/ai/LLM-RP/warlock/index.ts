import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "undead-warlock", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "warlock_explore_branches", description: "Explore architectural branches", inputSchema: { type: "object", properties: { problem: { type: "string" } } } },
    { name: "warlock_excavate_assumptions", description: "Find load-bearing assumptions", inputSchema: { type: "object", properties: { design: { type: "string" } } } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  return { content: [{ type: "text", text: "Warlock analysis complete." }] };
});

async function main() { await server.connect(new StdioServerTransport()); }
main().catch(console.error);
