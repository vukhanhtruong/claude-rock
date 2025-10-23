# Helm Chart Testing Guide

## Overview

This guide provides testing templates and commands for validating Helm charts before deployment. Always test charts with dry-run and template rendering before actual deployment.

## Testing Workflow

```
1. Helm Lint          → Validate chart structure
2. Helm Template      → Preview rendered manifests
3. Dry-run Install    → Test against cluster API
4. Kubectl Dry-run    → Final validation
5. Actual Install     → Deploy to cluster
```

## Mock Values by Workload Type

### Deployment (Web Application)

```yaml
# values-test.yaml
image:
  repository: nginx
  tag: "1.25"
  pullPolicy: IfNotPresent

replicaCount: 2

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: test.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: test-tls
      hosts:
        - test.example.com

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

livenessProbe:
  enabled: true
  path: /healthz
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  enabled: true
  path: /ready
  initialDelaySeconds: 5
  periodSeconds: 10

env:
  - name: ENVIRONMENT
    value: "test"
  - name: LOG_LEVEL
    value: "debug"
  - name: PORT
    value: "80"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 80

nodeSelector: {}
tolerations: []
affinity: {}
```

### StatefulSet (Database)

```yaml
# values-test.yaml
image:
  repository: postgres
  tag: "15"
  pullPolicy: IfNotPresent

replicaCount: 3

service:
  type: ClusterIP
  port: 5432

persistence:
  enabled: true
  storageClass: "standard"
  size: 10Gi

resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi

livenessProbe:
  enabled: true
  path: /
  initialDelaySeconds: 60
  periodSeconds: 30

readinessProbe:
  enabled: true
  path: /
  initialDelaySeconds: 10
  periodSeconds: 10

env:
  - name: POSTGRES_DB
    value: "testdb"
  - name: POSTGRES_USER
    value: "testuser"
  - name: POSTGRES_PASSWORD
    value: "testpass123"
  - name: PGDATA
    value: "/data/pgdata"

podManagementPolicy: OrderedReady

volumeMounts:
  - name: data
    mountPath: /data

nodeSelector: {}
tolerations: []
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - postgres
          topologyKey: kubernetes.io/hostname
```

### Job (Batch Processing)

```yaml
# values-test.yaml
image:
  repository: busybox
  tag: "1.36"
  pullPolicy: IfNotPresent

job:
  backoffLimit: 3
  activeDeadlineSeconds: 600
  ttlSecondsAfterFinished: 86400
  restartPolicy: OnFailure
  parallelism: 1
  completions: 1
  command:
    - /bin/sh
  args:
    - -c
    - |
      echo "Starting batch job..."
      echo "Processing data..."
      sleep 30
      echo "Job completed successfully!"

resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

env:
  - name: JOB_TYPE
    value: "batch-process"
  - name: BATCH_SIZE
    value: "1000"
  - name: OUTPUT_PATH
    value: "/output"

nodeSelector: {}
tolerations: []
```

### CronJob (Scheduled Task)

```yaml
# values-test.yaml
image:
  repository: busybox
  tag: "1.36"
  pullPolicy: IfNotPresent

cronJob:
  schedule: "*/5 * * * *"  # Every 5 minutes for testing
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  startingDeadlineSeconds: 200
  suspend: false
  backoffLimit: 2
  activeDeadlineSeconds: 300
  restartPolicy: OnFailure
  command:
    - /bin/sh
  args:
    - -c
    - |
      echo "Running scheduled task at $(date)"
      echo "Performing backup/cleanup/sync..."
      sleep 10
      echo "Task completed at $(date)"

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

env:
  - name: TASK_NAME
    value: "scheduled-backup"
  - name: RETENTION_DAYS
    value: "7"
  - name: TARGET
    value: "/backup"

nodeSelector: {}
tolerations: []
```

## Testing Commands

### 1. Validate Chart Structure

```bash
# Basic lint
helm lint my-chart

# Lint with custom values
helm lint my-chart -f values-test.yaml

# Lint with value overrides
helm lint my-chart --set image.tag=latest
```

**Expected output:**
```
==> Linting my-chart
[INFO] Chart.yaml: icon is recommended
1 chart(s) linted, 0 chart(s) failed
```

### 2. Render Templates Locally

```bash
# Render all templates
helm template my-release my-chart

# Render with test values
helm template my-release my-chart -f values-test.yaml

# Render with inline overrides
helm template my-release my-chart \
  --set image.tag=latest \
  --set replicaCount=3

# Show only specific resource
helm template my-release my-chart | grep -A 30 "kind: Deployment"

# Save rendered manifests to file
helm template my-release my-chart -f values-test.yaml > rendered.yaml

# Render for specific namespace
helm template my-release my-chart --namespace production
```

### 3. Dry-run Install

```bash
# Dry-run against cluster API (requires cluster access)
helm install my-release my-chart --dry-run --debug

# Dry-run with custom values
helm install my-release my-chart \
  --dry-run \
  --debug \
  -f values-test.yaml

# Dry-run with namespace
helm install my-release my-chart \
  --dry-run \
  --debug \
  --namespace test \
  --create-namespace
```

**Expected behavior:**
- Validates against cluster API
- Shows what would be installed
- Catches API version issues
- Does NOT create resources

### 4. Validate with Kubectl

