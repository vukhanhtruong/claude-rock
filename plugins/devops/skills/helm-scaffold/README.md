# Helm Scaffold Skill

A Claude Skill that generates production-ready Helm charts following Kubernetes and Helm best practices.

## Overview

This skill enables Claude to automatically generate complete, well-structured Helm charts for various application types including:

- **Deployments** - Stateless applications (web apps, APIs, microservices)
- **StatefulSets** - Stateful applications (databases, message queues)
- **Jobs** - One-time batch processing tasks
- **CronJobs** - Scheduled recurring tasks

## Features

- **Production-Ready Charts** - Follows Kubernetes and CNCF best practices
- **Security Defaults** - Includes security contexts, read-only filesystems, non-root users
- **Resource Management** - Sensible CPU/memory limits and requests
- **Health Checks** - Liveness and readiness probes configured
- **Standard Labels** - Uses app.kubernetes.io/\* label namespace
- **Multi-Environment** - Generate dev, staging, and production value files
- **Complete Documentation** - Includes README, NOTES.txt, and inline comments
- **Dry Run Instructions** - Step-by-step testing and validation guide

## Usage Examples

### Example 1: Simple Web Application

```
Create a Helm chart for my Node.js API called "user-service"
running on port 3000 with image myregistry/user-service:1.0.0
```

Claude will:

1. Ask clarifying questions (replicas, ingress, autoscaling)
2. Generate complete chart structure
3. Include Deployment, Service, ServiceAccount, and optional resources
4. Provide testing instructions

### Example 2: Database with Persistent Storage

```
Create a Helm chart for PostgreSQL with 20Gi of storage
```

Claude will:

1. Generate StatefulSet instead of Deployment
2. Include PersistentVolumeClaim configuration
3. Add headless service for stable network identities
4. Configure appropriate security contexts

### Example 3: Scheduled Job

```
Create a Helm chart for a data backup job that runs every night at 2 AM
```

Claude will:

1. Generate CronJob template
2. Configure schedule: "0 2 \* \* \*"
3. Include job-specific settings (backoff, restart policy)
4. Provide dry run testing instructions

### Example 4: Multi-Environment Setup

```
Create a Helm chart for my Python web app with dev, staging,
and production configurations
```

Claude will:

1. Generate base values.yaml
2. Create values-dev.yaml with minimal resources
3. Create values-staging.yaml with moderate resources
4. Create values-prod.yaml with HA configuration, autoscaling, and security hardening
5. Provide deployment commands for each environment

## Chart Structure

Generated charts follow this structure:

```
<chart-name>/
├── Chart.yaml                    # Chart metadata
├── values.yaml                   # Default configuration values
├── values-dev.yaml              # Development overrides (optional)
├── values-staging.yaml          # Staging overrides (optional)
├── values-prod.yaml             # Production overrides (optional)
├── .helmignore                  # Files to ignore when packaging
├── README.md                    # Chart documentation
└── templates/
    ├── _helpers.tpl             # Template helper functions
    ├── NOTES.txt                # Post-installation notes
    ├── deployment.yaml          # Deployment/StatefulSet/Job/CronJob
    ├── service.yaml             # Kubernetes Service
    ├── serviceaccount.yaml      # Service Account
    ├── ingress.yaml             # Ingress (optional)
    ├── hpa.yaml                 # Horizontal Pod Autoscaler (optional)
    ├── configmap.yaml           # ConfigMap (optional)
    └── secret.yaml              # Secret (optional)
```

## Best Practices Included

The skill automatically incorporates:

### Security

- Read-only root filesystem
- Non-root user execution
- Dropped capabilities
- Security contexts for pods and containers
- Automatic service account token mounting control

### Resource Management

- CPU and memory limits
- CPU and memory requests
- Sensible defaults based on application type

### Labels and Selectors

- Standard Kubernetes labels (app.kubernetes.io/\*)
- Proper selector label configuration
- Consistent labeling across resources

### Health Checks

- Liveness probes for container health
- Readiness probes for traffic routing
- Configurable probe parameters

### Scalability

- Horizontal Pod Autoscaler support
- Pod anti-affinity for high availability
- Node selector and toleration support

## Testing Your Charts

Every generated chart includes comprehensive testing instructions:

1. **Lint** - Validate chart structure and syntax

   ```bash
   helm lint .
   ```

2. **Template** - Render all Kubernetes manifests

   ```bash
   helm template my-app .
   ```

3. **Dry Run** - Simulate installation

   ```bash
   helm install my-app . --dry-run --debug
   ```

4. **Test Environment** - Deploy to test namespace
   ```bash
   kubectl create namespace test
   helm install my-app . -n test
   ```

## Customization

All generated values can be customized:

### Via Command Line

```bash
helm install my-app . \
  --set replicaCount=3 \
  --set image.tag=2.0.0 \
  --set resources.limits.memory=512Mi
```

### Via Values File

```bash
helm install my-app . -f custom-values.yaml
```

### Via Multiple Values Files

```bash
helm install my-app . \
  -f values.yaml \
  -f values-prod.yaml \
  -f overrides.yaml
```

## Requirements

To use generated charts, you need:

- **Kubernetes** 1.24+ cluster
- **Helm** 3.0+ CLI tool
- **kubectl** configured to access your cluster

## Supported Application Types

| Type            | Use Case                           | Key Features                            |
| --------------- | ---------------------------------- | --------------------------------------- |
| **Deployment**  | Stateless apps, APIs, web services | Rolling updates, multiple replicas      |
| **StatefulSet** | Databases, caches, message queues  | Stable network IDs, persistent storage  |
| **Job**         | Data migration, batch processing   | One-time execution, completion tracking |
| **CronJob**     | Scheduled tasks, backups, reports  | Recurring schedule, job history         |

## Common Use Cases

### Microservices Architecture

Generate consistent charts for all microservices with standard labels, security settings, and observability configuration.

### Database Deployment

Create StatefulSet-based charts with persistent storage, proper backup strategies, and initialization scripts.

## Troubleshooting

### Chart Fails Lint

- Check YAML indentation (use 2 spaces, no tabs)
- Verify all template variables exist in values.yaml
- Ensure Chart.yaml has valid semantic version

### Pods Won't Start

- Check resource limits (may be too low)
- Verify image pull secrets are configured
- Review security context settings
- Check persistent volume claims (for StatefulSets)

### Health Check Failures

- Increase `initialDelaySeconds` for slow-starting apps
- Verify health check endpoint paths
- Ensure application exposes health endpoints

### Template Errors

- Validate Go template syntax
- Check for nil pointer errors (missing values)
- Use `helm template` to debug rendering

## Advanced Features

### Custom Resource Definitions (CRDs)

For CRDs, create them in a separate chart and add as a dependency.

### Subchart Management

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
```

### Values Schema Validation

Add `values.schema.json` for IDE autocomplete and validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1
    }
  }
}
```

### Hooks for Lifecycle Management

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-5"
```

## Contributing

To extend this skill:

1. Add new template patterns to the SKILL.md
2. Include additional best practices
3. Add examples for specific use cases
4. Update testing procedures

## Support

For issues or questions:

- Review the generated README.md in your chart
- Check Helm documentation: https://helm.sh/docs/
- Review Kubernetes best practices: https://kubernetes.io/docs/concepts/configuration/overview/

## Version History

- **v1.0.0** (2025-10-23) - Initial release
  - Support for Deployment, StatefulSet, Job, CronJob
  - Multi-environment configuration
  - Comprehensive security defaults
  - Dry run testing instructions
  - Production-ready templates
