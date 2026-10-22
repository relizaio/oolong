#!/bin/sh
# Render checks for image contract and Git pod checksum rollouts.
set -e

CHART="$(cd "$(dirname "$0")/.." && pwd)"

assert() {
  if ! "$@"; then
    echo "ASSERT FAILED: $*"
    exit 1
  fi
}

if ! command -v helm >/dev/null 2>&1; then
  echo "helm is required for chart render tests"
  exit 1
fi

echo "test helm template requires a compatible image"
if helm template missing-image "$CHART" >/tmp/oolong-helm-empty.out 2>&1; then
  echo "ASSERT FAILED: helm template without image should fail"
  exit 1
fi

echo "test helm lint accepts a compatible image"
helm lint "$CHART" --set image=oolong-server:local >/dev/null

echo "test published 25.10.6 image is rejected"
if helm template reject-old "$CHART" \
  --set image='registry.relizahub.com/library/oolong-server:25.10.6@sha256:23718baf897d31a780b18b3d910b06407c9cddb64c7e3e7df68944ef1092235b' \
  >/tmp/oolong-helm-old.out 2>&1; then
  echo "ASSERT FAILED: helm template should reject 25.10.6"
  exit 1
fi

echo "test persistence=false does not emit an empty volume"
RENDER_STATIC="$(mktemp)"
helm template static "$CHART" \
  --set image=oolong-server:local \
  --set persistence.enabled=false > "$RENDER_STATIC"
if grep -q 'name: oolong-content' "$RENDER_STATIC"; then
  echo "ASSERT FAILED: persistence=false still references oolong-content"
  exit 1
fi

echo "test git deployment recreates instead of rolling two publishers"
RENDER_A="$(mktemp)"
RENDER_B="$(mktemp)"
RENDER_C="$(mktemp)"
COMMON_ARGS="--namespace oolong --set image=oolong-server:local --set gitPod.enabled=true --set gitPod.repoUrl=https://example.invalid/repo.git"
# shellcheck disable=SC2086
helm template oolong "$CHART" $COMMON_ARGS \
  --set gitPod.revisionRetentionCount=5 > "$RENDER_A"
# shellcheck disable=SC2086
helm template oolong "$CHART" $COMMON_ARGS \
  --set gitPod.revisionRetentionCount=8 > "$RENDER_B"
# shellcheck disable=SC2086
helm template oolong "$CHART" $COMMON_ARGS \
  --set gitPod.revisionRetentionCount=5 > "$RENDER_C"

GIT_STRATEGY="$(awk '
  $1 == "kind:" && $2 == "Deployment" { dep=1; name=""; strategy="" }
  dep && $1 == "name:" && name == "" { name=$2 }
  dep && $1 == "type:" && strategy == "" { strategy=$2 }
  dep && $0 == "---" {
    if (name == "oolong-git") print strategy
    dep=0
  }
  END {
    if (dep && name == "oolong-git") print strategy
  }
' "$RENDER_A")"
SERVER_STRATEGY="$(awk '
  $1 == "kind:" && $2 == "Deployment" { dep=1; name=""; strategy="" }
  dep && $1 == "name:" && name == "" { name=$2 }
  dep && $1 == "type:" && strategy == "" { strategy=$2 }
  dep && $0 == "---" {
    if (name == "oolong") print strategy
    dep=0
  }
  END {
    if (dep && name == "oolong") print strategy
  }
' "$RENDER_A")"
assert test "$GIT_STRATEGY" = "Recreate"
assert test "$SERVER_STRATEGY" != "Recreate"

echo "test retention is an env var and is not interpolated into git-sync.sh"
assert grep -q 'name: REVISION_RETENTION_COUNT' "$RENDER_A"
assert grep -q 'value: "5"' "$RENDER_A"
assert grep -q 'value: "8"' "$RENDER_B"
if grep -q 'REVISION_RETENTION_COUNT:-{{' "$RENDER_A"; then
  echo "ASSERT FAILED: Helm interpolated retention into git-sync.sh"
  exit 1
fi
if grep -F '$( ' "$RENDER_A" | grep -q REVISION; then
  echo "ASSERT FAILED: retention env contains shell substitution"
  exit 1
fi

echo "test server and git selectors do not overlap"
assert grep -q 'app.kubernetes.io/component: server' "$RENDER_A"
assert grep -q 'app.kubernetes.io/component: git' "$RENDER_A"
python3 - "$RENDER_A" <<'PY'
import sys
text = open(sys.argv[1], encoding="utf-8").read()
assert "app.kubernetes.io/component: server" in text
assert "app.kubernetes.io/component: git" in text
# Service selector must pin the server component so Git pods are excluded.
svc = text.split("kind: Service", 1)[1].split("kind:", 1)[0]
assert "app.kubernetes.io/component: server" in svc
assert "app.kubernetes.io/component: git" not in svc
print("selector split ok")
PY

echo "test checksum is stable when only retention changes"
SUM_A="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_A")"
SUM_B="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_B")"
SUM_C="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_C")"
assert test -n "$SUM_A"
assert test "$SUM_A" = "$SUM_B"
assert test "$SUM_A" = "$SUM_C"

echo "test helm schema rejects a command-substitution retention value without executing it"
PWN_MARK="$(mktemp)"
rm -f "$PWN_MARK"
INJECT='$(touch '"$PWN_MARK"'; echo 5)'
if helm template inject "$CHART" \
    --set image=oolong-server:local \
    --set gitPod.enabled=true \
    --set gitPod.repoUrl=https://example.invalid/repo.git \
    --set gitPod.revisionRetentionCount="$INJECT" \
    >/tmp/oolong-helm-inject.out 2>&1; then
  echo "ASSERT FAILED: helm template accepted \$(...) retention"
  exit 1
fi
if [ -e "$PWN_MARK" ]; then
  echo "ASSERT FAILED: \$(...) ran during helm template"
  exit 1
fi

echo "test helm schema rejects out-of-range retention"
if helm template range "$CHART" \
    --set image=oolong-server:local \
    --set gitPod.enabled=true \
    --set gitPod.repoUrl=https://example.invalid/repo.git \
    --set gitPod.revisionRetentionCount=0 \
    >/tmp/oolong-helm-range.out 2>&1; then
  echo "ASSERT FAILED: helm template accepted retention 0"
  exit 1
fi

echo "test non-https gitPod.repoUrl is rejected"
if helm template badurl "$CHART" \
    --set image=oolong-server:local \
    --set gitPod.enabled=true \
    --set gitPod.repoUrl='http://example.invalid/repo.git' \
    >/tmp/oolong-helm-url.out 2>&1; then
  echo "ASSERT FAILED: helm template accepted http:// repoUrl"
  exit 1
fi

SCRIPT_CHART="$(mktemp -d)"
cp -R "$CHART/." "$SCRIPT_CHART/"
printf '\n# checksum probe\n' >> "$SCRIPT_CHART/scripts/git-publish.inc.sh"
RENDER_SCRIPT="$(mktemp)"
# shellcheck disable=SC2086
helm template oolong "$SCRIPT_CHART" $COMMON_ARGS \
  --set gitPod.revisionRetentionCount=5 > "$RENDER_SCRIPT"
SUM_SCRIPT="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_SCRIPT")"
assert test -n "$SUM_SCRIPT"
assert test "$SUM_A" != "$SUM_SCRIPT"
rm -rf "$SCRIPT_CHART"

echo "all chart render integration tests passed"
