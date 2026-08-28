# API-VERIFIED-0.84.3 — Pi Extension API Record

**Status:** VERIFIED against the installed package `@earendil-works/pi-coding-agent@0.84.3`
(`~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent/`).
**Method:** direct read of shipped type definitions (`dist/core/extensions/types.d.ts`, `loader.d.ts`, `index.d.ts`, `wrapper.d.ts`, `dist/core/system-prompt.d.ts`, `dist/core/tools/index.d.ts`) and shipped documentation (`docs/extensions.md`, `docs/skills.md`).
**Law:** every extension in this repository imports only API elements recorded here. Anything the canon describes that this version does not provide is logged in §7 with a fallback design — never silently substituted, never fabricated.

---

## 1. Extension loading

- Extensions are TypeScript modules loaded via **jiti** — no compile step. The default export is a factory `(pi: ExtensionAPI) => void | Promise<void>`; async factories are awaited before `session_start`, before `resources_discover`, and before queued provider registrations flush.
- Auto-discovery locations (both `*.ts` files and `*/index.ts` subdirectories):
  - Global: `~/.pi/agent/extensions/`
  - Project-local: `.pi/extensions/` — **loaded only after the project is trusted**
- Additional paths via `settings.json` keys `packages` (npm/git pins) and `extensions` (absolute paths). `pi -e ./path.ts` for isolated development; auto-discovered extensions hot-reload via `/reload`.
- npm dependencies work: place `package.json` next to the extension, `npm install`, imports resolve. Distributed packages use production installs — runtime deps must be in `dependencies`.
- Importable packages: `@earendil-works/pi-coding-agent` (types), `typebox` (tool schemas), `@earendil-works/pi-ai`, `@earendil-works/pi-tui`. Node built-ins available.
- **Resource discipline:** factories may run without a session ever starting. No background processes/sockets/watchers/timers in the factory body — defer to `session_start`, clean up in an idempotent `session_shutdown` handler.

## 2. Event map (verified names)

`project_trust` · `resources_discover` · `session_start` · `session_info_changed` · `session_before_switch` (cancellable) · `session_before_fork` (cancellable) · `session_before_compact` (cancellable / custom compaction) · `session_compact` · `session_compact_failed` · `session_shutdown` · `session_before_tree` (cancellable) · `session_tree` · `context` (mutate message list pre-LLM-call) · `before_provider_request` (replace payload) · `before_provider_headers` (mutate headers in place; `null` deletes) · `after_provider_response` · `before_agent_start` (inject message / replace system prompt) · `agent_start` · `agent_end` · `agent_settled` · `turn_start` · `turn_end` · `message_start` · `message_update` · `message_end` (can replace finalized message, same role) · `tool_execution_start` · `tool_execution_update` · `tool_execution_end` · `model_select` · `thinking_level_select` · `tool_call` (**can block**) · `tool_result` (**can modify**) · `user_bash` (**can intercept**) · `input` (continue / transform / handled).

Handler signature: `(event, ctx: ExtensionContext) => Promise<R | void> | R | void`.

### Lifecycle order (verified)

Startup: `project_trust` → `session_start{startup}` → `resources_discover{startup}`.
Per prompt: extension commands → `input` → skill/template expansion → `before_agent_start` → `agent_start` → per turn: `turn_start` → `context` → `before_provider_headers` → `before_provider_request` → LLM responds → per tool: `tool_execution_start` → **`tool_call` (can block)** → `tool_execution_update` → **`tool_result` (can modify)** → `tool_execution_end` → `turn_end` → `agent_end` → `agent_settled`.

## 3. Blocking and interception semantics (the guards' foundation)

```ts
interface ToolCallEventResult {
  block?: boolean;      // block tool execution
  reason?: string;      // shown to agent/user
  terminate?: boolean;  // hint: stop after current tool batch (only when ALL finalized results in batch set it)
}
```

- `event.input` is **mutable**; mutations affect real execution; later handlers see earlier mutations; **no re-validation after mutation** (guards must validate what they mutate).
- Typed narrowing: `isToolCallEventType("bash", event)` — built-ins narrow without type params; direct `event.toolName === "bash"` does NOT narrow (CustomToolCallEvent overlap).
- Parallel mode: sibling tool calls preflight sequentially, execute concurrently; `tool_call` handlers cannot rely on sibling results from the same assistant message.
- `tool_result` handlers chain as middleware in load order; partial patches (`content`, `details`, `isError`, `usage`); omitted fields unchanged.
- `user_bash`: return `{ operations }` (custom/wrapped exec) or `{ result }` (full replacement).
- `input`: `{action:"continue"}` / `{action:"transform", text, images?}` / `{action:"handled"}` (first `handled` wins; transforms chain).

