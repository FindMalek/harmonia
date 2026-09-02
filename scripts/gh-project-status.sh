#!/usr/bin/env bash
# Moves an issue or PR's item on the Sonaraem GitHub Project (#7) to a given Status.
#
# Usage: scripts/gh-project-status.sh <issue-or-pr-number> <status>
#   status: one of Backlog | Ready | "In progress" | "In review" | "On hold" | Done
set -euo pipefail

OWNER="FindMalek"
PROJECT_NUMBER=7
PROJECT_ID="PVT_kwHOBHAtp84BQymj"
STATUS_FIELD_ID="PVTSSF_lAHOBHAtp84BQymjzg-zwUU"

NUMBER="${1:?usage: gh-project-status.sh <issue-or-pr-number> <status>}"
STATUS="${2:?usage: gh-project-status.sh <issue-or-pr-number> <status>}"

case "$STATUS" in
  Backlog) OPTION_ID="f75ad846" ;;
  Ready) OPTION_ID="08afe404" ;;
  "In progress") OPTION_ID="47fc9ee4" ;;
  "In review") OPTION_ID="4cc61d42" ;;
  "On hold") OPTION_ID="f80347ea" ;;
  Done) OPTION_ID="98236657" ;;
  *)
    echo "Unknown status '$STATUS'. Expected one of: Backlog, Ready, 'In progress', 'In review', 'On hold', Done" >&2
    exit 1
    ;;
esac

ITEM_ID=$(gh project item-list "$PROJECT_NUMBER" --owner "$OWNER" --format json --limit 500 \
  | jq -r --argjson n "$NUMBER" '.items[] | select(.content.number == $n) | .id' | head -n1)

if [ -z "$ITEM_ID" ]; then
  echo "No project item found for #$NUMBER on project $PROJECT_NUMBER. Is it added to the board?" >&2
  exit 1
fi

gh project item-edit \
  --id "$ITEM_ID" \
  --project-id "$PROJECT_ID" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$OPTION_ID" \
  > /dev/null

echo "Moved #$NUMBER to '$STATUS'."
