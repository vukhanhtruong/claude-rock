# Helm Chart Best Practices

CNCF and Helm community standards for production-ready charts.

## Chart Metadata Standards

### Chart.yaml Requirements
- `apiVersion: v2` (Helm 3)
- Semantic versioning (version, appVersion)
- Meaningful description
- Keywords for discoverability
- Maintainer information

### Naming Conventions
- Chart names: lowercase, hyphens (no underscores)
- Resource names: `{{ template "name.fullname" . }}`
- Avoid hardcoding names

## Kubernetes Label Standards

**Required labels (app.kubernetes.io/* namespace):**
```yaml
labels:
  app.kubernetes.io/name: {{ include "chart.name" . }}
  app.kubernetes.io/instance: {{ .Release.Name }}
  app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
  app.kubernetes.io/managed-by: {{ .Release.Service }}
  helm.sh/chart: {{ include "chart.chart" . }}
```

**Selector labels (must be immutable):**
```yaml
selector:
  matchLabels:
    app.kubernetes.io/name: {{ include "chart.name" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
```

## Security Best Practices

### Pod Security Context
```yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault  # Production
```

### Container Security Context
```yaml
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  capabilities:
    drop:
    - ALL
```

### Security Guidelines
- Never run as root (UID 0)
- Drop all Linux capabilities by default
- Use read-only root filesystem when possible
- Apply seccomp profiles in production
- Avoid privileged containers
- Don't expose host ports or namespaces

## Resource Management

### Always Define Resources
```yaml
resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 64Mi
```

### Resource Sizing Guidelines
- **Small apps**: 50m CPU / 64Mi memory (requests)
- **Medium apps**: 100m CPU / 128Mi memory (requests)
- **Large apps**: 250m+ CPU / 256Mi+ memory (requests)
- Limits should be 2-10x requests
- Monitor and adjust based on actual usage

## Health Checks

### Liveness Probe
Detects when container needs restart:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe
Detects when container can accept traffic:
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: http
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Probe Best Practices
- Always define both liveness and readiness
- Use appropriate initialDelaySeconds for slow-starting apps
- Health endpoints should be lightweight
- Don't use same endpoint for liveness and readiness if startup is slow

## Values.yaml Organization

### Structure
```yaml
# 1. Replica configuration
replicaCount: 1

# 2. Image configuration
image:
  repository: example/app
  pullPolicy: IfNotPresent
  tag: ""  # Defaults to Chart.appVersion

# 3. Service account
serviceAccount:
  create: true
  name: ""

# 4. Security contexts
podSecurityContext: {}
securityContext: {}

# 5. Service configuration
service:
  type: ClusterIP
  port: 80

# 6. Resources
resources: {}

# 7. Autoscaling
autoscaling:
  enabled: false

# 8. Additional features (Ingress, ConfigMaps, etc.)
```

### Documentation
- Comment every major section
- Provide examples for complex values
- Document accepted value types
- Explain default behavior

## Template Best Practices

### Use Helper Functions
```yaml
# _helpers.tpl
{{- define "app.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}
```

### Conditional Resources
```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
...
{{- end }}
```

### Checksum Annotations
Force pod restart on config changes:
```yaml
annotations:
  checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
```

## NOTES.txt Guidelines

Provide clear post-installation instructions:
```
1. How to access the application
2. Default credentials (if any)
3. Next steps for configuration
4. Links to documentation
5. Troubleshooting commands
```

## Multi-Environment Patterns

### Base + Override Pattern
- `values.yaml`: Base defaults
- `values-dev.yaml`: Development overrides
- `values-prod.yaml`: Production overrides

### Environment-Specific Settings
- **Dev**: Debug enabled, minimal resources, verbose logging
- **Staging**: Production-like, moderate resources
- **Prod**: HA, autoscaling, security hardening, monitoring

## Common Pitfalls to Avoid

❌ **Don't:**
- Hardcode values in templates
- Forget resource limits
- Run containers as root
- Skip health checks
- Use `latest` image tag
- Expose secrets in values.yaml
- Create resources without labels
- Ignore security contexts

✅ **Do:**
- Use template functions
- Define all resources
- Use non-root users
- Configure probes
- Pin specific versions
- Reference external secrets
- Apply standard labels
- Enable security contexts

## Testing Checklist

Before deploying:
- [ ] `helm lint` passes
- [ ] `helm template` renders correctly
- [ ] All required labels present
- [ ] Security contexts configured
- [ ] Resource limits defined
- [ ] Health checks configured
- [ ] NOTES.txt provides clear instructions
- [ ] README documents all values
- [ ] Dry run succeeds
- [ ] Test deployment in dev environment

## Validation Commands

```bash
# Lint chart
helm lint .

# Template rendering
helm template myrelease .

# Dry run
helm install myrelease . --dry-run --debug

# Install to test namespace
kubectl create ns test
helm install myrelease . -n test

# Verify
kubectl get all -n test
helm test myrelease -n test

# Cleanup
helm uninstall myrelease -n test
kubectl delete ns test
```

## References

- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Kubernetes Labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
- [CNCF Security Whitepaper](https://github.com/cncf/tag-security)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
