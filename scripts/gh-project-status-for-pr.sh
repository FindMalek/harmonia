#!/usr/bin/env bash
# Moves every issue linked to a PR (via "Closes #n" or a linked development branch)
# to the given Status on the Sonaraem GitHub Project (#7).
#
# Usage: scripts/gh-project-status-for-pr.sh <pr-number> <status>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PR="${1:?usage: gh-project-status-for-pr.sh <pr-number> <status>}"
STATUS="${2:?usage: gh-project-status-for-pr.sh <pr-number> <status>}"

ISSUES=$(gh pr view "$PR" --json closingIssuesReferences --jq '.closingIssuesReferences[].number')

if [ -z "$ISSUES" ]; then
  echo "PR #$PR has no linked issues (closingIssuesReferences is empty) — nothing to move." >&2
  exit 0
fi

for issue in $ISSUES; do
  "$SCRIPT_DIR/gh-project-status.sh" "$issue" "$STATUS"
done
