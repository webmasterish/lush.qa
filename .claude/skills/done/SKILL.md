---
name: done
description: End-of-session wrap-up for the lush.qa repo. Use when the user signals the session is finished — "/done", "we're done", "let's wrap this", "that's it", "wrap up", or anything similar (judge by intent, not exact words). Persists memory + project docs, runs safety checks, commits only this session's files, pushes to GitHub, then writes and displays a session file in `__/sessions/`. Flags: no-commit / no-push / no-session / just-docs.
---

# End the session (`/done`)

One pass that closes a working session: persist what's durable, ship what's ready,
and leave the user a file they can read later or hand to the next session.

Runs **in order**. Each step reports what it did in one line; the detail goes in the
session file, not the chat.

**`/done` never touches the live store and never contacts the client.** `lush.qa` has
been live since the DNS cutover on 2026-08-27. Theme pushes, migration-tool runs, Admin
API writes and store-settings changes all happen during a session, deliberately, with the
user watching. A wrap-up is not the moment to discover you have published something.
Likewise, `.claude/CLAUDE.md` is absolute that client-facing output is **proposed, never
sent**: `/done` drafts and records, it does not email Dee, Mario or IT.

### The only thing `/done` may send anywhere

**`git push` to GitHub. That is the entire remote surface.**

Everything else it does is local: reading files, writing files, `git` operations up to the
push. Specifically it does **not**, under any flag or circumstance:

- push, pull or publish a theme (`shopify theme push/publish`, `theme.sh`, the theme editor)
- change any Shopify setting, product, price, translation, redirect or metafield
- call the Admin or Storefront API to write anything, or run a bulk operation
- run the migration tool against any store
- send or draft anything in Gmail, create or edit a Google Drive file, or touch Google
  Calendar
- send a WhatsApp message, or anything else that reaches Dee, Mario, Sibin or Nirmal
- touch DNS or Cloudflare

Read-only lookups are fine when they make a doc or session-file entry accurate. Anything
that *changes* remote state belongs in the session file's "needs doing elsewhere" section
as a copy-pasteable command, for the user to run deliberately.

---

## 0. Parse the flags — by INTENT, not exact spelling

Everything after `/done` is freeform. Match on meaning:

| Intent | Recognise (any of) | Effect |
|---|---|---|
| skip commit | `no commit`, `no-commit`, `nocommit`, `skip commit`, `don't commit`, `without committing` | No commit. Implies no GitHub push (nothing to push). |
| skip GitHub push | `no push`, `no-push`, `don't push`, `local only` | Commit, but don't `git push`. |
| skip session file | `no session`, `no-session`, `no file` | Skip steps 6-7. |
| persist only | bare `docs` / `notes` (when that word **is** the whole argument), plus `just docs`, `just-docs`, `docs only`, `docs-only`, `only docs`, `just notes`, `notes only`, `just save`, `just memory`, `no code` — and the same shapes with docs/notes swapped | Shorthand for **no-commit + no-push**. Runs steps 1-3 and 6-7 only: memory + project docs get written, nothing is committed or pushed. The session file records the changes as **not committed — `just-docs` run**, so the next session knows they're sitting uncommitted. |

Anything else in the argument is treated as a **note from the user** and goes into the
session file's summary (e.g. `/done no-push waiting on Dee to confirm the SKU fix`).

**The one genuine ambiguity is a bare `docs` / `notes`** — it reads as the persist-only
flag, but `/done docs need a rewrite next time` is plainly a note. Rule: treat it as the
flag only when the word stands alone (or with a filler like "just"/"only"); if it opens a
sentence, it's a note. When it could honestly be either, **ask** — one question beats an
unwanted commit or a silently skipped one.

Ambiguous or unrecognised wording → ask, don't guess.

## 1. Guard — is anything still in flight?

Before touching anything: if a background task, subagent, or long-running command is
still going, **stop and say so**. Don't wrap a session whose work hasn't landed.

This repo's specific cases:

- **Migration-tool runs.** An order import took roughly 11 hours on the dev store. A
  session file that says "orders imported" when the run is at 60% is worse than no
  session file. The tool is locked against the live store (`target.locked`), but a run
  against anything else can still be mid-flight.
- **Theme pushes and `shopify theme` commands** via `shopify/themes/theme.sh`.
- **Long Admin API loops** — bulk operations, catalogue scans, translation passes.

If something is mid-flight, either wait, or wrap with the session file explicitly
recording **what was still running and how to check on it**.

## 2. Persist — memory, then project docs

