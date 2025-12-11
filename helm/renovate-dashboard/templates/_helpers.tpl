{{/*
Expand the name of the chart.
*/}}
{{- define "renovate-dashboard.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "renovate-dashboard.fullname" -}}
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
{{- define "renovate-dashboard.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "renovate-dashboard.labels" -}}
helm.sh/chart: {{ include "renovate-dashboard.chart" . }}
{{ include "renovate-dashboard.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "renovate-dashboard.selectorLabels" -}}
app.kubernetes.io/name: {{ include "renovate-dashboard.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "renovate-dashboard.frontend.labels" -}}
{{ include "renovate-dashboard.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "renovate-dashboard.frontend.selectorLabels" -}}
{{ include "renovate-dashboard.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Backend labels
*/}}
{{- define "renovate-dashboard.backend.labels" -}}
{{ include "renovate-dashboard.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "renovate-dashboard.backend.selectorLabels" -}}
{{ include "renovate-dashboard.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
PostgreSQL labels
*/}}
{{- define "renovate-dashboard.postgresql.labels" -}}
{{ include "renovate-dashboard.labels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "renovate-dashboard.postgresql.selectorLabels" -}}
{{ include "renovate-dashboard.selectorLabels" . }}
app.kubernetes.io/component: postgresql
{{- end }}

{{/*
Redis labels
*/}}
{{- define "renovate-dashboard.redis.labels" -}}
{{ include "renovate-dashboard.labels" . }}
app.kubernetes.io/component: redis
{{- end }}

{{/*
Redis selector labels
*/}}
{{- define "renovate-dashboard.redis.selectorLabels" -}}
{{ include "renovate-dashboard.selectorLabels" . }}
app.kubernetes.io/component: redis
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "renovate-dashboard.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "renovate-dashboard.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the proper image name for frontend
*/}}
{{- define "renovate-dashboard.frontend.image" -}}
{{- $registryName := .Values.imageRegistry -}}
{{- $repositoryName := .Values.frontend.image.repository -}}
{{- $tag := .Values.frontend.image.tag | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else }}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end }}
{{- end }}

{{/*
Return the proper image name for backend
*/}}
{{- define "renovate-dashboard.backend.image" -}}
{{- $registryName := .Values.imageRegistry -}}
{{- $repositoryName := .Values.backend.image.repository -}}
{{- $tag := .Values.backend.image.tag | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else }}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end }}
{{- end }}

{{/*
Return the proper image name for postgresql
*/}}
{{- define "renovate-dashboard.postgresql.image" -}}
{{- $registryName := .Values.imageRegistry -}}
{{- $repositoryName := .Values.postgresql.image.repository -}}
{{- $tag := .Values.postgresql.image.tag | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else }}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end }}
{{- end }}

{{/*
Return the proper image name for redis
*/}}
{{- define "renovate-dashboard.redis.image" -}}
{{- $registryName := .Values.imageRegistry -}}
{{- $repositoryName := .Values.redis.image.repository -}}
{{- $tag := .Values.redis.image.tag | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else }}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end }}
{{- end }}

{{/*
Return the PostgreSQL hostname
*/}}
{{- define "renovate-dashboard.postgresql.host" -}}
{{- printf "%s-postgresql" (include "renovate-dashboard.fullname" .) -}}
{{- end }}

{{/*
Return the PostgreSQL port
*/}}
{{- define "renovate-dashboard.postgresql.port" -}}
{{- .Values.postgresql.service.port | toString -}}
{{- end }}

{{/*
Return the PostgreSQL database name
*/}}
{{- define "renovate-dashboard.postgresql.database" -}}
{{- .Values.postgresql.auth.database -}}
{{- end }}

{{/*
Return the Redis hostname
*/}}
{{- define "renovate-dashboard.redis.host" -}}
{{- printf "%s-redis" (include "renovate-dashboard.fullname" .) -}}
{{- end }}

{{/*
Return the Redis port
*/}}
{{- define "renovate-dashboard.redis.port" -}}
{{- .Values.redis.service.port | toString -}}
{{- end }}

{{/*
Return the PostgreSQL secret name
*/}}
{{- define "renovate-dashboard.postgresql.secretName" -}}
{{- if .Values.postgresql.auth.existingSecret }}
{{- .Values.postgresql.auth.existingSecret }}
{{- else }}
{{- printf "%s-postgresql" (include "renovate-dashboard.fullname" .) -}}
{{- end }}
{{- end }}

{{/*
Return the Redis secret name
*/}}
{{- define "renovate-dashboard.redis.secretName" -}}
{{- if .Values.redis.auth.existingSecret }}
{{- .Values.redis.auth.existingSecret }}
{{- else }}
{{- printf "%s-redis" (include "renovate-dashboard.fullname" .) -}}
{{- end }}
{{- end }}

{{/*
Return the Backend secret name
*/}}
{{- define "renovate-dashboard.backend.secretName" -}}
{{- printf "%s-backend" (include "renovate-dashboard.fullname" .) -}}
{{- end }}

{{/*
Return the GitHub secret name
*/}}
{{- define "renovate-dashboard.github.secretName" -}}
{{- if .Values.backend.github.existingSecret }}
{{- .Values.backend.github.existingSecret }}
{{- else }}
{{- printf "%s-github" (include "renovate-dashboard.fullname" .) -}}
{{- end }}
{{- end }}

{{/*
Return the Session secret name
*/}}
{{- define "renovate-dashboard.session.secretName" -}}
{{- if .Values.backend.session.existingSecret }}
{{- .Values.backend.session.existingSecret }}
{{- else }}
{{- printf "%s-session" (include "renovate-dashboard.fullname" .) -}}
{{- end }}
{{- end }}

{{/*
Return the Database URL
*/}}
{{- define "renovate-dashboard.databaseUrl" -}}
{{- $host := include "renovate-dashboard.postgresql.host" . -}}
{{- $port := include "renovate-dashboard.postgresql.port" . -}}
{{- $database := include "renovate-dashboard.postgresql.database" . -}}
{{- printf "postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@%s:%s/%s" $host $port $database -}}
{{- end }}

{{/*
Return the Redis URL
*/}}
{{- define "renovate-dashboard.redisUrl" -}}
{{- $host := include "renovate-dashboard.redis.host" . -}}
{{- $port := include "renovate-dashboard.redis.port" . -}}
{{- if .Values.redis.auth.enabled }}
{{- printf "redis://:$(REDIS_PASSWORD)@%s:%s" $host $port -}}
{{- else }}
{{- printf "redis://%s:%s" $host $port -}}
{{- end }}
{{- end }}

{{/*
Return the Frontend URL
*/}}
{{- define "renovate-dashboard.frontendUrl" -}}
{{- if .Values.ingress.enabled }}
{{- $host := (index .Values.ingress.hosts 0).host -}}
{{- if .Values.ingress.tls }}
{{- printf "https://%s" $host -}}
{{- else }}
{{- printf "http://%s" $host -}}
{{- end }}
{{- else }}
{{- printf "http://%s-frontend:%d" (include "renovate-dashboard.fullname" .) (int .Values.frontend.service.port) -}}
{{- end }}
{{- end }}

