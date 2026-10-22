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

echo "test checksum changes only when the rendered Git ConfigMap changes"
SUM_A="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_A")"
SUM_B="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_B")"
SUM_C="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_C")"
assert test -n "$SUM_A"
assert test "$SUM_A" != "$SUM_B"
assert test "$SUM_A" = "$SUM_C"

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
