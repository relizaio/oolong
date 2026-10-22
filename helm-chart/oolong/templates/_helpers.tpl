{{/*
Expand the name of the chart.
*/}}
{{- define "oolong.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "oolong.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "oolong.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "oolong.labels" -}}
helm.sh/chart: {{ include "oolong.chart" . }}
{{ include "oolong.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "oolong.selectorLabels" -}}
app.kubernetes.io/name: {{ include "oolong.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Server pods only. Must not match the Git Deployment, or kubectl logs/exec
and the Service will treat Git pods as server replicas.
*/}}
{{- define "oolong.serverSelectorLabels" -}}
{{ include "oolong.selectorLabels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Git publisher pods only.
*/}}
{{- define "oolong.gitSelectorLabels" -}}
{{ include "oolong.selectorLabels" . }}
app.kubernetes.io/component: git
{{- end }}

{{/*
Public HTTPS remotes only. Local file remotes stay in tests that call
sync_worktree directly, not the Git pod entrypoint.
*/}}
{{- define "oolong.requireGitRepoUrl" -}}
{{- if not .Values.gitPod.repoUrl }}
{{- fail "gitPod.repoUrl is required when gitPod.enabled is true" }}
{{- end }}
{{- if not (hasPrefix "https://" .Values.gitPod.repoUrl) }}
{{- fail "gitPod.repoUrl must be an https:// URL. The Git pod disables git://, ssh://, http://, and file://." }}
{{- end }}
{{- end }}

{{/*
Kubernetes Secret name for pagination HMAC signing.
*/}}
{{- define "oolong.pageTokenSecretName" -}}
{{- if .Values.pageTokenSecret.existingSecret -}}
{{- .Values.pageTokenSecret.existingSecret -}}
{{- else -}}
{{- printf "%s-page-token" (include "oolong.fullname" .) -}}
{{- end -}}
{{- end -}}

{{/*
Fail fast when the chart is not allowed to create a secret and none was named.
*/}}
{{- define "oolong.requirePageTokenSecret" -}}
{{- if not .Values.pageTokenSecret.create -}}
{{- if not .Values.pageTokenSecret.existingSecret -}}
{{- fail "pageTokenSecret.existingSecret is required when pageTokenSecret.create is false" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
This chart's probes and git snapshot loader are not in the published 25.10.6 image.
Fail closed until a compatible image is set explicitly.
*/}}
{{- define "oolong.requireCompatibleImage" -}}
{{- if not .Values.image -}}
{{- fail "image is required. The published 25.10.6 image is incompatible with this chart (/healthz and git snapshot reload). Set --set image=<compatible-image>, for example oolong-server:local." -}}
{{- end -}}
{{- if contains "oolong-server:25.10.6" .Values.image -}}
{{- fail "image 25.10.6 is incompatible with this chart: it does not implement /healthz or git snapshot reload. Set --set image=<compatible-image> built from this branch." -}}
{{- end -}}
{{- end -}}
