"use client";

import { STATUS_LABELS, type LibraryEntry } from "./library";

// BYOK: the user's own Gemini API key, stored only in this browser. Chosen
// over Anthropic's API specifically because Gemini has a genuine free tier
// (see MODEL_ID below) - the tradeoff is that free-tier prompts may be used
// by Google to improve their products, unlike a paid tier. That's disclosed
// in the UI, not hidden here.
const API_KEY_STORAGE_KEY = "retroexplore:aiSuggest:apiKey:v1";

// gemini-3.7-flash is free-tier eligible. Swap this constant for a paid
// model (e.g. a Pro-tier one) if free-tier rate limits become a problem or
// the training-data tradeoff isn't acceptable for a given deployment.
export const MODEL_ID = "gemini-3.7-flash";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
}

export function setStoredApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
  } else {
    window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export type SuggestOptions = {
  apiKey: string;
  entries: LibraryEntry[];
  includeRatings: boolean;
  console: string; // "" = no constraint
  // Every console name our own catalog uses. Passed through so Gemini's
  // "Console:" answer can be matched back to a specific catalog entry - the
  // same title can exist under several platforms (e.g. a Virtual Console
  // re-release), and without this the app has no way to tell which one
  // Gemini actually meant, so it displays whichever matches by title alone.
  catalogConsoles: string[];
};

function buildPrompt(opts: SuggestOptions): string {
  const libraryLines = opts.entries.map((entry) => {
    const parts = [entry.title, entry.console ?? "Unknown console", STATUS_LABELS[entry.status]];
    if (opts.includeRatings && entry.userRating !== null) {
      parts.push(`my rating: ${entry.userRating}/5`);
    }
    return `- ${parts.join(" | ")}`;
  });

  const consoleConstraint = opts.console
    ? `The suggestion MUST be a game released for: ${opts.console}.`
    : "The suggestion can be for any console/platform.";

  return [
    "You are a retro video game recommendation assistant.",
    "Here is my game library (backlog, currently playing, completed, and dropped games):",
    libraryLines.length > 0 ? libraryLines.join("\n") : "(library is empty)",
    "",
    "Based on this library, suggest ONE game for me to play next.",
    "The game does NOT need to be in my library or any specific catalog - suggest any real game that exists, whether or not I've listed it above.",
    consoleConstraint,
    "Respond in this format:",
    "Title: <game title>",
    "Console: <console/platform>",
    "Why: <2-3 sentences on why this fits my taste, referencing specific games from my library>",
    "",
    "For the Console line specifically: if the game was released on one of these exact platforms, use that exact name verbatim (don't abbreviate, e.g. write \"Super Nintendo Entertainment System\" not \"SNES\"). If it wasn't released on any of them, name the actual platform normally.",
    opts.catalogConsoles.join(", "),
  ].join("\n");
}

export type TokenUsage = { promptTokens: number; responseTokens: number; totalTokens: number };
export type SuggestResult = ({ text: string; usage: TokenUsage | null }) | { error: string };

type GeminiPart = { text?: string };
type GeminiCandidate = {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
};
type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
  usageMetadata?: GeminiUsageMetadata;
};

// Free-tier flash models get bumped under load - 503 ("overloaded") and 429
// ("rate limited") are both transient, so it's worth a couple of automatic
// retries before surfacing an error, instead of making the user click again.
const RETRYABLE_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  apiKey: string,
  prompt: string
): Promise<{ res: Response; data: GeminiResponse } | { networkError: true }> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );
  } catch {
    return { networkError: true };
  }
  const data = (await res.json()) as GeminiResponse;
  return { res, data };
}

export async function suggestGame(opts: SuggestOptions): Promise<SuggestResult> {
  if (!opts.apiKey.trim()) {
    return { error: "Enter your Gemini API key first." };
  }

  const prompt = buildPrompt(opts);
  const apiKey = opts.apiKey.trim();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const outcome = await callGemini(apiKey, prompt);

    if ("networkError" in outcome) {
      return { error: "Network error reaching Google's API. Check your connection." };
    }

    const { res, data } = outcome;

    if (!res.ok) {
      const message = data.error?.message ?? `Request failed (${res.status}).`;
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return { error: message };
    }

    if (data.promptFeedback?.blockReason) {
      return { error: `Gemini declined to answer (${data.promptFeedback.blockReason}).` };
    }

    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.find((part) => part.text)?.text;

    if (!text) {
      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        return { error: `Gemini stopped without a full answer (${candidate.finishReason}).` };
      }
      return { error: "(No response text - check the browser console for the raw reply.)" };
    }

    const meta = data.usageMetadata;
    const usage: TokenUsage | null =
      meta?.promptTokenCount != null && meta?.candidatesTokenCount != null && meta?.totalTokenCount != null
        ? {
            promptTokens: meta.promptTokenCount,
            responseTokens: meta.candidatesTokenCount,
            totalTokens: meta.totalTokenCount,
          }
        : null;

    return { text, usage };
  }

  // Unreachable - the loop always returns on its final iteration.
  return { error: "Request failed after retrying." };
}
