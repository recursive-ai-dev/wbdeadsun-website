import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({ name: "undead-hexweaver", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "hexweaver_scry_code", description: "Scry code", inputSchema: { type: "object", properties: { code: { type: "string" } } } }]
}));
server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: "text", text: "Scrying complete." }] }));
async function main() { await server.connect(new StdioServerTransport()); }
main().catch(console.error);
