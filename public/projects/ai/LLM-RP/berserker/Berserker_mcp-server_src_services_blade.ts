// ============================================================
// UNDEAD BERSERKER MCP SERVER — THE BLADE SERVICE
// Wraps the Claude API. Elder magic lives here.
// Extended thinking = centuries of reasoning compressed.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { BERSERKER_SYSTEM_PROMPT, ELDER_MAGIC, SWIFT_STRIKE } from "../constants.js";
import type { ElderMagicConfig } from "../types.js";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. The berserker cannot draw his blade without it. " +
        "Set the environment variable and try again."
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Strike with the code-blade. Sends a prompt to Claude with the berserker
 * system prompt and optional extended thinking (elder magic).
 */
export async function strike(
  prompt: string,
  config: ElderMagicConfig = ELDER_MAGIC,
  additionalSystemContext?: string
): Promise<string> {
  const client = getClient();

  const systemPrompt = additionalSystemContext
    ? `${BERSERKER_SYSTEM_PROMPT}\n\n${additionalSystemContext}`
    : BERSERKER_SYSTEM_PROMPT;

  const useExtendedThinking = config.thinking_budget_tokens > 0;

  if (useExtendedThinking) {
    // Elder magic: extended thinking enabled
    // Use type assertion to support extended thinking params not yet in SDK typedefs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createFn = client.messages.create.bind(client.messages) as (params: any) => Promise<Anthropic.Message>;
    const response = await createFn({
      model: config.model,
      max_tokens: config.max_output_tokens,
      thinking: {
        type: "enabled",
        budget_tokens: config.thinking_budget_tokens,
      },
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      betas: ["interleaved-thinking-2025-05-14"],
    });

    // Extract text content from the response (skip thinking blocks)
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!textContent) {
      throw new Error("The blade struck but produced no output. The elder magic may have consumed all tokens.");
    }

    return textContent;
  } else {
    // Swift strike: no extended thinking
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.max_output_tokens,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!textContent) {
      throw new Error("The blade produced no output.");
    }

    return textContent;
  }
}

/**
 * Strike with elder magic at maximum depth.
 */
export async function elderStrike(prompt: string, additionalContext?: string): Promise<string> {
  return strike(prompt, ELDER_MAGIC, additionalContext);
}

/**
 * Strike swiftly — no extended thinking, for tasks that don't require
 * centuries of reasoning.
 */
export async function swiftStrike(prompt: string, additionalContext?: string): Promise<string> {
  return strike(prompt, SWIFT_STRIKE, additionalContext);
}

/**
 * Parse a JSON response from the blade, with error recovery.
 */
export function parseBladeJson<T>(raw: string, context: string): T {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  // Find the first { or [ and last } or ]
  const firstBrace = cleaned.search(/[\[{]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(
      `The blade's response for '${context}' contained no parseable JSON. ` +
      `Raw response (first 500 chars): ${raw.slice(0, 500)}`
    );
  }

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(
      `The blade's response for '${context}' contained malformed JSON. ` +
      `Parse error: ${err instanceof Error ? err.message : String(err)}. ` +
      `JSON attempted (first 500 chars): ${jsonStr.slice(0, 500)}`
    );
  }
}
