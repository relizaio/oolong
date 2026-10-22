#!/bin/sh
# Integration tests for helm-chart/oolong/scripts/git-publish.inc.sh
set -e

ROOT="$(mktemp -d)"
trap 'rm -rf "$ROOT"' EXIT

if ! command -v flock >/dev/null 2>&1; then
  if ! command -v python3 >/dev/null 2>&1; then
    echo "flock or python3 is required for publish lock tests"
    exit 1
  fi
  mkdir -p "$ROOT/bin"
  cat > "$ROOT/bin/flock" << 'PY'
#!/usr/bin/env python3
import fcntl
import sys
import time

timeout = None
nonblock = False
unlock = False
fd = None
args = sys.argv[1:]
i = 0
while i < len(args):
    arg = args[i]
    if arg == "-w":
        timeout = float(args[i + 1])
        i += 2
        continue
    if arg == "-n":
        nonblock = True
        i += 1
        continue
    if arg == "-u":
        unlock = True
        i += 1
        continue
    if arg in ("-x", "-s"):
        i += 1
        continue
    fd = int(arg)
    i += 1
if fd is None:
    sys.exit(2)
try:
    if unlock:
        fcntl.flock(fd, fcntl.LOCK_UN)
        sys.exit(0)
    if nonblock or timeout is None:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        sys.exit(0)
    deadline = time.time() + timeout
    while True:
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            sys.exit(0)
        except OSError:
            if time.time() >= deadline:
                sys.exit(1)
            time.sleep(0.05)
except OSError:
    sys.exit(1)
PY
  chmod +x "$ROOT/bin/flock"
  PATH="$ROOT/bin:$PATH"
  export PATH
fi

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

echo "test publication failures leave the previous pointer unchanged"
OLD_SHA="$(git -C "$WORK_DIR" rev-parse HEAD)"
OLD_POINTER="$(tr -d '\n' < "$POINTER_FILE")"
assert test "$OLD_POINTER" = "$OLD_SHA"
cd "$WORK_DIR"
commit_products "gamma"
NEW_SHA="$(git rev-parse HEAD)"
assert test "$NEW_SHA" != "$OLD_SHA"
sync_worktree() {
  return 0
}

mv() {
  _dest=""
  for _arg in "$@"; do
    _dest="$_arg"
  done
  if [ "$_dest" = "$REVISIONS_DIR/$NEW_SHA" ]; then
    return 1
  fi
  command mv "$@"
}
if locked_sync_and_publish; then
  echo "ASSERT FAILED: staging rename failure reported success"
  exit 1
fi
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$OLD_POINTER"
assert test ! -d "$REVISIONS_DIR/$NEW_SHA"
assert test ! -d "$REVISIONS_DIR/.staging-$NEW_SHA"
unset -f mv

write_text_file() {
  case "$1" in
    */.oolong-publish-complete) return 1 ;;
  esac
  printf '%s' "$2" > "$1"
}
if locked_sync_and_publish; then
  echo "ASSERT FAILED: completion-marker failure reported success"
  exit 1
fi
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$OLD_POINTER"
assert test ! -d "$REVISIONS_DIR/$NEW_SHA"
assert test ! -d "$REVISIONS_DIR/.staging-$NEW_SHA"

write_text_file() {
  case "$1" in
    *.oolong-current-revision.new) return 1 ;;
  esac
  printf '%s' "$2" > "$1"
}
if locked_sync_and_publish; then
  echo "ASSERT FAILED: pointer write failure reported success"
  exit 1
fi
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$OLD_POINTER"
assert test ! -f "${POINTER_FILE}.new"
assert revision_complete "$REVISIONS_DIR/$NEW_SHA"

mv() {
  _dest=""
  for _arg in "$@"; do
    _dest="$_arg"
  done
  if [ "$_dest" = "$POINTER_FILE" ]; then
    return 1
  fi
  command mv "$@"
}
unset -f write_text_file
. "$INC"
sync_worktree() {
  return 0
}
if locked_sync_and_publish; then
  echo "ASSERT FAILED: pointer rename failure reported success"
  exit 1
fi
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$OLD_POINTER"
assert test ! -f "${POINTER_FILE}.new"
assert revision_complete "$REVISIONS_DIR/$NEW_SHA"
unset -f mv
unset -f sync_worktree
. "$INC"

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

echo "test switching divergent branches"
REMOTE="$ROOT/remote.git"
STAGE="$ROOT/stage"
_template="$(mktemp -d)"
git init -q --bare --template="$_template" "$REMOTE"
rmdir "$_template" 2>/dev/null || true
_template="$(mktemp -d)"
git init -q --template="$_template" "$STAGE"
rmdir "$_template" 2>/dev/null || true
cd "$STAGE"
git config user.email "test@example.com"
git config user.name "Test"
mkdir -p products/shared
printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: Shared\nidentifiers: []\n' \
  > products/shared/product.yaml
git add .
git commit -q -m "shared"
git branch -M main
printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: Main Only\nidentifiers: []\n' \
  > products/shared/product.yaml
