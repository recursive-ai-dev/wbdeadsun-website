import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({ name: "undead-dragon", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "dragon_issue_mission_signature", description: "Issue signature", inputSchema: { type: "object", properties: { name: { type: "string" } } } }]
}));
server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: "text", text: "Mission signed." }] }));
async function main() { await server.connect(new StdioServerTransport()); }
main().catch(console.error);
