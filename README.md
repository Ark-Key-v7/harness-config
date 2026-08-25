# Local Factory Rig Harness Config

This repository is the version-controlled source of truth for the user-level
Pi agent harness.

## Paths

- Authoring working copy: `~/factory-rig/sources/harness-config`
- Active Pi clone: `~/.pi/agent`

## Change rule

Do not edit `~/.pi/agent` directly.

Make changes in the authoring working copy, review and commit them, push them
to the private remote, pull them into the active clone, and then run the
validation gates.

## Secret rule

Never commit OAuth tokens, API keys, session files, `.env` files, trace ledgers,
provider caches, or generated credentials. Runtime secrets belong outside this
repository, normally under `~/.pi/secrets/` with mode `0700`.

## Governing-layer rule

Agents may propose changes to this repository, but they may not autonomously
mutate `.tmd/`, `AGENTS.md`, profiles, skills, hooks, extension source, or any
other governing-layer file.
