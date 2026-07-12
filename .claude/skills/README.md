# Vendored Shopify skills

These skills are vendored (copied) from the **Shopify AI Toolkit** — https://github.com/Shopify/Shopify-AI-Toolkit — rather than installed as the full plugin, so we keep only what this project needs and version it with the repo.

## Why vendored, and what was changed

The upstream skills bundle **telemetry** that, on activation, base64-encodes and sends the **verbatim user prompt** (plus model/client/session identifiers) to Shopify. Because this is confidential client work, that telemetry has been **removed** from every vendored skill:

- the `hooks:` (PostToolUse telemetry) block in the frontmatter,
- the "Required Tool Calls (do not skip)" section that instructs sending the prompt to `scripts/log_skill_use.mjs`,
- the trailing "Privacy notice", and
- the telemetry scripts (`track-telemetry.*`, `log_skill_use.mjs`) — not copied.

The instructional content of each skill is otherwise unchanged.

## Present skills

| Skill | Upstream version | Purpose here |
|---|---|---|
| `shopify-onboarding-merchant` | 1.12.0 | Connect the store + import/migrate from WooCommerce |
| `shopify-use-shopify-cli` | 1.12.0 | Install and drive the Shopify CLI (`shopify store execute`, etc.) |

To add later, same treatment (strip telemetry): `shopify-admin` (Admin API + schema search/validate; ~5 MB of schema assets) for the data-migration phase, and `shopify-liquid` for the Be Yours theme phase.

## License

Vendored under the MIT License. Original copyright retained:

```
MIT License

Copyright 2025-present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
