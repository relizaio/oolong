#!/bin/sh
# Integration tests for helm-chart/oolong/scripts/git-publish.inc.sh
set -e

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT

INC="$(cd "$(dirname "$0")/../../../helm-chart/oolong/scripts" && pwd)/git-publish.inc.sh"
if [ ! -f "$INC" ]; then
  echo "missing publish include: $INC"
  exit 1
fi

CONTENT_DIR="$ROOT/content"
WORK_DIR="$ROOT/work"
REVISIONS_DIR="$CONTENT_DIR/revisions"
POINTER_FILE="$CONTENT_DIR/.oolong-current-revision"
REVISION_RETENTION_COUNT=2

mkdir -p "$REVISIONS_DIR"

init_repo() {
  rm -rf "$WORK_DIR"
  _template="$(mktemp -d)"
  git init -q --template="$_template" "$WORK_DIR"
  rmdir "$_template" 2>/dev/null || true
  cd "$WORK_DIR"
  git config user.email "test@example.com"
  git config user.name "Test"
}

commit_products() {
  _label="$1"
  mkdir -p "products/$_label"
  printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: %s\nidentifiers: []\n' "$_label" \
    > "products/$_label/product.yaml"
  git add .
  git commit -q -m "$_label"
}

write_complete_revision() {
  _sha="$1"
  _label="$2"
  _target="$REVISIONS_DIR/$_sha"
  mkdir -p "$_target/products/$_label"
  printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: %s\nidentifiers: []\n' "$_label" \
    > "$_target/products/$_label/product.yaml"
  printf '%s\n' "$_sha" > "$_target/$PUBLISH_COMPLETE_MARKER"
}

assert() {
  if ! "$@"; then
    echo "ASSERT FAILED: $*"
    exit 1
  fi
}

. "$INC"

echo "test fresh publication"
init_repo
commit_products "alpha"
publish_revision
SHA="$(git rev-parse HEAD)"
assert test -f "$POINTER_FILE"
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$SHA"
assert revision_complete "$REVISIONS_DIR/$SHA"

echo "test repeated publication is idempotent"
publish_revision
assert test -f "$POINTER_FILE"

echo "test copy failure propagates"
rm -f "$POINTER_FILE"
init_repo
commit_products "beta"
FAILBIN="$ROOT/failbin"
mkdir -p "$FAILBIN"
printf '%s\n' '#!/bin/sh' 'exit 1' > "$FAILBIN/cp"
chmod +x "$FAILBIN/cp"
if PATH="$FAILBIN:$PATH" publish_revision; then
  echo "ASSERT FAILED: publish_revision should fail when cp fails"
  exit 1
fi
assert test ! -f "$POINTER_FILE"

echo "test retention preserves active and candidate revisions"
REVISION_RETENTION_COUNT=1
write_complete_revision "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "old-active"
write_complete_revision "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" "prune-me"
write_complete_revision "cccccccccccccccccccccccccccccccccccccccc" "new-cand"
write_complete_revision "dddddddddddddddddddddddddddddddddddddddd" "eligible-newer"
printf '%s' "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" > "$ACTIVE_POINTER_FILE"
printf '%s' "cccccccccccccccccccccccccccccccccccccccc" > "$POINTER_FILE"
sleep 1
touch "$REVISIONS_DIR/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
touch "$REVISIONS_DIR/dddddddddddddddddddddddddddddddddddddddd"
prune_old_revisions
assert test -d "$REVISIONS_DIR/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
assert test -d "$REVISIONS_DIR/cccccccccccccccccccccccccccccccccccccccc"
assert test -d "$REVISIONS_DIR/dddddddddddddddddddddddddddddddddddddddd"
assert test ! -d "$REVISIONS_DIR/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

echo "all git-publish integration tests passed"
