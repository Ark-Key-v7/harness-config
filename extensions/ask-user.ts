/**
 * factory-ask-user — structured mid-turn questionnaire tool.
 *
 * Canon: Harness Handbook v1.2 §2.3 (baseline extension #3): the model invokes
 * a structured question (typed options or free text) instead of pausing the
 * ReAct loop to list questions in prose. Contracts (§3.1 must_haves) answer
 * what can be known upfront; ask-user handles what surfaces mid-execution.
 *
 * Authoring rules honored (§2.3): schema minimal and strictly typed;
 * description states preconditions, not aspirations; output follows AXI —
 * only what the next reasoning step requires.
 *
 * API: verified against pi-coding-agent 0.84.3 (API-VERIFIED-0.84.3.md §6).
 *
 * Degradation: this is a workflow primitive, NOT a guard — in non-UI modes
 * (print/json, rpc without dialogs) it does not block; it returns guidance
 * telling the model to ask its question in prose and stop the turn.
 *
 * ACP frontend rule (Zed): pi-acp runs pi in rpc mode where ctx.hasUI is
 * true, but the adapter HARD-CANCELS input/editor dialogs ("not supported in
 * ACP yet") and renders select as a bare permission prompt. So when the
 * frontend is ACP (Zed), never invoke the interactive input UI — the tool
 * returns guidance to ask the question as plain chat text instead; approval
 * semantics live with the caller (proceed only on an explicit typed
 * affirmative; dismissal, timeout, or ambiguity are non-ratification).
 * Detection: this session's file listed in ~/.pi/pi-acp/session-map.json
 * (pi-acp deletes entries on session close, so the map is current).
 */

import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const askUserSchema = Type.Object({
  question: Type.String({
    description: "The single question to ask the operator. One question per call — ask the most blocking one first.",
  }),
  options: Type.Optional(
    Type.Array(Type.String(), {
      description: "Typed choices when the answer space is known and closed. Omit for free-text answers. Keep options mutually exclusive.",
      minItems: 2,
      maxItems: 6,
    }),
  ),
  allowFreeText: Type.Optional(
    Type.Boolean({
      description: "When options are provided, whether the operator may also answer in free text. Default false.",
    }),
  ),
});

type AskUserInput = Static<typeof askUserSchema>;

/**
 * True when this session is driven by pi-acp (Zed's ACP adapter): the adapter
 * hard-cancels input/editor dialogs, so the interactive UI must never be
 * invoked there. Detection is session-map membership — deterministic,
 * per-session, and cleaned up by the adapter on session close. An unreadable
 * map means "not known to be ACP": dialogs are safe to try.
 */
function isAcpSession(ctx: { sessionManager?: { getSessionFile?: () => string | undefined } }): boolean {
  try {
    const file = ctx.sessionManager?.getSessionFile?.();
    if (!file) return false;
    const map = JSON.parse(
      readFileSync(join(homedir(), ".pi", "pi-acp", "session-map.json"), "utf8"),
    ) as { sessions?: Record<string, { sessionFile?: string }> };
    return Object.values(map.sessions ?? {}).some((s) => s?.sessionFile === file);
  } catch {
    return false;
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "ask_user",
    label: "Ask User",
    description:
      "Ask the operator a structured question mid-turn and receive the answer as the tool result. " +
      "Precondition: the answer is genuinely blocking and cannot be derived from the repository, the task contract, or the manifold. " +
      "Use options when the answer space is closed; omit them for free-text. Do not use for status reports or rhetorical confirmation.",
    promptSnippet: "Ask the operator a structured question mid-turn",
    promptGuidelines: [
      "Prefer ask_user over listing questions in prose when an answer blocks progress.",
      "One question per ask_user call; ask the most blocking question first.",
    ],
    parameters: askUserSchema,
    async execute(_toolCallId, params: AskUserInput, _signal, _onUpdate, ctx) {
      // Non-UI modes cannot ask interactively — degrade to prose guidance.
      if (!ctx.hasUI) {
        return {
          content: [
            {
              type: "text",
              text: "INTERACTIVE UI UNAVAILABLE in this run mode. Ask this question in plain prose, end your turn, and wait for the operator's next message. Do not call ask_user again this session.",
            },
          ],
          details: { asked: false, reason: "no_ui" },
        };
      }

      // ACP frontend (Zed): pi-acp cancels input dialogs outright — never
      // invoke the interactive input UI. Degrade to plain chat text; the
      // model poses the question in prose and ends its turn.
      if (isAcpSession(ctx)) {
        return {
          content: [
            {
              type: "text",
              text: "ACP FRONTEND (Zed) DETECTED — the interactive input UI is not supported here (pi-acp cancels it). Ask this question as plain chat text, end your turn, and wait for the operator's typed reply. For approvals: proceed only on an explicit typed affirmative; treat dismissal, timeout, or ambiguity as non-ratification. Do not call ask_user again for this question.",
            },
          ],
          details: { asked: false, reason: "acp_frontend" },
        };
      }

      try {
        let answer: string | undefined;

        if (params.options && params.options.length >= 2) {
          const options = params.allowFreeText
            ? [...params.options, "(other — type a custom answer)"]
            : params.options;
          const choice = await ctx.ui.select(params.question, options);
          if (choice === undefined) {
            answer = undefined; // dismissed
          } else if (params.allowFreeText && choice === "(other — type a custom answer)") {
            answer = await ctx.ui.input(params.question, "Type your answer");
          } else {
            answer = choice;
          }
        } else {
          answer = await ctx.ui.input(params.question, "Type your answer");
        }

        if (answer === undefined) {
          return {
            content: [{ type: "text", text: "OPERATOR DISMISSED THE QUESTION without answering. Treat the question as unanswered: proceed on the safest reasonable default and state the assumption you made." }],
            details: { asked: true, answered: false },
          };
        }

        return {
          content: [{ type: "text", text: `OPERATOR ANSWER: ${answer}` }],
          details: { asked: true, answered: true, answer },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `ask_user failed (${String(err)}). Ask the question in plain prose and end your turn.` }],
          details: { asked: false, reason: "error", error: String(err) },
        };
      }
    },
  });
}