1. **Memory**
   (`~/.claude/projects/-media-data2-www-localhost-subs-lush-httpdocs-lush-qa-repo/memory/`)
   — add or update memories for anything **durable and non-obvious** that surfaced: user
   preferences and working-style feedback (with the *why*), project state, decisions,
   constraints not derivable from the code or git history, useful external references.
   Update an existing memory rather than duplicating; keep the `MEMORY.md` index line in
   sync.
   **Skip** anything the repo already records (code structure, past fixes, git history,
   CLAUDE.md) or that only mattered to this conversation.
2. **Project docs** — this repo's output is largely docs, and they outlast the chat.
   Route by subject:
   - `docs/lush-migration-project-context.md` — the canonical state: stakeholders,
     commercial terms, access, scope, phases, constraints. Update when any of those move.
   - `docs/store-settings-ledger.md` — **admin configuration has no file representation
     anywhere else.** Anything changed or discovered in Shopify settings belongs here or
     it is lost. Live-store incidents go in its Incidents section.
   - `docs/theme-phase.md` — theme surfaces, environments, T0-T6 milestones.
   - `docs/migration-runbook.md` — the living phased plan and QA steps.
   - `docs/handover-and-launch-plan.md` — launch sequence and close-out revocations.
   - `docs/client-data-quality-notes.md` — **source-data** defects for Dee. Post-launch
     store-config problems are not source-data problems; those go in the ledger.
   - `docs/data-mapping.md`, `migration-tool-prd.md`, `migration-tool-plan.md` — the
     specs. Update when the tool's behaviour or contract changed.
   - `.claude/CLAUDE.md` — only conventions and standing rules. If reality was found to
     contradict CLAUDE.md, **fix CLAUDE.md** rather than leaving the contradiction.

   Client-facing docs (`docs/client-email-*-draft.md`, `docs/client-report-*-draft.md`)
   follow the house rules: warm but professional, concise, and **no em-dashes**.

**Never write to the private parent.** `../lush.qa_notes.md` is Bassam's personal journal
and is read-only, always. Nothing from `../invoices/`, `../meetings/`, `../proposals/`,
`../notes/`, `../analysis/` or `../shopify/` gets copied into the repo.

Quality over volume. A wrong or noisy memory is worse than none — if it's genuinely
borderline, ask instead of guessing.

Do this **first**: it creates files that step 4 must commit.

## 3. Pre-flight checks

Only on files this session changed.

1. **Credential scan — the one that matters most, and nothing else is watching.**
   This repo has **no `pre-commit` hook**; the scan is entirely on you. Read every
   changed file for anything that reads as a live secret:
   - Shopify Admin API tokens (`shpca_`, `shpat_`, `shpss_`), Theme Access passwords
     (`shptka_`), client IDs and secrets
   - WooCommerce REST keys (`ck_`, `cs_`) and any database password
   - private keys, connection strings with auth embedded
   **Anything found blocks the commit — stop and tell the user.**
   Client PII and commercial terms are expected in `docs/` and are fine in this private
   repo. Credential *values* never are.
2. **No `.env` staged.** `.env` and `*.env` are gitignored, but check nothing slipped
   through with `git add -f`. The real credentials live in
   `shopify/migration_from_woocommerce/migration-tool/config/projects/lush-qatar.env`
   and `shopify/themes/.env`.
3. **No `__*` paths staged** — local-only by convention and gitignored. Also confirm no
   `shopify/themes/__reference/` snapshot (the KSA and vanilla Be Yours theme copies)
   has been added.
4. **Syntax check what changed**, by extension:
   - `.js` → `node --check`
   - `.py` → `python3 -m py_compile`
   - `.sh` → `bash -n`
   - `.json` → parse it. A malformed theme settings or template JSON is not obvious by
     eye and breaks the theme on push.
   Liquid has no cheap local check; if `.liquid` changed and the theme is going to be
   pushed later, note it in the session file rather than pushing here.
5. **Migration-tool changes** — if anything under `migration-tool/src/` changed, read
   `config/projects/lush-qatar.json` and confirm the target and `target.locked` are still
   what the user intended. **This is a file read. Do not run the tool and do not call the
   store to verify.** Not a hard gate; flag it if it moved.

## 4. Commit — only this session's files

**Hard rule: stage by explicit path. Never `git add -A`, `git add .`, or `git commit -a`.**

The user often has more than one session open. Committing a foreign session's
work-in-progress is the failure mode this step exists to prevent.

1. `git status --short` and compare against the files **this session actually edited**.
2. Stage only this session's paths.
3. Any *other* dirty file: leave it alone and **list it in the reply** as
   "left alone (not this session's)". Don't ask about it, just report it.
