# Helm Chart Templates

Complete template library. Load sections as needed. {{ CN }} = {{ CHART_NAME }} (abbreviated).

## Chart.yaml
```yaml
apiVersion: v2
name: {{ CHART_NAME }}
description: A Helm chart for {{ APP_DESCRIPTION }}
type: application
version: 0.1.0
appVersion: "1.0.0"
```

## values.yaml
```yaml
replicaCount: 1
image:
  repository: {{ IMAGE_REPO }}
  pullPolicy: IfNotPresent
  tag: "{{ IMAGE_TAG }}"
serviceAccount:
  create: true
  automount: true
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: [ALL]
service:
  type: ClusterIP
  port: {{ SERVICE_PORT }}
  targetPort: {{ CONTAINER_PORT }}
resources:
  limits: {cpu: 500m, memory: 256Mi}
  requests: {cpu: 50m, memory: 64Mi}
livenessProbe:
  httpGet: {path: /health, port: http}
  initialDelaySeconds: 30
readinessProbe:
  httpGet: {path: /ready, port: http}
  initialDelaySeconds: 5
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## _helpers.tpl
```yaml
{{- define "{{ CN }}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "{{ CN }}.fullname" -}}
{{- if .Values.fullnameOverride }}{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}{{- end }}{{- end }}{{- end }}

{{- define "{{ CN }}.labels" -}}
helm.sh/chart: {{ include "{{ CN }}.chart" . }}
{{ include "{{ CN }}.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "{{ CN }}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "{{ CN }}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "{{ CN }}.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}{{- default (include "{{ CN }}.fullname" .) .Values.serviceAccount.name }}
{{- else }}{{- default "default" .Values.serviceAccount.name }}{{- end }}{{- end }}
```

## Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}replicas: {{ .Values.replicaCount }}{{- end }}
  selector:
    matchLabels: {{- include "{{ CN }}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "{{ CN }}.labels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "{{ CN }}.serviceAccountName" . }}
      securityContext: {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
      - name: {{ .Chart.Name }}
        securityContext: {{- toYaml .Values.securityContext | nindent 12 }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.targetPort }}
        livenessProbe: {{- toYaml .Values.livenessProbe | nindent 12 }}
        readinessProbe: {{- toYaml .Values.readinessProbe | nindent 12 }}
        resources: {{- toYaml .Values.resources | nindent 12 }}
```

## StatefulSet
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
spec:
  serviceName: {{ include "{{ CN }}.fullname" . }}-headless
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels: {{- include "{{ CN }}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels: {{- include "{{ CN }}.labels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "{{ CN }}.serviceAccountName" . }}
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata: {name: data}
    spec:
      accessModes: [{{ .Values.persistence.accessMode | quote }}]
      storageClassName: {{ .Values.persistence.storageClass | quote }}
      resources:
        requests:
          storage: {{ .Values.persistence.size | quote }}
```
Add to values: `persistence: {storageClass: standard, accessMode: ReadWriteOnce, size: 10Gi}`

## Job
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
spec:
  backoffLimit: {{ .Values.job.backoffLimit | default 3 }}
  completions: {{ .Values.job.completions | default 1 }}
  template:
    metadata:
      labels: {{- include "{{ CN }}.labels" . | nindent 8 }}
    spec:
      restartPolicy: OnFailure
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```
Add to values: `job: {backoffLimit: 3, completions: 1, parallelism: 1}`

## CronJob
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
spec:
  schedule: {{ .Values.cronjob.schedule | quote }}
  successfulJobsHistoryLimit: {{ .Values.cronjob.successfulJobsHistoryLimit | default 3 }}
  failedJobsHistoryLimit: {{ .Values.cronjob.failedJobsHistoryLimit | default 1 }}
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: {{ .Chart.Name }}
            image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```
Add to values: `cronjob: {schedule: "0 2 * * *", successfulJobsHistoryLimit: 3, failedJobsHistoryLimit: 1}`

## Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
  - port: {{ .Values.service.port }}
    targetPort: http
    name: http
  selector: {{- include "{{ CN }}.selectorLabels" . | nindent 4 }}
```

## ServiceAccount
```yaml
{{- if .Values.serviceAccount.create -}}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "{{ CN }}.serviceAccountName" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
automountServiceAccountToken: {{ .Values.serviceAccount.automount }}
{{- end }}
```

## Ingress
```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
  labels: {{- include "{{ CN }}.labels" . | nindent 4 }}
spec:
  {{- if .Values.ingress.className }}ingressClassName: {{ .Values.ingress.className }}{{- end }}
  rules:
  {{- range .Values.ingress.hosts }}
  - host: {{ .host | quote }}
    http:
      paths:
      {{- range .paths }}
      - path: {{ .path }}
        pathType: {{ .pathType }}
        backend:
          service: {name: {{ include "{{ CN }}.fullname" $ }}, port: {number: {{ $.Values.service.port }}}}
      {{- end }}
  {{- end }}
{{- end }}
```

## HPA
```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "{{ CN }}.fullname" . }}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: {{ include "{{ CN }}.fullname" . }}}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
  - type: Resource
    resource: {name: cpu, target: {type: Utilization, averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}}}
{{- end }}
```

## NOTES.txt
```
Thank you for installing {{ .Chart.Name }}!
Release: {{ .Release.Name }}
{{- if .Values.ingress.enabled }}
URL: http{{ if $.Values.ingress.tls }}s{{ end }}://{{ (index .Values.ingress.hosts 0).host }}
{{- else }}
Port forward: kubectl port-forward svc/{{ include "{{ CN }}.fullname" . }} {{ .Values.service.port }}
{{- end }}
```

## .helmignore
```
.DS_Store
.git/
*.swp
.idea/
.vscode/
```

## README.md
```markdown
# {{ CHART_NAME }}

## Installation
helm install {{ CN }} .

## Testing
helm lint .
helm template {{ CN }} .
helm install {{ CN }} . --dry-run
```

## Environment Values

values-dev.yaml:
```yaml
replicaCount: 1
resources: {limits: {cpu: 200m, memory: 128Mi}, requests: {cpu: 25m, memory: 32Mi}}
```

values-prod.yaml:
```yaml
replicaCount: 3
resources: {limits: {cpu: 1000m, memory: 512Mi}, requests: {cpu: 100m, memory: 128Mi}}
autoscaling: {enabled: true, minReplicas: 3, maxReplicas: 10}
```
