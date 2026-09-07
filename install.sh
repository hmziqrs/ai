#!/usr/bin/env bash
#
# install.sh — install the agents and skills from this repo into ZCode.
#
# Content lives under <harness>/ in this repo (default: zcode/), so more
# harnesses can be added as sibling folders later without touching this
# script's defaults.
#
# Agents  -> ~/.zcode/agents/          (user scope; ZCode's sub-agent root)
# Skills  -> ~/.agents/skills/         (user scope; cross-tool compatible)
#
# Default install is symlinks, so a `git pull` updates everything in place.
#
# Usage:
#   ./install.sh                     symlink install (default)
#   ./install.sh --copy              copy files instead of symlinking
#   ./install.sh --zcode-skills      install skills into ~/.zcode/skills/
#                                    instead of ~/.agents/skills/ (ZCode-only,
#                                    higher precedence if you have both)
#   ./install.sh --uninstall         remove only what this repo installed
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="zcode"
MODE="link"
SKILL_DIR="$HOME/.agents/skills"
AGENT_DIR="$HOME/.zcode/agents"

for arg in "$@"; do
  case "$arg" in
    --copy)         MODE="copy" ;;
    --zcode-skills) SKILL_DIR="$HOME/.zcode/skills" ;;
    --uninstall)    MODE="uninstall" ;;
    *) echo "unknown flag: $arg (supported: --copy, --zcode-skills, --uninstall)"; exit 1 ;;
  esac
done

install_items() {
  local src_dir="$1" dest_dir="$2" kind="$3"
  local installed=0
  for src in "$src_dir"/*; do
    [ -e "$src" ] || continue
    local name
    name="$(basename "$src")"
    local dest="$dest_dir/$name"
    mkdir -p "$dest_dir"
    if [ "$MODE" = "uninstall" ]; then
      if [ -L "$dest" ] || [ -f "$dest" ]; then
        rm -rf "$dest"
        echo "removed  $kind  $dest"
      fi
      continue
    fi
    if [ -L "$dest" ] || [ -e "$dest" ]; then
      rm -rf "$dest"
    fi
    if [ "$MODE" = "copy" ]; then
      cp -R "$src" "$dest"
    else
      ln -s "$src" "$dest"
    fi
    echo "installed $kind  $dest -> $src"
    installed=$((installed + 1))
  done
  if [ "$MODE" != "uninstall" ] && [ "$installed" -eq 0 ]; then
    echo "warning: no $kind found in $src_dir"
  fi
}

install_items "$REPO_ROOT/$HARNESS/agents" "$AGENT_DIR" "agent"
install_items "$REPO_ROOT/$HARNESS/skills" "$SKILL_DIR" "skill"

if [ "$MODE" = "uninstall" ]; then
  echo "Done. Restart ZCode (or open a new session) for removals to take effect."
else
  cat <<'EOF'

Done. Restart ZCode (or open a new session) to load the new agents.
Verify: Settings -> Subagents should list general-flash, explore-flash,
general-pro. Dispatch a skill by mentioning z-workflow / z-liteflow.
EOF
fi
