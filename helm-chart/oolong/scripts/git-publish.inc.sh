# Shared git content publication helpers (sourced by git-sync.sh and shell tests).
# Expects CONTENT_DIR, WORK_DIR, REVISIONS_DIR, POINTER_FILE,
# REVISION_RETENTION_COUNT, GIT_REPO_URL, and GIT_BRANCH.

ACTIVE_POINTER_FILE="${CONTENT_DIR}/.oolong-active-revision"
PUBLISH_COMPLETE_MARKER=".oolong-publish-complete"
PUBLISH_LOCK_WAIT_SECONDS="${PUBLISH_LOCK_WAIT_SECONDS:-300}"
PUBLISH_LOCK_STALE_SECONDS="${PUBLISH_LOCK_STALE_SECONDS:-30}"
PUBLISH_LOCK_HELD=0
PUBLISH_LOCK_HEARTBEAT_PID=""

file_mtime() {
  stat -c %Y "$1" 2>/dev/null || stat -f %m "$1"
}

publish_lock_dir() {
  printf '%s/.oolong-publish.lock' "$CONTENT_DIR"
}

lock_is_fresh() {
  _lock="$(publish_lock_dir)"
  _marker="$_lock/heartbeat"
  if [ ! -e "$_marker" ]; then
    _marker="$_lock"
  fi
  [ -e "$_marker" ] || return 1
  _now="$(date +%s)"
  _then="$(file_mtime "$_marker")"
  [ $((_now - _then)) -lt "$PUBLISH_LOCK_STALE_SECONDS" ]
}

start_lock_heartbeat() {
  _lock="$(publish_lock_dir)"
  (
    while [ -d "$_lock" ]; do
      touch "$_lock/heartbeat" 2>/dev/null || exit 0
      sleep 5
    done
  ) &
  PUBLISH_LOCK_HEARTBEAT_PID=$!
}

acquire_publish_lock() {
  _lock="$(publish_lock_dir)"
  _waited=0
  while true; do
    if mkdir "$_lock" 2>/dev/null; then
      touch "$_lock/heartbeat"
      start_lock_heartbeat
      PUBLISH_LOCK_HELD=1
      return 0
    fi
    if ! lock_is_fresh; then
      if mv "$_lock" "$_lock.stale.$$" 2>/dev/null; then
        rm -rf "$_lock.stale.$$"
        continue
      fi
    fi
    _waited=$((_waited + 1))
    if [ "$_waited" -ge "$PUBLISH_LOCK_WAIT_SECONDS" ]; then
      echo "ERROR: timed out waiting for publish lock"
      return 1
    fi
    sleep 1
  done
}

release_publish_lock() {
  if [ "$PUBLISH_LOCK_HELD" != 1 ]; then
    return 0
  fi
  if [ -n "$PUBLISH_LOCK_HEARTBEAT_PID" ]; then
    kill "$PUBLISH_LOCK_HEARTBEAT_PID" 2>/dev/null || true
    wait "$PUBLISH_LOCK_HEARTBEAT_PID" 2>/dev/null || true
    PUBLISH_LOCK_HEARTBEAT_PID=""
  fi
  rm -rf "$(publish_lock_dir)"
  PUBLISH_LOCK_HELD=0
}

locked_sync_and_publish() {
  acquire_publish_lock || return 1
  _status=0
  sync_worktree || _status=$?
  if [ "$_status" -eq 0 ]; then
    publish_revision || _status=$?
  fi
  release_publish_lock
  return $_status
}

revision_complete() {
  [ -d "$1" ] && [ -d "$1/products" ] && [ -f "$1/$PUBLISH_COMPLETE_MARKER" ]
}

read_revision_id() {
  _file="$1"
  if [ ! -f "$_file" ]; then
    REVISION_ID_RESULT=""
    return 0
  fi
  REVISION_ID_RESULT="$(tr -d ' \t\r\n' < "$_file")"
  return 0
}

revision_dir_protected() {
  _base="$1"
  read_revision_id "$POINTER_FILE"
  _cand="$REVISION_ID_RESULT"
  read_revision_id "$ACTIVE_POINTER_FILE"
  _active="$REVISION_ID_RESULT"
  [ -n "$_cand" ] && [ "$_base" = "$_cand" ] && return 0
  [ -n "$_active" ] && [ "$_base" = "$_active" ] && return 0
  return 1
}