### Verified tool input shapes (from docs + typed events)

| Tool | `event.input` |
|---|---|
| bash | `{ command: string; timeout?: number }` |
| read | `{ path: string; offset?: number; limit?: number }` |
| write / edit / grep / find / ls / powershell | typed `*ToolInput` exports in `dist/core/tools/index.d.ts` (read field names from the per-tool `.d.ts` when implementing WP2) |

`ToolName = "read" | "bash" | "powershell" | "edit" | "write" | "grep" | "find" | "ls"`; `allToolNames` set exported. Tool factories exported per tool (`createReadTool`, `createBashTool`, …) plus `createCodingTools` and **`createReadOnlyTools(cwd, options)`** — a native read-only toolset constructor (Scout/Reviewer loadouts can be constructed, not just filtered).

## 4. System-prompt planes (WP3 foundation)

```ts
interface BuildSystemPromptOptions {
  customPrompt?: string;             // full replace — the "SYSTEM.md" plane
  selectedTools?: string[];          // default: [read, bash, edit, write]
  toolSnippets?: Record<string, string>;
  promptGuidelines?: string[];
  appendSystemPrompt?: string;       // additive plane — standard projection target
  cwd: string;
  contextFiles?: Array<{ path: string; content: string }>;  // AGENTS.md etc.
  skills?: Skill[];
}
```

- `before_agent_start` event carries `prompt`, `images?`, `systemPrompt` (chained current value), `systemPromptOptions` (structured). Handler may return `{ message?, systemPrompt? }`; `systemPrompt` replacements **chain across extensions**. `ctx.getSystemPrompt()` reports Pi's prompt string (not the final provider payload — payload-level rewrites via `before_provider_request` are invisible to it).
- Default tool set is exactly four (read, bash, edit, write) — confirms "Pi ships no roles"; role loadouts are ours to build (via `pi.setActiveTools` / profiles / tool factories).

## 5. Skills (WP6 foundation) — VERIFIED NATIVE `.agents/` SUPPORT

Pi implements the **Agent Skills standard** (agentskills.io), lenient with warnings.

- **Discovery locations:** global `~/.pi/agent/skills/` and `~/.agents/skills/`; project `.pi/skills/` and **`.agents/skills/` in cwd and ancestors up to git root** (post-trust only); packages; `settings.json` `skills` array; `--skill <path>`.
- Directory skills: `SKILL.md` folders discovered recursively everywhere. Root-level `.md` files: discovered as individual skills in `~/.pi/agent/skills/` and `.pi/skills/`; **ignored** at `.agents/skills/` root (nested `.md` in grouping folders discovered if they carry frontmatter).
- **Frontmatter:** `name` (required; ≤64 chars; `a-z0-9-`, no edge/consecutive hyphens; Pi does NOT require name == directory), `description` (required; ≤1024 chars — the trigger pointer), `license`, `compatibility`, `metadata` (arbitrary map), `allowed-tools` (experimental), `disable-model-invocation` (hide from system prompt; user invokes via `/skill:name`).
- Progressive disclosure is native: only name+description live in the system prompt (XML catalog); body loads on demand via `read` or forced via `/skill:name`.
- `enableSkillCommands` setting toggles `/skill:name` commands. Name collisions: first found wins, warning emitted.
- **Divergence + mapping for canon E.6:** canon frontmatter keys `trigger_phrases` and `invocation` are not Pi-native. Mapping: `invocation: user` → `disable-model-invocation: true`; `invocation: model` → default (omitted); `trigger_phrases: [...]` → `metadata: { trigger_phrases: [...] }`. Canon's no-XML-angle-brackets rule still binds (Pi's catalog injection is XML — keep frontmatter clean of `<`/`>`).
- Our `templates/agents/skills/` therefore needs no discovery wiring — only correct structure and frontmatter.

## 6. ExtensionAPI surface (verified methods)