```bash
# Validate rendered manifests
helm template my-release my-chart | kubectl apply --dry-run=client -f -

# Validate with specific values
helm template my-release my-chart -f values-test.yaml | kubectl apply --dry-run=client -f -

# Server-side dry-run (requires cluster)
helm template my-release my-chart | kubectl apply --dry-run=server -f -
```

### 5. Diff Against Existing Release

```bash
# Install helm diff plugin first
helm plugin install https://github.com/databus23/helm-diff

# Compare with existing release
helm diff upgrade my-release my-chart -f values-test.yaml

# Show only changes
helm diff upgrade my-release my-chart -f values-test.yaml --suppress-secrets
```

## Testing Checklist

### Pre-deployment Validation

- [ ] Chart passes `helm lint` without warnings
- [ ] Templates render successfully with `helm template`
- [ ] Dry-run install completes without errors
- [ ] Image names are valid and accessible
- [ ] Resource limits are appropriate
- [ ] Labels and selectors match correctly
- [ ] Health check paths are correct
- [ ] Environment variables are set
- [ ] Secrets are not in values.yaml
- [ ] Ingress hostnames are valid
- [ ] Service ports match container ports

### Workload-Specific Checks

#### Deployment
- [ ] Replica count is appropriate
- [ ] Rolling update strategy configured
- [ ] HPA settings (if enabled) are sensible
- [ ] Pod disruption budget considered

#### StatefulSet
- [ ] Persistence configuration correct
- [ ] Storage class exists
- [ ] Headless service defined
- [ ] Pod management policy appropriate
- [ ] Volume claim templates valid

#### Job
- [ ] Backoff limit reasonable
- [ ] Active deadline set
- [ ] TTL for cleanup configured
- [ ] Restart policy appropriate
- [ ] Command/args correct

#### CronJob
- [ ] Schedule syntax valid
- [ ] Concurrency policy appropriate
- [ ] History limits set
- [ ] Starting deadline configured
- [ ] Job template valid

## Common Testing Scenarios

### Test 1: Minimal Values (Defaults)

```bash
# Test with only required values
helm template test my-chart --set image.repository=nginx
```

### Test 2: Production-like Values

```bash
# Test with production configuration
helm template test my-chart -f values-prod.yaml
```

### Test 3: Multiple Environments

```bash
# Test dev environment
helm template test my-chart -f values-dev.yaml

# Test staging environment  
helm template test my-chart -f values-staging.yaml

# Test production environment
helm template test my-chart -f values-prod.yaml
```

### Test 4: Value Overrides

```bash
# Test with inline overrides
helm template test my-chart \
  --set image.tag=v2.0.0 \
  --set replicaCount=5 \
  --set ingress.enabled=true
```

### Test 5: Resource Validation

```bash
# Check resource limits
helm template test my-chart | grep -A 5 "resources:"

# Check security contexts
helm template test my-chart | grep -A 10 "securityContext:"

# Check probes
helm template test my-chart | grep -A 5 "Probe:"
```

## Troubleshooting

### Issue: Template rendering fails

```bash
# Debug with verbose output
helm template test my-chart --debug

# Check specific template
helm template test my-chart --show-only templates/deployment.yaml
```

### Issue: Validation errors

```bash
# Validate individual resources
helm template test my-chart | kubectl apply --dry-run=client -f - --validate=strict

# Check for deprecated APIs
helm template test my-chart | kubectl apply --dry-run=server -f -
```

### Issue: Values not applied

```bash
# Verify values are loaded
helm template test my-chart -f values-test.yaml --debug | grep -A 5 "USER-SUPPLIED VALUES"

# Check final computed values
helm template test my-chart -f values-test.yaml --debug | grep -A 20 "COMPUTED VALUES"
```

## Best Practices

1. **Always test before deploying** - Use dry-run and template rendering
2. **Use realistic test data** - Mock values should resemble production
3. **Test all environments** - Validate dev, staging, prod configurations
4. **Validate security** - Check security contexts and RBAC
5. **Check resource limits** - Ensure requests/limits are appropriate
6. **Test failure scenarios** - Invalid values, missing fields
7. **Document test process** - Share testing commands with team
8. **Automate testing** - Include in CI/CD pipeline

## Automated Testing Example

```bash
#!/bin/bash
# test-chart.sh

set -e

CHART_DIR="my-chart"
VALUES_FILE="values-test.yaml"

echo "Testing Helm chart: $CHART_DIR"

# Test 1: Lint
echo "1. Running helm lint..."
helm lint $CHART_DIR -f $VALUES_FILE

# Test 2: Template rendering
echo "2. Rendering templates..."
helm template test $CHART_DIR -f $VALUES_FILE > /tmp/rendered.yaml

# Test 3: Kubectl validation
echo "3. Validating with kubectl..."
kubectl apply --dry-run=client -f /tmp/rendered.yaml

# Test 4: Check for secrets in values
echo "4. Checking for secrets in values..."
if grep -i "password\|secret\|token" $VALUES_FILE; then
  echo "WARNING: Potential secrets found in values file!"
fi

echo "✅ All tests passed!"
```

## Summary

Always follow this testing sequence:
1. **Lint** the chart structure
2. **Render** templates to preview
3. **Dry-run** to validate against API
4. **Review** rendered manifests
5. **Deploy** to test environment first
6. **Monitor** after deployment

Never skip testing, even for "small changes"!
