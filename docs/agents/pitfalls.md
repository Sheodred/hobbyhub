# Pitfalls

Traps this repo has actually sprung, each one written down after it cost time
or nearly cost data. Every entry names the failure, not just the rule — a rule
without its failure gets rationalised away at 2am.

These came out of issues #44, #45, #46, #47, #49 and #50.

## Running the PHP test suite

**Always rebuild the container first.** `api/Dockerfile` does `COPY . /var/www/html/api/`
with no bind mount, so the running container holds a *copy* of the source from
build time. Tests and ad-hoc scripts inside it execute stale code.

```bash
docker compose up -d --build php
docker compose exec -T \
  -e DB_HOST=hh-test-db -e DB_NAME=hobbyhub_test \
  -e DB_USER=hobbyhub_test -e DB_PASSWORD=hobbyhub_test \
  php sh -c 'cd api && ./vendor/bin/phpunit'
```

The failure mode is worse than a stale result: an in-container check once
silently validated *pre-edit* code and was briefly mistaken for evidence about
the edit. The cheapest tell that the container is stale is a newly added test
file that simply isn't collected ("No tests executed!").

**Verification is only evidence if the artifact under test is the artifact you
changed.** That applies to results that pass, not just ones that fail.

## Never point the suite at a real database

Several tests `DELETE FROM` the tables they exercise in `setUp()`. Pointing
them at the compose dev database has already destroyed a 180k-row `bgg_ranks`
import once.

`api/tests/bootstrap.php` now enforces this: it refuses to run unless `DB_NAME`
contains `test`, and aborts before the first `setUp()`. Don't weaken that guard
to make a run convenient.

The reason it needs to be enforcement rather than advice is how quietly you can
end up on the wrong database:

- `config.php` resolves `DB_*` through `env_or()`, so **a config file that
  defines the constants first beats the environment**.
- `api/.dockerignore` deliberately excludes `config.local.php` so a locally
  built image can never point at production — but **a bind mount of the source
  tree puts it straight back in**, defeating the exclusion.

Generally: a build-time exclusion (`.dockerignore`, multi-stage copies,
packaging manifests) provides no protection once a volume mounts the excluded
path back in. Read the exclusion list before choosing a mount point, and mount
the narrowest subtree that supports the loop.

## Probe external APIs before building on them

Facts about a third-party service are the fastest-decaying content in any plan,
and **mocked tests cannot detect their decay** — a fully green suite is
compatible with a completely unreachable dependency.

- Make one live call to the service the *first* action of implementation, not a
  step near the end where the plan's narrative order tends to put it.
- Treat cited research about access requirements (free / keyless / no rate
  limit) as provisional whenever it was written in an earlier session.

This is how the Boardgame Lookup work got most of the way built against an API
that had started requiring registration (#40), and everything real ever learned
about EDHREC came from hitting the live API rather than reading docs.

## A bug report's evidence may not exercise the code path

Before writing a failing test from a filed issue, **re-run the issue's evidence
against the exact entry point the code actually calls**.

Issue #42 is the worked example. Its evidence was correct and proved the slug
rule — against EDHREC's `cards/` endpoint. The client calls `combos/`. Both
cards named in the issue return 403 on the real path regardless, because they
are in no combos at all, so a test built on them would have passed whether or
not the bug was fixed. `Márton Stromgald` was chosen instead because it
actually separates broken from fixed.

Evidence in a report proves something about whatever the reporter probed, which
is not automatically what the code calls.

## Determinism beats brevity across a system boundary

Before using a standard-library call, ask whether its output depends on ambient
environment — locale, timezone, encoding defaults, libc version. If it does
**and** the value must match an external system exactly, the "just use stdlib"
shortcut does not hold.

`EdhrecComboClient::slug()` is the worked example. `iconv('UTF-8',
'ASCII//TRANSLIT', …)` produces exactly the right answer in the dev container
and would have looked like the obvious one-liner. Its output is defined by the
host's locale, and production is IONOS shared hosting we don't control: there it
can degrade to `?` per character, producing a 403 that reads as "this card is in
no combos" — reproducing the exact bug it was meant to fix, in production only,
with nothing logged. An explicit map is a few lines longer and identical on
every host.

"Shortest thing that works" is scoped to the machine it was tested on.

## Shell quoting belongs to the tool, not the environment

This environment declares PowerShell as the default shell but also exposes a
POSIX shell tool. Bind the quoting style to **the tool being invoked**, not to
the environment's nominal default — a PowerShell here-string (`@'…'@`) passed
through the POSIX tool puts literal `@` characters into your commit message,
which has already cost two redone commits.

For anything multi-line (commit messages, issue bodies, PR descriptions), write
the text to a file and pass `-F` / `--body-file`. That is quoting-neutral across
both shells and avoids the question entirely.
