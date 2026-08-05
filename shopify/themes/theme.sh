#!/usr/bin/env bash
# DotAim — Lush Qatar theme workflow wrapper.
#
# Enforces the surface split documented in docs/theme-phase.md:
#   surface A (code)    — repo is the source of truth, pushed to the store
#   surface B (content) — the store is the source of truth, pulled into the repo
#
# Guarantees:
#   - the KSA store is read-only; every write verb against it is refused
#   - code pushes never carry theme-editor content
#   - every push is preceded by a local snapshot of the remote theme, so any
#     push can be rolled back even if the remote had drifted from git
#   - deleting a theme needs its ID spelled out plus --yes
#
# Pre-launch the build theme is also the published theme: the storefront is
# password-protected, so there is nothing to shield from customers, and one
# clearly named theme is easier for the client's team to follow. Strict
# published-theme protection comes back at launch.
#
# Usage: ./theme.sh <command> [environment]
set -euo pipefail

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
THEME_DIR="$HERE/be-yours"
REF_DIR="$HERE/__reference"
SNAP_DIR="$REF_DIR/snapshots"
# Last known-synced copy of the theme-editor content, used to tell "we changed
# this locally" apart from "someone changed it in the theme editor".
BASELINE="$REF_DIR/.content-baseline"
ENV_FILE="$HERE/.env"
TOML="$THEME_DIR/shopify.theme.toml"
QA_STORE="lush-qatar.myshopify.com"
# Verified 2026-08-03 from the public storefront (Shopify.shop). The store has a
# randomized handle — it is NOT lushsa.myshopify.com, which earlier docs assumed.
KSA_STORE="ckdthc-qn.myshopify.com"

# Surface B — theme editor territory. Everything else is code.
CONTENT=(
  "config/settings_data.json"
  "templates/*.json"
  "templates/customers/*.json"
  "sections/*.json"
)

die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }
note() { printf '\033[36m→\033[0m %s\n' "$*"; }

load_env() {
  [[ -f "$ENV_FILE" ]] ||
    die "missing $ENV_FILE — copy .env.example and add the Theme Access passwords (see docs/theme-phase.md, T0)"
  set -a; . "$ENV_FILE"; set +a
}

token_for() {
  case "$1" in
    build|vanilla)      printf '%s' "${QA_THEME_TOKEN:-}" ;;
    ksa|ksa-vanilla)    printf '%s' "${KSA_THEME_TOKEN:-}" ;;
    *) die "unknown environment '$1' (build | vanilla | ksa | ksa-vanilla)" ;;
  esac
}

