# lush.qa

Code and docs for migrating the **Lush Qatar** online store (`lush.qa`, Al Mana Fashion Group) from WooCommerce/WordPress to Shopify, plus the Shopify theme customizations that follow. Maintained by DotAim LLC.

## Layout

```
.
├── docs/                              project context + migration specs
│   ├── lush-migration-project-context.md   canonical source of truth
│   ├── data-mapping.md                     WooCommerce → Shopify field mapping
│   └── migration-runbook.md                phased plan + checklist
├── shopify/
│   ├── migration_from_woocommerce/    migration scripts (+ .env.example)
│   └── themes/be-yours/               theme customizations (theme phase)
└── .claude/CLAUDE.md                  guidance for Claude Code
```

## Getting started

Migration scripts read config from a local `.env`:

```
cd shopify/migration_from_woocommerce
cp .env.example .env
# fill in WooCommerce + Shopify credentials
```

`.env` is gitignored. **Never commit credentials.**

## Notes

- Start with `docs/lush-migration-project-context.md`.
- This repo lives in a `repo/` subdirectory of a larger private working area; invoices, recordings, proposals, and personal notes are kept in the parent directory and are intentionally **not** part of this repo.
