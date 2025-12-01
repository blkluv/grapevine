#!/bin/bash
# Squash all commits into 1 commit, preserving all authors as co-authors
# Run with --dry-run to preview without changes

set -e

if [[ "$1" == "--dry-run" ]]; then
    echo "=== DRY RUN ==="
    echo ""
    echo "Authors found:"
    git log --format="%an <%ae>" | sort -u
    echo ""
    echo "Current commits: $(git rev-list --count HEAD)"
    echo "After squash: 1 commit"
    echo ""
    echo "Run without --dry-run to execute"
    exit 0
fi

BRANCH=$(git branch --show-current)
AUTHORS=$(git log --format="Co-authored-by: %an <%ae>" | sort -u)

# Create backup
git branch "backup-$(date +%s)" 2>/dev/null || true

# Create squashed branch
git checkout --orphan squashed-commits
git add -A
git commit -m "bootstrap

$AUTHORS"

echo ""
echo "Done! Squashed history is on 'squashed-commits' branch."
echo "Original branch '$BRANCH' is unchanged."
echo ""
echo "To use: git checkout squashed-commits"
echo "To compare: git diff $BRANCH squashed-commits"