# Theme ID for an environment, read from shopify.theme.toml (commented-out
# placeholders are ignored, so an unfilled ID fails loudly rather than silently).
theme_id_for() {
  [[ -f "$TOML" ]] || die "missing $TOML"
  awk -v want="[environments.$1]" '
    $0 == want { inblk = 1; next }
    /^\[/ { inblk = 0 }
    inblk && $1 == "theme" { gsub(/"/, "", $3); print $3; exit }
  ' "$TOML"
}

# The KSA store is reference-only. This is the single choke point: any verb that
# could write is refused before the CLI is ever invoked.
assert_ksa_read_only() {
  local env="$1" verb="$2"
  [[ "$env" == ksa* ]] || return 0
  case "$verb" in
    pull|list|info|check) return 0 ;;
    *) die "KSA is strictly read-only — refusing '$verb'. Only pull/list/info are allowed against $KSA_STORE." ;;
  esac
}

# Record the current content files as the synced baseline.
snapshot_baseline() {
  rm -rf "$BASELINE"; mkdir -p "$BASELINE"
  ( cd "$1" && find config templates sections -name '*.json' 2>/dev/null \
      -exec cp --parents {} "$BASELINE/" \; ) 2>/dev/null || true
}

# Refuse to overwrite theme-editor work. Pulls the store's current content and
# compares it with the baseline: any difference means the editor changed since
# our last sync, and pushing would silently discard it.
assert_no_editor_drift() {
  local env="$1" tmp drift=0
  [[ -d "$BASELINE" ]] || { note "no content baseline yet — run 'pull-content' first to establish one"; return 0; }
  local id; id="$(theme_id_for "$env")"
  [[ -n "$id" ]] || die "no theme id for '$env'; cannot check for theme-editor changes"
  tmp="$(mktemp -d)"
  mapfile -t only < <(content_flags --only)
  # Explicit --store/--theme, not --environment: shopify.theme.toml is resolved
  # relative to --path, and --path here is a temp dir that has no toml.
  sh_theme "$env" pull --store "$QA_STORE" --theme "$id" --path "$tmp" "${only[@]}" >/dev/null 2>&1 \
    || die "could not read the store's current content; refusing to push blind"
  # Compare parsed JSON, not bytes: Shopify normalizes what it serves (header
  # comment, key order), so a byte compare reports every file as changed.
  local changed
  changed="$(python3 - "$BASELINE" "$tmp" <<'PYEOF'
import json, re, sys, pathlib
base, remote = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
def load(p):
    try: return json.loads(re.sub(r'/\*.*?\*/', '', p.read_text(encoding='utf-8'), flags=re.S))
    except Exception: return None
for f in sorted(base.rglob('*.json')):
    rel = f.relative_to(base)
    other = remote / rel
    if not other.exists():
        continue
    a, b = load(f), load(other)
    if a is None or b is None or a != b:
        print(rel)
PYEOF
)"
  rm -rf "$tmp"
  if [[ -n "$changed" ]]; then
    drift=1
    printf '\033[31mtheme-editor changes on the store:\033[0m\n' >&2
    printf '   %s\n' $changed >&2
  fi
  [[ $drift -eq 0 ]] || die "someone edited these in the theme editor since the last sync.
   Run './theme.sh pull-content' to bring them into git and commit, then push again.
   To overwrite the editor's version anyway, add --force."
}

# Expand the CONTENT list into repeated --only / --ignore flags.
content_flags() {
  local flag="$1" g
  for g in "${CONTENT[@]}"; do printf '%s\n%s\n' "$flag" "$g"; done
}

# Every CLI call goes through here. The Theme Access password is passed via the
# environment, never as --password: command-line arguments are visible to any
# local user via `ps`, and these tokens grant read/write on the client's themes.
sh_theme() {
  local env="$1"; shift
  local token; token="$(token_for "$env")"
  [[ -n "$token" && "$token" != "shptka_" ]] ||
    die "no Theme Access password set for '$env' in $ENV_FILE"
  SHOPIFY_CLI_THEME_TOKEN="$token" shopify theme "$@"
}

run_theme() {
  local env="$1"; shift
  assert_ksa_read_only "$env" "$1"
  sh_theme "$env" "$@" --environment "$env" --path "$THEME_DIR"
}

# Pull the current remote state of a Qatar theme into a timestamped, gitignored
# directory. Rollback path for anything a push would overwrite.
snapshot_theme() {
  local env="$1" id ts dir
  id="$(theme_id_for "$env")"
  [[ -n "$id" ]] || die "no theme id for '$env' in shopify.theme.toml — fill it in (T0) so pushes can be snapshotted"
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  dir="$SNAP_DIR/${env}-${ts}"
  mkdir -p "$dir"
  note "snapshot: remote '$env' (theme $id) → __reference/snapshots/${env}-${ts}"
  sh_theme "$env" pull --store "$QA_STORE" --theme "$id" --path "$dir"
}

usage() {
  cat <<'EOF'
DotAim — Lush Qatar theme workflow. See docs/theme-phase.md.

read-only
  ./theme.sh list         [build|ksa]      themes, IDs and roles
  ./theme.sh pull-code    [build]          recover admin code-editor edits
  ./theme.sh pull-content [build]          pull theme-editor settings — then commit
  ./theme.sh pull-ref  ksa-live|ksa-8.5|qa-vanilla     reference snapshot
  ./theme.sh probe   <build|ksa> <theme-id>      read a theme's version + whether
                                                 it is customized (2 small files)
  ./theme.sh check                         theme check (local, no network)

writes to the Qatar store
  ./theme.sh push-code    [build]          push theme code (never editor content)
  ./theme.sh push-content build --yes      write editor settings from the repo
                                           (refuses if the editor changed since
                                            the last pull; --force overrides)
  ./theme.sh backup       [build]          server-side duplicate as a restore point
  ./theme.sh dev          [build]          local dev server, editor sync on

Environments: build (default, currently the published theme) | vanilla | ksa (read-only)
Pushes snapshot the remote theme first; set NO_SNAPSHOT=1 to skip.
EOF
}