`pi.on(event, handler)` (typed per event) · `pi.registerTool(ToolDefinition)` (TypeBox `parameters`; `execute(toolCallId, params, signal, onUpdate, ctx)`; optional `promptSnippet`, `promptGuidelines`, `executionMode`, custom renderers) · `defineTool` (preserve param inference) · `pi.registerCommand(name, {description?, getArgumentCompletions?, handler(args, ctx: ExtensionCommandContext)})` · `pi.registerShortcut` · `pi.registerFlag` / `pi.getFlag` · `pi.registerMessageRenderer` / `registerEntryRenderer` / `registerMarkdownTransformer` · `pi.sendMessage` / `sendUserMessage` · **`pi.appendEntry(customType, data)` — session-persistent custom entries, NOT sent to LLM** (ledger substrate) · `pi.setSessionName` / `getSessionName` / `setLabel` · `pi.exec(command, args, options)` · **`pi.getActiveTools()` / `pi.setActiveTools(names)` / `getAllTools()`** (mechanical role loadouts) · `pi.getCommands()` · `pi.setModel` / `getThinkingLevel` / `setThinkingLevel` · `pi.registerProvider` / `unregisterProvider` · `pi.events: EventBus` (inter-extension bus).

`ExtensionContext`: `ui` (select/confirm/input/notify/setStatus/setWidget/editor/custom…), `mode` ("tui"|"rpc"|"json"|"print"), `hasUI`, `cwd` (use `CONFIG_DIR_NAME` constant, never hardcode `.pi`), `sessionManager` (read-only), `modelRegistry`, `model`, `scopedModels`, `thinkingLevel`, `isIdle()`, **`isProjectTrusted()`**, `signal`, `abort()`, `shutdown()`, `getContextUsage()`, `compact()`, `getSystemPrompt()`.

## 7. Divergence log (canon vs 0.84.3)

| # | Canon says | 0.84.3 reality | Resolution |
|---|---|---|---|
| D1 | "a throwing `tool_call` handler blocks the tool" (§2.3/§3.2 fail-closed semantics) | Blocking is a **return value**: `{ block: true, reason, terminate? }` | Guards return `block:true`; additionally wrap handler bodies in try/catch that returns `block:true` on any guard-internal error — restoring true fail-closed semantics |
| D2 | Canon E.6 skill frontmatter: `trigger_phrases`, `invocation` | Pi frontmatter: `name`, `description`, `metadata`, `disable-model-invocation`, … | Mapping per §5: `invocation:user` → `disable-model-invocation:true`; `trigger_phrases` → `metadata.trigger_phrases` |
| D3 | Canon implies `.agents/` is harness-agnostic custom layout needing wiring | Pi discovers `.agents/skills/` natively (global + project) | No wiring needed; canon layout adopted as-is |
| D4 | Canon §2.4: `before_agent_start` "injects manifold pointers into each turn" | Event fires **once per user prompt** (before agent loop), not per turn; per-LLM-call hook is `context` | WP3 design: `before_agent_start` for systemPrompt/injected message; `context` event if per-call refresh is needed (watch context budget) |
| D5 | `last_verified` as date (initial inert templates) | Canon §1.3 specifies **commit SHA** | WP4 templates stamp HEAD SHA |

## 8. Verified reference implementations (shipped `examples/extensions/`)

Build WP1/WP2 against these working examples: `confirm-destructive.ts`, `permission-gate.ts`, `protected-paths.ts`, `bash-spawn-hook.ts`, `git-checkpoint.ts` (shadow snapshots), `dirty-repo-guard.ts`, `doom-overlay` (doom-loop detection), `subagent/`, `plan-mode/`, `handoff.ts`, `tool-override.ts`, `dynamic-tools.ts`, `questionnaire.ts` / `qna.ts` (ask-user patterns), `kimi-deferred-tools.ts`, `sandbox/`, `gondolin/`. Also `docs/`: `extensions.md`, `skills.md`, `settings.md`, `security.md`, `packages.md`, `compaction.md`, `session-format.md`.

## 9. WP0 acceptance

- [x] API surface extracted from installed 0.84.3, not documentation about other versions
- [x] Blocking semantics verified (D1)
- [x] Skills discovery + frontmatter verified (D2, D3)
- [x] System-prompt planes verified (§4)
- [x] Divergences logged with resolutions (§7)
- [x] Reference implementations enumerated (§8)

**WP0 CLOSED. WP1 (baseline extension set) is UNBLOCKED.**
