# Helm Chart Examples

Real-world chart examples for common use cases.

## Example 1: Simple Web Application

**Scenario**: Node.js API microservice

**Chart.yaml**:
```yaml
apiVersion: v2
name: user-api
description: User management API service
type: application
version: 0.1.0
appVersion: "1.0.0"
```

**values.yaml** (key sections):
```yaml
replicaCount: 2

image:
  repository: myorg/user-api
  tag: "1.0.0"

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.example.com
      paths:
        - path: /users
          pathType: Prefix

resources:
  limits: {cpu: 500m, memory: 256Mi}
  requests: {cpu: 100m, memory: 128Mi}

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

**Usage**:
```bash
helm install user-api . -n production
```

---

## Example 2: Database (StatefulSet)

**Scenario**: PostgreSQL with persistent storage

**Chart.yaml**:
```yaml
apiVersion: v2
name: postgresql
description: PostgreSQL database
type: application
version: 0.1.0
appVersion: "15"
```

**values.yaml** (key sections):
```yaml
replicaCount: 1

image:
  repository: postgres
  tag: "15"

persistence:
  enabled: true
  storageClass: "standard"
  accessMode: ReadWriteOnce
  size: 20Gi

resources:
  limits: {cpu: 1000m, memory: 2Gi}
  requests: {cpu: 250m, memory: 512Mi}

env:
  - name: POSTGRES_DB
    value: myapp
  - name: POSTGRES_USER
    value: postgres
  - name: POSTGRES_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: password
```

**StatefulSet template** (key parts):
```yaml
spec:
  serviceName: postgresql-headless
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard
      resources:
        requests:
          storage: 20Gi
```

---

## Example 3: Scheduled Job (CronJob)

**Scenario**: Nightly database backup

**Chart.yaml**:
```yaml
apiVersion: v2
name: db-backup
description: Automated database backup job
type: application
version: 0.1.0
appVersion: "1.0.0"
```

**values.yaml** (key sections):
```yaml
cronjob:
  schedule: "0 2 * * *"  # 2 AM daily
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid

image:
  repository: myorg/backup-tool
  tag: "latest"

resources:
  limits: {cpu: 500m, memory: 512Mi}
  requests: {cpu: 100m, memory: 128Mi}

env:
  - name: BACKUP_RETENTION_DAYS
    value: "30"
  - name: S3_BUCKET
    value: "my-backups"
```

---

## Example 4: Multi-Environment Configuration

**Scenario**: Application deployed to dev, staging, prod

**values.yaml** (base):
```yaml
replicaCount: 1

image:
  repository: myorg/myapp
  tag: ""

resources:
  limits: {cpu: 500m, memory: 256Mi}
  requests: {cpu: 50m, memory: 64Mi}

env:
  - name: LOG_LEVEL
    value: "info"
```

**values-dev.yaml**:
```yaml
replicaCount: 1

image:
  tag: "dev"

resources:
  limits: {cpu: 200m, memory: 128Mi}
  requests: {cpu: 25m, memory: 32Mi}

env:
  - name: LOG_LEVEL
    value: "debug"
  - name: DEBUG
    value: "true"

ingress:
  enabled: true
  hosts:
    - host: dev.myapp.example.com
```

**values-prod.yaml**:
```yaml
replicaCount: 3

image:
  tag: "1.0.0"

resources:
  limits: {cpu: 1000m, memory: 512Mi}
  requests: {cpu: 100m, memory: 128Mi}

env:
  - name: LOG_LEVEL
    value: "warn"

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values: [myapp]
        topologyKey: kubernetes.io/hostname

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: myapp.example.com
  tls:
    - secretName: myapp-tls
      hosts:
        - myapp.example.com
```

**Deployment commands**:
```bash
# Development
helm install myapp . -f values-dev.yaml -n dev

# Production
helm install myapp . -f values-prod.yaml -n production
```

---

## Example 5: Converting Manifest to Helm

**Original Kubernetes manifest**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: myorg/frontend:1.0.0
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: "500m"
            memory: "256Mi"
```

**Converted Helm template** (deployment.yaml):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "frontend.fullname" . }}
  labels:
    {{- include "frontend.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "frontend.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "frontend.labels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        ports:
        - name: http
          containerPort: {{ .Values.service.targetPort }}
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
```

**Extracted values.yaml**:
```yaml
replicaCount: 2

image:
  repository: myorg/frontend
  tag: "1.0.0"

service:
  targetPort: 8080

resources:
  limits:
    cpu: 500m
    memory: 256Mi
```

**What was parameterized**:
- Replica count → `.Values.replicaCount`
- Image name/tag → `.Values.image.*`
- Port → `.Values.service.targetPort`
- Resources → `.Values.resources`
- Labels → Helper templates
- Resource name → Template function

---

## Example 6: Organizational Standard Template

**Scenario**: Platform team creates standard chart for all services

**Required organizational standards**:
- All services must have cost center label
- Security scanning required
- Must use org-wide naming convention
- Mandatory resource limits
- Required network policies

**Modified _helpers.tpl**:
```yaml
{{- define "org.labels" -}}
app.kubernetes.io/name: {{ include "chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
org.example.com/cost-center: {{ .Values.org.costCenter | required "Cost center is required" }}
org.example.com/team: {{ .Values.org.team | required "Team name is required" }}
org.example.com/security-scan: "required"
{{- end }}
```

**Required values**:
```yaml
org:
  costCenter: ""  # MUST be provided
  team: ""        # MUST be provided

# Resource limits are mandatory
resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 64Mi

# Security context is required
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  capabilities:
    drop: [ALL]
```

**Usage**:
```bash
helm install myapp . \
  --set org.costCenter=eng-001 \
  --set org.team=platform
```

---

## Example 7: With Subchart Dependency

**Scenario**: Application that needs PostgreSQL database

**Chart.yaml**:
```yaml
apiVersion: v2
name: myapp
version: 0.1.0
appVersion: "1.0.0"

dependencies:
  - name: postgresql
    version: "12.1.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

**values.yaml**:
```yaml
# Application values
replicaCount: 2
image:
  repository: myorg/myapp
  tag: "1.0.0"

# Subchart values
postgresql:
  enabled: true
  auth:
    database: myapp
    username: myapp
  primary:
    persistence:
      size: 10Gi
```

**Install**:
```bash
# Download dependencies
helm dependency update

# Install with subchart
helm install myapp .
```

---

## Common Patterns

### ConfigMap from Files
```yaml
# values.yaml
config:
  app.conf: |
    server_port=8080
    log_level=info
  db.conf: |
    host=postgres
    port=5432

# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "app.fullname" . }}
data:
  {{- range $key, $value := .Values.config }}
  {{ $key }}: |
    {{- $value | nindent 4 }}
  {{- end }}
```

### External Secret Reference
```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: {{ .Values.externalSecret.name }}
        key: password
```

### Horizontal Pod Autoscaler
```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "app.fullname" . }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "app.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
{{- end }}
```

These examples demonstrate common patterns and can be adapted for specific use cases.