cmd="${1:-}"; env="${2:-build}"
[[ -n "$cmd" && "$cmd" != "-h" && "$cmd" != "--help" ]] || { usage; exit 1; }
load_env

case "$cmd" in

  # --- surface A: code ------------------------------------------------------
  push-code)
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only; never push to it."
    [[ "${NO_SNAPSHOT:-}" == "1" ]] || snapshot_theme "$env"
    note "pushing code to '$env' (theme-editor content excluded)"
    mapfile -t ign < <(content_flags --ignore)
    # --allow-live: pre-launch the build theme IS the published theme. Nothing
    # is public (the storefront is password-protected), and the safety net is
    # the pre-push snapshot above plus the git baseline, not a second theme.
    run_theme "$env" push --nodelete --allow-live "${ign[@]}"
    ;;

  pull-code)
    note "pulling code from '$env' (recovers admin code-editor edits)"
    mapfile -t ign < <(content_flags --ignore)
    run_theme "$env" pull "${ign[@]}"
    ;;

  # --- surface B: theme editor content --------------------------------------
  pull-content)
    note "pulling theme-editor content from '$env' — commit the result"
    mapfile -t only < <(content_flags --only)
    run_theme "$env" pull "${only[@]}"
    snapshot_baseline "$THEME_DIR"
    ;;

  push-content)
    # Only for the deliberate KSA settings port (T2/T3). Overwrites the store's
    # theme-editor state, so it is opt-in.
    [[ "${3:-}" == "--yes" ]] ||
      die "push-content overwrites theme-editor settings on '$env'. Re-run with --yes if that is intended."
    [[ "$env" == ksa* ]] && die "not allowed against '$env'."
    [[ " $* " == *" --force "* ]] || assert_no_editor_drift "$env"
    [[ "${NO_SNAPSHOT:-}" == "1" ]] || snapshot_theme "$env"
    note "pushing theme-editor content to '$env'"
    mapfile -t only < <(content_flags --only)
    run_theme "$env" push --nodelete --allow-live "${only[@]}"
    snapshot_baseline "$THEME_DIR"
    ;;

  publish)
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only."
    id="$(theme_id_for "$env")"
    [[ -n "$id" ]] || die "no theme id for '$env' in shopify.theme.toml"
    note "publishing '$env' (theme $id) on $QA_STORE"
    sh_theme "$env" publish --store "$QA_STORE" --theme "$id" --force
    ;;

  delete)
    # Deleting a theme cannot be undone from Shopify's side. Requires the theme
    # ID stated explicitly plus --yes, so it can never happen by accident.
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only."
    id="${3:-}"; confirm="${4:-}"
    [[ -n "$id" && "$confirm" == "--yes" ]] ||
      die "usage: ./theme.sh delete build <theme-id> --yes   (irreversible)"
    [[ "$id" == "$(theme_id_for build)" ]] &&
      die "refusing to delete the build theme ($id) — that is the working target."
    note "DELETING theme $id on $QA_STORE (irreversible)"
    sh_theme build delete --store "$QA_STORE" --theme "$id" --force
    ;;

  rename)
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only."
    name="${3:-}"
    [[ -n "$name" ]] || die "usage: ./theme.sh rename <env> \"<new theme name>\""
    id="$(theme_id_for "$env")"
    [[ -n "$id" ]] || die "no theme id for '$env' in shopify.theme.toml"
    note "renaming '$env' (theme $id) to \"$name\""
    sh_theme "$env" rename --store "$QA_STORE" --theme "$id" --name "$name"
    ;;

  # --- restore points -------------------------------------------------------
  duplicate)
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only."
    name="${3:-}"
    [[ -n "$name" ]] || die "usage: ./theme.sh duplicate <env> \"<new theme name>\""
    id="$(theme_id_for "$env")"
    [[ -n "$id" ]] || die "no theme id for '$env' in shopify.theme.toml"
    note "duplicating '$env' (theme $id) as \"$name\" on $QA_STORE"
    # --force skips the CLI's interactive confirmation, which cannot be answered
    # in a non-interactive session. The source theme and the new name are both
    # explicit arguments, and duplicating is additive, so nothing is at risk.
    sh_theme "$env" duplicate --store "$QA_STORE" --theme "$id" \
      --name "$name" --force
    ;;

  backup)
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only."
    id="$(theme_id_for "$env")"
    [[ -n "$id" ]] || die "no theme id for '$env' in shopify.theme.toml"
    name="restore point $(date -u +%Y-%m-%d) — $env"
    note "duplicating '$env' (theme $id) as \"$name\""
    sh_theme "$env" duplicate --store "$QA_STORE" --theme "$id" \
      --name "$name" --force
    ;;

  # --- local development ----------------------------------------------------
  dev)
    [[ "$env" == ksa* ]] && die "the KSA store is reference-only; 'dev' uploads a development theme."
    note "starting dev server on an ephemeral development theme (editor sync on)"
    # Deliberately no --theme/--environment: that would point dev at the
    # published theme. Omitting it makes the CLI use a development theme.
    sh_theme "$env" dev --store "$QA_STORE" --path "$THEME_DIR" --theme-editor-sync
    ;;

  check)
    shopify theme check --path "$THEME_DIR"
    ;;

  # Read a theme's identity without pulling it: settings_schema.json carries
  # theme_version, settings_data.json shows whether it is still on defaults.
  probe)
    id="${3:-}"
    [[ -n "$id" ]] || die "usage: ./theme.sh probe <build|ksa> <theme-id>"
    assert_ksa_read_only "$env" pull
    case "$env" in ksa*) store="$KSA_STORE" ;; *) store="$QA_STORE" ;; esac
    dir="$REF_DIR/probe/${env}-${id}"
    mkdir -p "$dir"
    note "probing theme $id on $store → __reference/probe/${env}-${id}"
    sh_theme "$env" pull --store "$store" --theme "$id" --path "$dir" \
      --only config/settings_schema.json --only config/settings_data.json
    ;;

  list)
    case "$env" in
      ksa*) sh_theme ksa list --store "$KSA_STORE" ;;
      *)    sh_theme build list --store "$QA_STORE" ;;
    esac
    ;;

  # --- read-only reference snapshots (gitignored) ---------------------------
  # The CLI prompts for which theme to pull when no ID is given — pick the one
  # named in the note.
  # Theme IDs and versions confirmed by `probe` on 2026-08-03.
  pull-ref)
    case "$env" in
      ksa-live)     ref_store="$KSA_STORE"; ref_tok="ksa";     ref_id=184102060346; ref_dir="ksa-8.4.0-live"
                    ref_what="KSA LIVE — the parity target (customized, 88 settings)" ;;
      ksa-8.5)      ref_store="$KSA_STORE"; ref_tok="ksa";     ref_id=184533385530; ref_dir="ksa-8.5.0-unpublished"
                    ref_what="KSA's unpublished 8.5.0 update — not the parity target" ;;
      qa-vanilla)   ref_store="$QA_STORE";  ref_tok="vanilla"; ref_id=152138383499; ref_dir="qatar-9.1.0-vanilla"
                    ref_what="Qatar's UNTOUCHED 9.1.0 — the diff baseline" ;;
      *) die "pull-ref takes 'ksa-live', 'ksa-8.5' or 'qa-vanilla'" ;;
    esac
    mkdir -p "$REF_DIR/$ref_dir"
    note "pulling $ref_what → __reference/$ref_dir (read-only)"
    sh_theme "$ref_tok" pull --store "$ref_store" --theme "$ref_id" \
      --path "$REF_DIR/$ref_dir"
    ;;

  *) die "unknown command '$cmd' (list | pull-code | pull-content | pull-ref | check | push-code | push-content | backup | dev)" ;;
esac
