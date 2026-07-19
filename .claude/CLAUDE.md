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

## Layout

```
repo/
├── .claude/CLAUDE.md
├── docs/                              project context + specs (above)
├── shopify/
│   ├── migration_from_woocommerce/    migration scripts (+ .env.example)
│   └── themes/be-yours/               Shopify theme customizations — added when the theme phase starts
├── .gitignore
└── README.md
```

Secrets live in a gitignored `.env` inside `shopify/migration_from_woocommerce/` (see `.env.example`), never in tracked files.

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

## Integrations

- **Gmail** / **Google Calendar** — client communications and scheduling.
- **Google Drive** — proposals, invoices, project documents.
- **context7** — fetch current Shopify/library docs; prefer it over memory for API/CLI/config details.
- **Shopify** — relevant skills from the Shopify AI Toolkit (`github.com/Shopify/Shopify-AI-Toolkit`) are **vendored into `.claude/skills/` with telemetry stripped** (see `.claude/skills/README.md`). `shopify-onboarding-merchant` is the path for connecting the store and importing WooCommerce data; `shopify-use-shopify-cli` drives the CLI. Add `shopify-admin` and `shopify-liquid` (same telemetry-stripping treatment) at the data-migration and theme phases.
- Analytics will be **Google Analytics**, added later when needed. (Matomo is not used on this project.)
