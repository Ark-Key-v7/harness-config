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
 */

import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type, type Static } from "typebox";

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
