# kkb

Double-entry bookkeeping app for personal use. Single user, running in production
on GCP. A Go GraphQL API and a Next.js frontend ship as two containers in one
Cloud Run service.

Infrastructure lives in a separate private repository. This one holds the
application only.

## Before you call work done

```
task check      # everything (~35s)
task go:check   # build, lint, test, generate
task ts:check   # typecheck, lint, test, generate, build
```

**`task check` passing is the definition of done.** Nothing is complete while it
fails. It needs no Docker and no network, so it runs anywhere the repo does,
including a worktree or a fresh clone. Keep it that way: tests that require a
database or a browser do not belong in it.

If you cannot make it pass, say so plainly and report what fails. Never describe
work as finished with a red check.

## Ask before doing these

**Starting Docker.** Some verification needs a real database (`task start:all`).
Ask first and wait for an answer.

**Generating a migration** (`task db:schema:diff`, `task db:schema:create`).
Atlas records a checksum in `db/migrations/atlas.sum`, so two migrations
generated in parallel always conflict, and their order is decided by whoever
merges last. These are serialized on purpose: only generate one when explicitly
asked to.

If nobody can answer (a headless or scheduled run), do not proceed on your own.
Finish everything that works without them, then report exactly what was left
undone and why. A run that hangs waiting on containers is worse than one that
stops early and says so.

## Do not touch infrastructure or CI/CD

Out of scope for changes here:

- `.github/`: workflows and actions
- `containers/`: Dockerfiles
- the separate infrastructure repository

Deploying and applying infrastructure need credentials and human judgement. If a
change seems to require one of these, describe what is needed and stop.

## Commits and branches

Conventional Commits, scoped by area: `feat(ts): ...`, `fix(go): ...`,
`chore(deps): ...`. A clear subject line is enough. Explaining *why* in the body
is welcome but not required.

`main` is deliberately unprotected. Working directly on it is normal, and so is
branching when work runs in parallel. Never rewrite history that is already
pushed.

Because there is no merge-time gate, the deploy workflow re-runs every check when
a tag is pushed.

## Documentation

`README.md` is canonical; `README.ja.md` is its Japanese translation. Both carry
the same sections:

- **Motivation**: why the project exists
- **Architecture**: the runtime topology and how the pieces connect
- **Design**: what each part of the design is, and the reasoning that led to it,
  including the options that were turned down
- **History**: how the project got here
- **Local development**: how to run it
- **References**

Update them when a change makes them wrong: a new component, a changed topology,
a different local setup. **Keep the two files in step**: editing one without the
other is worse than editing neither.

The reasoning behind past decisions is not kept in this repository beyond the
Design section.
