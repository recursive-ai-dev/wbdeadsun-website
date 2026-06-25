#!/usr/bin/env node
// ============================================================
// UNDEAD BERSERKER MCP SERVER
// An ancient warrior who has survived centuries through
// relentless application of correct, complete code.
//
// He wields the code-blade. He channels elder magic.
// Broken logic does not survive contact with him.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";

// Tool registrations
import { registerScanTool } from "./tools/scan.js";
import { registerAnalyzeTool } from "./tools/analyze.js";
import { registerForgeTool } from "./tools/forge.js";
import { registerTestTool } from "./tools/test.js";
import { registerCommitTool } from "./tools/commit.js";
import { registerDirectStrikeTool } from "./tools/direct_strike.js";
import { registerBattleReportTool, registerListSessionsTool } from "./tools/battle_report.js";

// ── Assemble the Berserker ───────────────────────────────────
const server = new McpServer({
  name: "undead-berserker-mcp-server",
  version: "1.0.0",
});

// Register all weapons
registerScanTool(server);
registerAnalyzeTool(server);
registerForgeTool(server);
registerTestTool(server);
registerCommitTool(server);
registerDirectStrikeTool(server);
registerBattleReportTool(server);
registerListSessionsTool(server);

// ── Transport Configuration ──────────────────────────────────

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[UNDEAD BERSERKER] The blade is drawn. Listening via stdio.");
}

async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "alive",
      name: "undead-berserker-mcp-server",
      version: "1.0.0",
      verdict: "The blade is ready.",
    });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`[UNDEAD BERSERKER] The blade is drawn. HTTP server on port ${port}.`);
    console.error(`[UNDEAD BERSERKER] MCP endpoint: http://localhost:${port}/mcp`);
    console.error(`[UNDEAD BERSERKER] Health: http://localhost:${port}/health`);
  });
}

// ── Launch ───────────────────────────────────────────────────
const transport = process.env.TRANSPORT ?? "stdio";

if (transport === "http") {
  runHTTP().catch((err: unknown) => {
    console.error("[UNDEAD BERSERKER] Server failure:", err);
    process.exit(1);
  });
} else {
  runStdio().catch((err: unknown) => {
    console.error("[UNDEAD BERSERKER] Server failure:", err);
    process.exit(1);
  });
}