sync_worktree() {
  if [ -z "$GIT_REPO_URL" ] || [ -z "$GIT_BRANCH" ]; then
    echo "ERROR: GIT_REPO_URL and GIT_BRANCH are required"
    return 1
  fi

  if [ -d "$WORK_DIR/.git" ]; then
    if ! git -C "$WORK_DIR" rev-parse --git-dir >/dev/null 2>&1; then
      echo "Work checkout is unusable; replacing it"
      rm -rf "$WORK_DIR"
    else
      _url="$(git -C "$WORK_DIR" remote get-url origin 2>/dev/null || true)"
      if [ "$_url" != "$GIT_REPO_URL" ]; then
        echo "Repository URL changed; replacing work checkout"
        rm -rf "$WORK_DIR"
      fi
    fi
  fi

  if [ ! -d "$WORK_DIR/.git" ]; then
    echo "Cloning repository into work directory..."
    rm -rf "$WORK_DIR"
    if ! git clone --no-checkout "$GIT_REPO_URL" "$WORK_DIR"; then
      echo "ERROR: git clone failed"
      rm -rf "$WORK_DIR"
      return 1
    fi
  fi

  cd "$WORK_DIR"
  if ! git fetch --force origin "$GIT_BRANCH"; then
    echo "ERROR: git fetch failed for $GIT_BRANCH"
    return 1
  fi
  _sha="$(git rev-parse FETCH_HEAD)"
  if [ -z "$_sha" ]; then
    echo "ERROR: fetched revision is empty"
    return 1
  fi
  if ! git checkout --force --detach "$_sha"; then
    echo "ERROR: checkout of $_sha failed"
    return 1
  fi
  git clean -fdx
  echo "Work checkout is $_sha from $GIT_BRANCH"
}

copy_worktree_except_git() {
  _dest="$1"
  _item=""
  for _item in * .[!.]* ..?*; do
    [ -e "$_item" ] || continue
    [ "$_item" = ".git" ] && continue
    if ! cp -a "$_item" "$_dest/"; then
      return 1
    fi
  done
  return 0
}

prune_old_revisions() {
  _keep="$REVISION_RETENTION_COUNT"
  [ "$_keep" -gt 0 ] || return 0

  _eligible=""
  _dir=""
  for _dir in "$REVISIONS_DIR"/*/; do
    [ -d "$_dir" ] || continue
    _base="$(basename "$_dir")"
    case "$_base" in
      .staging-*|.*) continue ;;
    esac
    if revision_dir_protected "$_base"; then
      continue
    fi
    _eligible="${_eligible}${_dir} "
  done

  if [ -z "$_eligible" ]; then
    return 0
  fi

  _count=0
  for _dir in $_eligible; do
    _count=$((_count + 1))
  done
  if [ "$_count" -le "$_keep" ]; then
    return 0
  fi

  _to_delete=$((_count - _keep))
  _sorted="$(ls -1dt $_eligible 2>/dev/null | tail -n "$_to_delete" || true)"
  if [ -z "$_sorted" ]; then
    return 0
  fi
  for _dir in $_sorted; do
    if revision_dir_protected "$(basename "$_dir")"; then
      continue
    fi
    echo "Pruning old revision directory $_dir"
    rm -rf "$_dir"
  done
}

publish_revision() {
  cd "$WORK_DIR"
  SHA="$(git rev-parse HEAD)"
  TARGET="$REVISIONS_DIR/$SHA"
  STAGING="$REVISIONS_DIR/.staging-$SHA"

  if revision_complete "$TARGET"; then
    echo "Revision $SHA already published"
  else
    echo "Publishing immutable revision $SHA"
    rm -rf "$STAGING"
    mkdir -p "$STAGING"
    if ! copy_worktree_except_git "$STAGING"; then
      echo "ERROR: failed to copy content for revision $SHA"
      rm -rf "$STAGING"
      return 1
    fi
    if [ ! -d "$STAGING/products" ]; then
      echo "ERROR: published tree for $SHA is missing products/"
      rm -rf "$STAGING"
      return 1
    fi
    printf '%s\n' "$SHA" > "$STAGING/$PUBLISH_COMPLETE_MARKER"
    if ! revision_complete "$STAGING"; then
      echo "ERROR: published tree for $SHA is incomplete"
      rm -rf "$STAGING"
      return 1
    fi
    rm -rf "$TARGET"
    mv "$STAGING" "$TARGET"
  fi

  printf '%s' "$SHA" > "${POINTER_FILE}.new"
  mv "${POINTER_FILE}.new" "$POINTER_FILE"
  echo "Active content revision is $SHA"
  prune_old_revisions
}