mkdir -p products/main-only
printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: Main Extra\nidentifiers: []\n' \
  > products/main-only/product.yaml
git add .
git commit -q -m "main-only"
git push -q "$REMOTE" main
git checkout -q -B other HEAD~
printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: Other Only\nidentifiers: []\n' \
  > products/shared/product.yaml
mkdir -p products/other-only
printf 'uuid: 11111111-1111-4111-8111-111111111111\nname: Other Extra\nidentifiers: []\n' \
  > products/other-only/product.yaml
git add .
git commit -q -m "other-only"
git push -q "$REMOTE" other

rm -rf "$WORK_DIR" "$CONTENT_DIR"
CONTENT_DIR="$ROOT/content-branches"
WORK_DIR="$CONTENT_DIR/_work"
REVISIONS_DIR="$CONTENT_DIR/revisions"
POINTER_FILE="$CONTENT_DIR/.oolong-current-revision"
ACTIVE_POINTER_FILE="$CONTENT_DIR/.oolong-active-revision"
REVISION_RETENTION_COUNT=5
mkdir -p "$REVISIONS_DIR"
GIT_REPO_URL="$REMOTE"
GIT_BRANCH=main
sync_worktree
publish_revision
MAIN_SHA="$(git -C "$WORK_DIR" rev-parse HEAD)"
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$MAIN_SHA"
assert test -d "$REVISIONS_DIR/$MAIN_SHA/products/main-only"
assert test ! -d "$REVISIONS_DIR/$MAIN_SHA/products/other-only"

GIT_BRANCH=other
sync_worktree
publish_revision
OTHER_SHA="$(git -C "$WORK_DIR" rev-parse HEAD)"
assert test "$MAIN_SHA" != "$OTHER_SHA"
assert test "$(tr -d '\n' < "$POINTER_FILE")" = "$OTHER_SHA"
assert test -d "$REVISIONS_DIR/$OTHER_SHA/products/other-only"
assert test ! -d "$REVISIONS_DIR/$OTHER_SHA/products/main-only"

echo "test retention preserves active and candidate revisions"
REVISION_RETENTION_COUNT=1
write_complete_revision "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "old-active"
write_complete_revision "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" "prune-me"
write_complete_revision "cccccccccccccccccccccccccccccccccccccccc" "new-cand"
write_complete_revision "dddddddddddddddddddddddddddddddddddddddd" "eligible-newer"
printf '%s' "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" > "$ACTIVE_POINTER_FILE"
printf '%s' "cccccccccccccccccccccccccccccccccccccccc" > "$POINTER_FILE"
# Distinct seconds: published commits oldest, bbbb next, dddd newest eligible.
touch -t 202001010000.00 "$REVISIONS_DIR/$MAIN_SHA" "$REVISIONS_DIR/$OTHER_SHA"
touch -t 202001010001.00 "$REVISIONS_DIR/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
touch -t 202001010002.00 "$REVISIONS_DIR/dddddddddddddddddddddddddddddddddddddddd"
prune_old_revisions
assert test -d "$REVISIONS_DIR/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
assert test -d "$REVISIONS_DIR/cccccccccccccccccccccccccccccccccccccccc"
assert test -d "$REVISIONS_DIR/dddddddddddddddddddddddddddddddddddddddd"
assert test ! -d "$REVISIONS_DIR/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

echo "test publish lock excludes a second writer until release"
CONTENT_DIR="$ROOT/content-lock"
mkdir -p "$CONTENT_DIR"
acquire_publish_lock
LOCK_FILE="$CONTENT_DIR/.oolong-publish.lock"
assert test -f "$LOCK_FILE"
if (
  CONTENT_DIR="$CONTENT_DIR"
  PUBLISH_LOCK_WAIT_SECONDS=1
  . "$INC"
  acquire_publish_lock
); then
  echo "ASSERT FAILED: second publisher acquired the lock"
  exit 1
fi
release_publish_lock
assert test -f "$LOCK_FILE"

echo "test former owner release does not drop the successor lock"
(
  CONTENT_DIR="$CONTENT_DIR"
  . "$INC"
  acquire_publish_lock
  touch "$CONTENT_DIR/successor-holds"
  while [ ! -f "$CONTENT_DIR/successor-release" ]; do
    sleep 0.05
  done
  release_publish_lock
) &
SUCCESSOR_PID=$!
while [ ! -f "$CONTENT_DIR/successor-holds" ]; do
  sleep 0.05
done
release_publish_lock
if (
  CONTENT_DIR="$CONTENT_DIR"
  PUBLISH_LOCK_WAIT_SECONDS=1
  . "$INC"
  acquire_publish_lock
); then
  echo "ASSERT FAILED: former owner release cleared the successor lock"
  exit 1
fi
assert test -f "$LOCK_FILE"
touch "$CONTENT_DIR/successor-release"
wait "$SUCCESSOR_PID"
assert test -f "$LOCK_FILE"

echo "all git-publish integration tests passed"
