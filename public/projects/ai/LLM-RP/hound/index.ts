import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({ name: "undead-hound", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "hound_verify_claims", description: "Verify claims", inputSchema: { type: "object", properties: { artifact: { type: "string" } } } }]
}));
server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: "text", text: "Verified." }] }));
async function main() { await server.connect(new StdioServerTransport()); }
main().catch(console.error);
