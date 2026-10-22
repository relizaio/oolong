# Shared git content publication helpers (sourced by git-sync.sh and shell tests).
# Expects CONTENT_DIR, WORK_DIR, REVISIONS_DIR, POINTER_FILE,
# REVISION_RETENTION_COUNT, GIT_REPO_URL, and GIT_BRANCH.

ACTIVE_POINTER_FILE="${CONTENT_DIR}/.oolong-active-revision"
PUBLISH_COMPLETE_MARKER=".oolong-publish-complete"
PUBLISH_LOCK_WAIT_SECONDS="${PUBLISH_LOCK_WAIT_SECONDS:-300}"
PUBLISH_LOCK_HELD=0

validate_revision_retention_count() {
  case "$REVISION_RETENTION_COUNT" in
    ''|*[!0-9]*)
      echo "ERROR: REVISION_RETENTION_COUNT must be a positive integer" >&2
      return 1
      ;;
  esac
  if [ "$REVISION_RETENTION_COUNT" -lt 1 ] ||
     [ "$REVISION_RETENTION_COUNT" -gt 1000 ]; then
    echo "ERROR: REVISION_RETENTION_COUNT must be between 1 and 1000" >&2
    return 1
  fi
  return 0
}

validate_git_repo_url() {
  case "$GIT_REPO_URL" in
    https://*)
      ;;
    *)
      echo "ERROR: GIT_REPO_URL must use https://" >&2
      return 1
      ;;
  esac
  _rest="${GIT_REPO_URL#https://}"
  case "$_rest" in
    *@*)
      echo "ERROR: GIT_REPO_URL must not include userinfo" >&2
      return 1
      ;;
  esac
  _hostport="${_rest%%/*}"
  if [ -z "$_hostport" ]; then
    echo "ERROR: GIT_REPO_URL is missing a host" >&2
    return 1
  fi
  _host="${_hostport%%:*}"
  if [ -z "$_host" ]; then
    echo "ERROR: GIT_REPO_URL is missing a host" >&2
    return 1
  fi
  if [ -n "$GIT_REPO_HOST_ALLOWLIST" ]; then
    _ok=0
    _oldifs="$IFS"
    IFS=,
    for _allowed in $GIT_REPO_HOST_ALLOWLIST; do
      [ -z "$_allowed" ] && continue
      if [ "$_host" = "$_allowed" ]; then
        _ok=1
        break
      fi
    done
    IFS="$_oldifs"
    if [ "$_ok" != 1 ]; then
      echo "ERROR: GIT_REPO_URL host $_host is not in GIT_REPO_HOST_ALLOWLIST" >&2
      return 1
    fi
  fi
  return 0
}

publish_lock_file() {
  printf '%s/.oolong-publish.lock' "$CONTENT_DIR"
}

acquire_publish_lock() {
  if ! command -v flock >/dev/null 2>&1; then
    echo "ERROR: flock is required for single-writer publication"
    return 1
  fi
  _lock="$(publish_lock_file)"
  if ! : >> "$_lock"; then
    echo "ERROR: cannot create publish lock file $_lock"
    return 1
  fi
  if ! exec 9>>"$_lock"; then
    echo "ERROR: cannot open publish lock file $_lock"
    return 1
  fi
  _waited=0
  while ! flock -n 9; do
    _waited=$((_waited + 1))
    if [ "$_waited" -ge "$PUBLISH_LOCK_WAIT_SECONDS" ]; then
      echo "ERROR: timed out waiting for publish lock"
      return 1
    fi
    sleep 1
  done
  PUBLISH_LOCK_HELD=1
  return 0
}

release_publish_lock() {
  if [ "$PUBLISH_LOCK_HELD" != 1 ]; then
    return 0
  fi
  if ! flock -u 9; then
    echo "ERROR: failed to release publish lock"
    return 1
  fi
  PUBLISH_LOCK_HELD=0
  return 0
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
    if ! rm -rf "$_dir"; then
      echo "ERROR: failed to prune $_dir"
      return 1
    fi
  done
  return 0
}

write_text_file() {
  _path="$1"
  _data="$2"
  printf '%s' "$_data" > "$_path"
}

publish_revision() {
  if ! cd "$WORK_DIR"; then
    echo "ERROR: cannot enter work directory $WORK_DIR"
    return 1
  fi
  if ! SHA="$(git rev-parse HEAD)"; then
    echo "ERROR: cannot read HEAD"
    return 1
  fi
  if [ -z "$SHA" ]; then
    echo "ERROR: HEAD is empty"
    return 1
  fi
  TARGET="$REVISIONS_DIR/$SHA"
  STAGING="$REVISIONS_DIR/.staging-$SHA"

  if revision_complete "$TARGET"; then
    echo "Revision $SHA already published"
  else
    echo "Publishing immutable revision $SHA"
    if ! rm -rf "$STAGING"; then
      echo "ERROR: failed to clear staging for $SHA"
      return 1
    fi
    if ! mkdir -p "$STAGING"; then
      echo "ERROR: failed to create staging for $SHA"
      return 1
    fi
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
    if ! write_text_file "$STAGING/$PUBLISH_COMPLETE_MARKER" "$SHA"; then
      echo "ERROR: failed to write completion marker for $SHA"
      rm -rf "$STAGING"
      return 1
    fi
    if ! revision_complete "$STAGING"; then
      echo "ERROR: published tree for $SHA is incomplete"
      rm -rf "$STAGING"
      return 1
    fi
    if [ -e "$TARGET" ] && ! rm -rf "$TARGET"; then
      echo "ERROR: failed to remove incomplete revision $SHA"
      rm -rf "$STAGING"
      return 1
    fi
    if ! mv "$STAGING" "$TARGET"; then
      echo "ERROR: failed to rename staging directory for $SHA"
      rm -rf "$STAGING"
      return 1
    fi
    if ! revision_complete "$TARGET"; then
      echo "ERROR: revision $SHA is incomplete after rename"
      return 1
    fi
  fi

  if ! write_text_file "${POINTER_FILE}.new" "$SHA"; then
    echo "ERROR: failed to write candidate pointer for $SHA"
    rm -f "${POINTER_FILE}.new"
    return 1
  fi
  if ! mv "${POINTER_FILE}.new" "$POINTER_FILE"; then
    echo "ERROR: failed to publish candidate pointer for $SHA"
    rm -f "${POINTER_FILE}.new"
    return 1
  fi
  echo "Active content revision is $SHA"
  if ! prune_old_revisions; then
    echo "ERROR: failed to prune old revisions after $SHA"
    return 1
  fi
  return 0
}
