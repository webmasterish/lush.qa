# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This repository (`lush.qa`) is the versioned code + docs for DotAim LLC's project migrating **Lush Qatar** (`lush.qa`, Al Mana Fashion Group) from WooCommerce/WordPress to Shopify. It holds migration tooling, Shopify theme customizations (as done previously for the Saudi and Lebanese sites), and curated project docs.

Run Claude Code from this `repo/` directory — that's the git repo root and where `.claude/CLAUDE.md` loads.

## Working directory vs. the private parent

The git repo is `repo/`. Its **parent directory** (one level up, `../`) is Bassam's private, un-versioned working area and is **not** part of this repo. It contains material that must never be committed:

- `../lush.qa_notes.md` — Bassam's **personal chronological journal**. Read it for context, but **NEVER edit, reformat, or write to it.** Leave it exactly as-is.
- `../invoices/`, `../meetings/`, `../proposals/`, `../notes/`, `../analysis/`, `../shopify/` — invoices, call recordings, proposals, raw notes, screenshots. Private; keep out of the repo.

## Start here

**`docs/lush-migration-project-context.md` is the canonical source of truth** for full project state — stakeholders, commercial terms, access status, data scope, migration phases, constraints. Read it first before acting.

Companion docs in `docs/`:
- `data-mapping.md` — WooCommerce → Shopify field mapping; the spec the migration scripts implement.
- `migration-runbook.md` — the phased plan + per-entity checklist + QA steps; a living doc updated as work proceeds.
- `migration-tool-prd.md` + `migration-tool-plan.md` — requirements and milestone build plan for the in-house migration tool (Node.js, reusable across projects); written to be executed as-is.
- `theme-phase.md` — **read before touching the theme.** The three surfaces (theme code / theme editor / store settings), which is the source of truth for each, environments, the rules that keep them from clobbering each other, and the T0–T6 milestones.
- `store-settings-ledger.md` — living record of admin configuration, which has no file representation anywhere else.

## Layout

```
repo/
├── .claude/CLAUDE.md
├── docs/                              project context + specs (above)
├── shopify/
│   ├── migration_from_woocommerce/    migration scripts (+ .env.example)
│   └── themes/
│       ├── theme.sh                   theme workflow wrapper — use it, not raw `shopify theme`
│       ├── be-yours/                  the Qatar theme (+ shopify.theme.toml environments)
│       └── __reference/               gitignored local snapshots (KSA theme, vanilla Be Yours)
├── .gitignore
└── README.md
```

Secrets live in gitignored `.env` files (see the `.env.example` beside each): `shopify/migration_from_woocommerce/` for migration credentials, `shopify/themes/` for Theme Access passwords. Never in tracked files.

## Key facts that cut across the docs

- **Two parties:** DotAim LLC (Bassam Mardini, Lebanon) is the vendor; the client is Al Mana Fashion Group's Lush Qatar franchise. Primary contact is **Dee** (Brand Manager); **Mario** (GM) approves; IT (**Sibin**, **Nirmal**) handle access/DNS.
- **This migration is done in-house** — unlike the earlier KSA/Lebanon migrations, which used the paid third-party tool LitExtension. This is why direct WooCommerce admin + server SSH/FTP access are required.
- **Reference stores** (DotAim-built, live): Lush KSA `lush.sa.com`, Lush Lebanon `lushlebanon.com`. The client wants Qatar to **mirror the KSA store**. Do not publicly name specific franchisees as "in discussions" — those relationships are confidential.
- **Commercial terms are firm:** $2,700 total, **50/25/25** payment schedule (Stage 1 paid). Never imply full upfront payment. Third-party costs (Shopify plan, Be Yours theme, apps) are billed **directly to the client via Shopify**, not through DotAim.
- **Never commit credentials.** Client PII and commercial terms appear in `docs/` — acceptable in this private repo, but never add passwords, API tokens, or keys to tracked files.

## Client-facing conventions (from the context docs — follow these)

- Tone: warm but professional, concise.
- **No em-dashes** in client-facing documents.
- Emojis are fine on WhatsApp with Dee; **not** in formal emails.
- Channel discipline: **WhatsApp** for fast coordination, **email** for formal proposals/invoices/access requests (keeps an audit trail), Google Meet for calls.
- **Client-facing output is always proposed, never sent.** Default-to-action applies to code and tooling, not to the client relationship. Anything that reaches Dee, Mario, or IT — emails, WhatsApp messages, calendar invites, shared Drive files, and edits to client-facing deliverables in `docs/` — is drafted for Bassam's review and sent only on his explicit go-ahead. Draft in Gmail, don't send; propose Drive/doc changes, don't publish.

## Integrations

- **Gmail** / **Google Calendar** — client communications and scheduling.
- **Google Drive** — proposals, invoices, project documents.
- **context7** — fetch current Shopify/library docs; prefer it over memory for API/CLI/config details.
- **Shopify** — relevant skills from the Shopify AI Toolkit (`github.com/Shopify/Shopify-AI-Toolkit`) are **vendored into `.claude/skills/` with telemetry stripped** (see `.claude/skills/README.md`). `shopify-onboarding-merchant` is the path for connecting the store and importing WooCommerce data; `shopify-use-shopify-cli` drives the CLI. Add `shopify-admin` and `shopify-liquid` (same telemetry-stripping treatment) at the data-migration and theme phases.
- Analytics will be **Google Analytics**, added later when needed. (Matomo is not used on this project.)

---

# Behavioral & Agentic Guidelines

Everything above this line is project-specific and takes precedence over the general rules below.

- **Assume your knowledge is stale.** Your internal understanding of any dependency — library, framework, CLI, API — is outdated. ALWAYS fetch current docs via `context7` before writing code against one. Fall back to web search/fetch only if context7 does not cover it.
- **Ground long-document work in quotes.** When summarizing or reasoning over a long doc (`lush-migration-project-context.md`, the PRD, the runbook), pull direct quotes before drawing conclusions rather than paraphrasing from memory.
- **Match documents to substance.** This repo's output is largely docs. Cover what is needed without filler sections, restated summaries, or boilerplate scaffolding. A short doc that says the thing beats a structured one that circles it.
- **Never alter existing tests to make them pass** without asking first.
- **Flag disagreement inline, then proceed.** If the request seems mistaken or a better approach exists, say so in one sentence prefixed with `💡 [SUGGESTION]` and continue with the task as asked.
- **Damp subagent use.** Delegate only for genuinely parallel, wide investigations. Never delegate what you can finish in a handful of tool calls, and never use a subagent to check your own work.
- **Confirm before destructive or shared-effect commands**: `rm -rf` and DB drops; `git push --force`, `git reset --hard`, rewriting published history, `--no-verify`; and any call that mutates shared infrastructure or external services. Editing files, linting, and running tests need no approval.
- **Clean up scratchpad scripts and temp test files** once the task they served is done.
