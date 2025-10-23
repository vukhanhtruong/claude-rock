# Helm Chart Workload Types

## Overview
Different application types require different Kubernetes workload resources. This guide helps choose the right workload type and understand its specific requirements.

## Workload Type Decision Tree

```
Is it a long-running process?
├─ YES: Does it need stable network identity or persistent storage?
│   ├─ YES: Use StatefulSet
│   └─ NO: Use Deployment
└─ NO: Is it scheduled to run repeatedly?
    ├─ YES: Use CronJob
    └─ NO: Use Job
```

## Deployment

**Use for:** Stateless applications, microservices, web servers, APIs

### Characteristics
- No persistent identity
- Pods are interchangeable
- Can be scaled horizontally
- Rolling updates and rollbacks
- No guaranteed ordering

### Best For
- REST APIs
- Web applications
- Microservices
- Stateless workers
- Frontend applications

### values.yaml Specific Fields
```yaml
replicaCount: 3
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
```

### Example Use Cases
- Node.js API server
- Nginx web server
- Python Flask application
- React/Vue frontend
- Stateless background workers

## StatefulSet

**Use for:** Stateful applications requiring stable identity or persistent storage

### Characteristics
- Stable, unique network identifiers
- Stable, persistent storage
- Ordered, graceful deployment and scaling
- Ordered, automated rolling updates
- Requires headless service

### Best For
- Databases (MySQL, PostgreSQL, MongoDB)
- Message queues (RabbitMQ, Kafka)
- Distributed systems (Elasticsearch, Cassandra)
- Applications requiring stable hostnames

### values.yaml Specific Fields
```yaml
replicaCount: 3
updateStrategy:
  type: RollingUpdate
  
persistence:
  enabled: true
  storageClass: "fast-ssd"
  size: 10Gi
  accessMode: ReadWriteOnce

podManagementPolicy: OrderedReady  # or Parallel
```

### Template Additions
```yaml
serviceName: {{ include "chart.fullname" . }}-headless
volumeClaimTemplates:
- metadata:
    name: data
  spec:
    accessModes: [ "ReadWriteOnce" ]
    storageClassName: {{ .Values.persistence.storageClass }}
    resources:
      requests:
        storage: {{ .Values.persistence.size }}
```

### Headless Service Required
```yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "chart.fullname" . }}-headless
spec:
  clusterIP: None
  selector:
    {{- include "chart.selectorLabels" . | nindent 4 }}
```

### Example Use Cases
- PostgreSQL cluster
- Redis with persistent storage
- Elasticsearch cluster
- Kafka broker
- ZooKeeper ensemble

## Job

**Use for:** Run-to-completion tasks, one-time executions

### Characteristics
- Runs until completion
- Pods are not restarted after successful completion
- Can run multiple pods in parallel
- Automatic cleanup options
- Suitable for batch processing

### Best For
- Database migrations
- Batch processing
- Data imports/exports
- One-time setup tasks
- Report generation

### values.yaml Specific Fields
```yaml
job:
  backoffLimit: 4                    # Retry attempts
  activeDeadlineSeconds: 600         # Timeout
  ttlSecondsAfterFinished: 86400    # Cleanup after 24h
  restartPolicy: OnFailure           # or Never
  parallelism: 1                     # Parallel pods
  completions: 1                     # Required completions
  command: []
  args: []
```

### Template Specifics
```yaml
spec:
  backoffLimit: {{ .Values.job.backoffLimit }}
  ttlSecondsAfterFinished: {{ .Values.job.ttlSecondsAfterFinished }}
  template:
    spec:
      restartPolicy: {{ .Values.job.restartPolicy }}
```

### Example Use Cases
- Database schema migration
- Data ETL job
- Image processing batch
- Cache warming
- Backup operations

## CronJob

**Use for:** Scheduled, recurring tasks

### Characteristics
- Scheduled execution (cron syntax)
- Creates Jobs on schedule
- Concurrency control
- History management
- Automatic cleanup

### Best For
- Scheduled backups
- Report generation
- Data synchronization
- Cache clearing
- Periodic cleanup tasks

### values.yaml Specific Fields
```yaml
cronJob:
  schedule: "0 2 * * *"              # Daily at 2 AM
  concurrencyPolicy: Forbid           # Forbid, Allow, or Replace
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  startingDeadlineSeconds: 200       # Deadline for missed runs
  suspend: false                      # Pause scheduling
  backoffLimit: 4
  activeDeadlineSeconds: 600
  restartPolicy: OnFailure
  command: []
  args: []
```

### Cron Schedule Examples
```yaml
"*/5 * * * *"    # Every 5 minutes
"0 * * * *"      # Every hour
"0 0 * * *"      # Daily at midnight
"0 2 * * *"      # Daily at 2 AM
"0 0 * * 0"      # Weekly on Sunday
"0 0 1 * *"      # Monthly on 1st
"0 0 1 1 *"      # Yearly on Jan 1st
```

### Concurrency Policies
- **Forbid**: Don't start new job if previous still running (recommended)
- **Allow**: Allow concurrent jobs
- **Replace**: Cancel running job and start new one

### Example Use Cases
- Nightly database backup
- Daily report generation
- Hourly cache refresh
- Weekly cleanup tasks
- Monthly billing runs

## Comparison Matrix

| Feature | Deployment | StatefulSet | Job | CronJob |
|---------|-----------|-------------|-----|---------|
| **Replicas** | Yes | Yes | Parallelism | Parallelism |
| **Persistent Identity** | No | Yes | No | No |
| **Persistent Storage** | Optional | Yes | Optional | Optional |
| **Ordered Operations** | No | Yes | No | No |
| **Auto-restart** | Yes | Yes | Optional | Optional |
| **Scaling** | Easy | Ordered | N/A | N/A |
| **Updates** | Rolling | Rolling | N/A | N/A |
| **Service** | Yes | Headless | Optional | Optional |
| **Typical Replicas** | 2-100+ | 1-10 | 1-1000 | 1-100 |

## When to Use Each Type

### Use Deployment When:
- Application is stateless
- Pods are interchangeable
- No need for stable network identity
- Need rapid scaling
- Standard web application pattern

### Use StatefulSet When:
- Need stable, unique network identifiers
- Require persistent storage per pod
- Need ordered deployment/scaling
- Running clustered databases
- Pods need to discover each other

### Use Job When:
- Task runs to completion
- One-time execution needed
- Batch processing work
- Database migration
- Don't need scheduling

### Use CronJob When:
- Need scheduled execution
- Recurring tasks
- Time-based triggers
- Periodic maintenance
- Regular backups or reports

## Migration Considerations

### Deployment → StatefulSet
**Required Changes:**
- Add `serviceName` pointing to headless service
- Create headless service
- Add `volumeClaimTemplates`
- Update selector labels (StatefulSet selector is immutable)
- Plan for ordered rollout

### StatefulSet → Deployment
**Consider:**
- Loss of stable network identity
- Need to externalize persistent data
- Pods become interchangeable
- No ordered operations

## Resource Recommendations by Type

### Deployment
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### StatefulSet
```yaml
resources:
  requests:
    memory: "512Mi"    # Higher for databases
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Job/CronJob
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```
