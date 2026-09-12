# CONSTRAINTS — [Project Name]

> The written quality bar for this repository. Every number here is a floor:
> it may be raised at any time, and lowered only by operator decision recorded
> in this file's change log. Seeded by project-onboard; enforced by the gate.

## The Floor (never crosses, no exceptions)

- No new suppression comments (`@ts-ignore`, `eslint-disable`, `# noqa`) without a dated reason and expiry.
- No unimplemented stubs (`TODO` bodies, `throw new Error("not implemented")`) in merged code.
- No skipped or deleted tests without a recorded reason.
- No secrets in the repo, ever.
- This file is never edited to make a failing check pass.

## Bars (raise only, except by recorded operator decision)

| Dimension | Floor value | How measured |
|---|---|---|
| Coverage on changed lines | ≥ 80% | repo's coverage tool on the diff |
| LCP (web apps) | ≤ 2500ms (Lab, Lighthouse) | webperf-audit Deep mode |
| CLS (web apps) | ≤ 0.1 | webperf-audit Deep mode |
| Exceptions to any floor rule | expire ≤ 90 days, listed below | this file |

## Exceptions

| Exception | Reason | Granted | Expires |
|---|---|---|---|
| (none) | | | |

## Change Log

| Date | Change | Raised/Lowered | By |
|---|---|---|---|
| [seed date] | Seeded from rig template | — | operator |