4. If a file this session touched contains changes you don't recognise, **stop and ask**
   — that's the concurrent-edit case and it can't be resolved by guessing.
5. Commit on `main` (no branches, no PRs), using conventional-commit style:
   `type(scope): imperative summary`, e.g.
   `docs(store-settings): record the 2026-08-30 delivery-charge incident`.
   Useful scopes here: `docs`, `store-settings`, `theme`, `policies`, `nav`, `redirects`,
   `translations`, `migration-tool`, `data-mapping`, `skills`. Body only when the *why*
   isn't obvious from the summary. Keep the `Co-Authored-By` trailer.
6. Separate concerns → separate commits. Don't force one commit over unrelated work.
7. Nothing to commit → say so and move on. Not an error.

**Residual risk, stated honestly:** if another session edited a file *this* session also
edited, its changes ride along in the commit. There is no way to detect that from the
working tree. Flag anything that looks off rather than committing silently.

## 5. Push

- `git push` to `origin` (branch `main`,
  `git@webmasterish.github.com:webmasterish/lush.qa.git`). Report the result.
- **Pushing to GitHub is not deploying.** Nothing here reaches the store by being
  committed. If the session's work needs to be applied — a theme push, a settings change
  in the admin, a tool run — put the exact command or the admin path in the session
  file's "needs doing" section instead of running it here.

## 6. Write the session file

Path: `__/sessions/session_YYYY-MM-DD.md` — same day already exists → `_2`, `_3`, …

Session files **always** live in the repo-root `__/sessions/`, regardless of what the
session touched: they span the whole repo, so they are never "nearest to the work". The
nearest-relevant rule governs working scratch, not these. Topic-specific scratch goes in the nearest
relevant `__/YYYY-MM-DD/` (for store and theme work that is `shopify/__/<date>/`). `__*`
is gitignored; these files are the user's, not the repo's.

Write it **after** the commit so it can record the sha. Aim for 50-90 lines. It should be
readable cold, weeks later, by someone who wasn't here.

```markdown
# Session — YYYY-MM-DD[ _N]

**Focus:** one line — what this session was about.

## What was done
- Short bullets. Outcomes, not narration.

## Decisions
- The call, and the *why*. This is the part worth re-reading in a month.
- Include rejected options where the rejection is the useful bit.

## Live store touched
- What was read, and what was written. Say plainly if anything was changed on
  `lush-qatar.myshopify.com`, and whether it is visible to customers.
- Omit this section entirely if the store was read-only or untouched.

## Client comms
- Drafted and awaiting Bassam's go-ahead / sent by Bassam / nothing this session.
- Never record something as sent unless the user said they sent it.

## Changes
- `path/to/file.md` — what changed, one clause.
- **Commit:** `<sha>` `type(scope): summary`  (or "not committed — <reason>")
- **Pushed:** yes / no / FAILED — <error>

## Open / deferred
- What's unfinished, and why it was left. Include anything left with the client.

## Needs doing elsewhere
- Shopify admin steps, theme pushes, Cloudflare or DNS work, anything waiting on Dee,
  Mario, Sibin or Nirmal. Exact commands in a code block, copy-pasteable.

## Launch and handover watch
- Store password still on? Which close-out revocations from
  `docs/handover-and-launch-plan.md` are still pending, and why each is still needed.
- Payment stage: 50/25/25, and which stages are invoiced and paid.
- Drop this section once handover is complete.

## Saved to memory / docs
- `memory/<file>.md` — one line on what it records.
- `docs/<file>.md` — section updated.

## Pick up from here

​```
<A ready-to-paste prompt for the next session: the goal, where things stand,
the files that matter, and the first concrete step. Written as an instruction
to Claude, not a description of the past.>
​```
```

Omit any section that would be empty — an empty "Open / deferred" is noise.
**No markdown blockquotes** anywhere (the `▎` gutter breaks copy-paste); copyable content
goes in code blocks.

## 7. Display it

Print the session file's content in the reply so the user can read it without opening
the file. Then a short closing line: path, commit sha, push status.

Keep the chat reply itself to a few lines beyond the file — the file *is* the summary.

---

## Notes

- `/done` is a standing instruction to push to GitHub. It authorises **nothing** against
  the live store and **nothing** toward the client. Both of those rules come from
  `.claude/CLAUDE.md` and a wrap-up does not relax them.
- It's fine to run mid-session as a checkpoint. It does **not** replace saving an
  important fact the moment it appears.
- The sections that earn their keep on this project are **needs doing elsewhere** and
  **launch and handover watch**: much of what remains can only be done by Dee, by IT, or
  by Bassam in the Shopify admin, and those items are the easiest to lose between
  sessions.
