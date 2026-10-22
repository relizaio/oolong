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

echo "test git pod template checksum changes with the ConfigMap"
RENDER_A="$(mktemp)"
RENDER_B="$(mktemp)"
helm template git-a "$CHART" \
  --set image=oolong-server:local \
  --set gitPod.enabled=true \
  --set gitPod.repoUrl='https://example.invalid/repo.git' \
  --set gitPod.revisionRetentionCount=5 > "$RENDER_A"
helm template git-b "$CHART" \
  --set image=oolong-server:local \
  --set gitPod.enabled=true \
  --set gitPod.repoUrl='https://example.invalid/repo.git' \
  --set gitPod.revisionRetentionCount=8 > "$RENDER_B"

SUM_A="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_A")"
SUM_B="$(awk '/checksum\/git-script:/ { print $2; exit }' "$RENDER_B")"
assert test -n "$SUM_A"
assert test -n "$SUM_B"
assert test "$SUM_A" != "$SUM_B"

echo "all chart render integration tests passed"
