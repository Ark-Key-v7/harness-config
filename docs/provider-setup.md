# Provider Setup

## Active path: Kimi OAuth

Kimi OAuth is the initial provider path. OAuth tokens and session state must
remain outside this repository.

After Pi is installed:

1. Inspect the available Kimi provider paths.
2. Prefer Pi-native Kimi support if present.
3. Otherwise test upstream `pi-provider-kimi-code`.
4. Use `@zgltyq/pi-provider-kimi-code` only if the upstream path fails the
   OAuth/bearer validation.
5. Record the selected provider, exact version, model IDs, and validation time
   in `rig.manifest.yaml`.

## Future: Claude API

Store `ANTHROPIC_API_KEY` outside Git. Configure the provider only after the
available Claude models are listed from the installed provider path.

## Future: OpenRouter

Store `OPENROUTER_API_KEY` outside Git. Pin the selected model explicitly and
validate tool calling separately from plain text completion.

## Future: Helicone

Use Helicone only if centralized provider observability, cost attribution, or
gateway policy is required. Review prompt/code data exposure before routing any
traffic through it.
