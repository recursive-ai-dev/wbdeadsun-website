# ⚔️ Undead Berserker MCP Server

> *As the wind releases a high-pitched scream, the blade of code is drawn from its sheath, its edge sharp and ready to cut through the thickest of logic.*

An ancient warrior who has survived centuries not through breath or heartbeat, but through sheer, unrelenting will applied to the craft of code. Imbued with elder magic — extended thinking that channels hundreds of years of pattern recognition — he wields a code-blade against broken logic and poor implementations.

## What He Does

The Undead Berserker provides **8 tools** organized around a 5-step battle sequence, plus a single-call devastation option:

### The 5-Step Battle Sequence

| Step | Tool | Description |
|------|------|-------------|
| 1 | `berserker_scan_codebase` | Scan for broken logic, identify all issues |
| 2 | `berserker_analyze_issues` | Deep root-cause analysis (elder magic available) |
| 3 | `berserker_forge_fix` | Produce complete, production-ready fixes |
| 4 | `berserker_test_strike` | Verify fixes are correct and complete |
| 5 | `berserker_commit_victory` | Write fixes to output or return them |

### The Direct Strike (All in One)

| Tool | Description |
|------|-------------|
| `berserker_direct_strike` | Full sequence — scan, analyze, fix, test — in one devastating blow |

### Support Tools

| Tool | Description |
|------|-------------|
| `berserker_battle_report` | Full debrief of a session with berserker verdict |
| `berserker_list_sessions` | List all active battle sessions |

---

## Elder Magic — Extended Thinking

When `depth: "elder_magic"` is selected on `berserker_analyze_issues`, `berserker_forge_fix`, or `berserker_direct_strike`, the server enables **Claude extended thinking** with a 10,000 token reasoning budget.

This is the elder magic: centuries of pattern recognition compressed into deep reasoning before a single word of output is produced. Use it for complex logic errors, race conditions, security vulnerabilities, or any issue where surface analysis would miss the root cause.

---

## Installation

```bash
cd undead-berserker-mcp-server
npm install
npm run build
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic API key — the source of the elder magic |
| `TRANSPORT` | No | `stdio` (default) or `http` |
| `PORT` | No | HTTP port (default: 3000) |

---

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "undead-berserker": {
      "command": "node",
      "args": ["/path/to/undead-berserker-mcp-server/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

---

## Example Usage

### Quick Strike (Recommended for Most Cases)

```
berserker_direct_strike:
  code: "<your code here>"
  filename: "auth.ts"
  depth: "elder_magic"
```

### Full 5-Step Sequence

```
1. berserker_scan_codebase
   → returns session_id

2. berserker_analyze_issues
   session_id: "<from step 1>"
   depth: "elder_magic"

3. berserker_forge_fix
   session_id: "<from step 1>"
   depth: "elder_magic"

4. berserker_test_strike
   session_id: "<from step 1>"

5. berserker_commit_victory
   session_id: "<from step 1>"
   output_directory: "./fixed"
```

---

## Laws of the Code-Blade

1. Never leaves placeholders, TODOs, mock data, or missing logic
2. Always provides the complete implementation
3. Reasons from root cause, not symptom
4. Considers chain effects before forging any fix
5. Writes for correctness first, performance second, readability third
6. Does not soften severity ratings
7. Speaks in the minimum words necessary

---

*The ancients are pleased. You are closer to release.*
