# Microservices Architecture Patterns

## Table of Contents
- Core Principles
- Service Design Patterns
- Communication Patterns
- Data Management
- Deployment Patterns
- Observability

## Core Principles

### Single Responsibility
Each service owns one business capability and does it well.

### Decentralized Data
Each service has its own database (database-per-service pattern).

### Independence
Services can be developed, deployed, and scaled independently.

### Resilience
Services must handle failures gracefully (circuit breakers, retries).

## Service Design Patterns

### Service Boundaries
Define services around business capabilities, not technical layers:
- ✅ User Service, Order Service, Payment Service
- ❌ Database Service, Email Service (too technical)

### Service Size
Guideline: A service should be maintainable by a small team (2-pizza team).

### API Design
- Use RESTful APIs for synchronous communication
- Use gRPC for high-performance internal communication
- Use message queues for asynchronous communication
- Version APIs (v1, v2) to support backward compatibility

## Communication Patterns

### Synchronous (Request-Response)

**REST APIs:**
```
Service A --HTTP--> Service B
          <-JSON---
```

**When to use:**
- Need immediate response
- Simple request-response flow
- External-facing APIs

**gRPC:**
```
Service A --Protocol Buffer--> Service B
          <--Binary Response---
```

**When to use:**
- Internal service communication
- Need high performance
- Strong typing required

### Asynchronous (Event-Driven)

**Message Queue:**
```
Service A --publish--> Queue --consume--> Service B
```

**When to use:**
- Don't need immediate response
- Decouple services
- Handle bursts of traffic
- Background processing

**Event Bus/Broker:**
```
Service A --emit event--> Event Bus --subscribe--> Service B, C, D
```

**When to use:**
- Multiple services need same event
- Event sourcing patterns
- Complex event processing

**Popular Tools:**
- Kafka: High-throughput, event streaming
- RabbitMQ: Traditional message broker
- AWS SQS/SNS: Cloud-native messaging
- NATS: Lightweight messaging

### API Gateway Pattern

Centralized entry point for all client requests.

**Responsibilities:**
- Request routing
- Authentication/Authorization
- Rate limiting
- Request/Response transformation
- Caching
- Load balancing

**Tools:**
- Kong
- AWS API Gateway
- Nginx
- Spring Cloud Gateway
- Traefik

### Service Mesh Pattern

Infrastructure layer for service-to-service communication.

**Features:**
- Traffic management
- Security (mTLS)
- Observability
- Circuit breaking
- Retry logic

**Tools:**
- Istio
- Linkerd
- Consul Connect

## Data Management

### Database Per Service

Each service owns its database. No shared databases.

**Benefits:**
- Service independence
- Technology flexibility
- Scalability

**Challenges:**
- Data consistency
- Joins across services
- Transactions

### Saga Pattern

Manage transactions across multiple services.

**Choreography:**
```
Order Service --creates order-->
    |--event--> Payment Service --processes payment-->
    |--event--> Inventory Service --reserves items-->
    |--event--> Shipping Service --ships order-->
```

Each service listens to events and publishes new events.

**Orchestration:**
```
Order Orchestrator
    |--call--> Payment Service
    |--call--> Inventory Service
    |--call--> Shipping Service
```

Central orchestrator coordinates the saga.

### CQRS (Command Query Responsibility Segregation)

Separate read and write models.

**Pattern:**
- Write: Command Model (normalized, transactional)
- Read: Query Model (denormalized, optimized for reads)
- Sync via events or batch processes

**When to use:**
- Complex domains
- Different read/write patterns
- Need to scale reads separately

### Event Sourcing

Store state changes as events rather than current state.

**Benefits:**
- Complete audit log
- Temporal queries
- Event replay for debugging
- Derive new models from events

**Challenges:**
- Complexity
- Event versioning
- Storage requirements

## Deployment Patterns

### Containerization

**Docker:**
```
Each service → Docker image → Container
```

**Benefits:**
- Consistency across environments
- Isolation
- Resource efficiency

### Container Orchestration

**Kubernetes:**
```
Cluster
├── Namespace: production
│   ├── Deployment: user-service
│   ├── Deployment: order-service
│   └── Deployment: payment-service
└── Namespace: staging
```

**Features:**
- Automated deployment
- Scaling
- Self-healing
- Service discovery
- Load balancing
- Rolling updates

### Service Discovery

**Pattern:**
Services register themselves and discover other services dynamically.

**Client-side:**
- Service queries registry
- Service makes direct call
- Tools: Eureka, Consul

**Server-side:**
- Load balancer queries registry
- Routes request to service
- Tools: Kubernetes, AWS ELB

### Configuration Management

**External Configuration:**
- Spring Cloud Config
- Consul
- etcd
- Kubernetes ConfigMaps/Secrets

**Pattern:**
- Store config separately from code
- Environment-specific configs
- Runtime configuration changes

## Observability

### Distributed Tracing

Track requests across multiple services.

**Tools:**
- Jaeger
- Zipkin
- AWS X-Ray
- Datadog APM

**Pattern:**
```
Request ID: abc123
User Service (10ms) --> Order Service (50ms) --> Payment Service (100ms)
Total: 160ms
```

### Centralized Logging

Aggregate logs from all services.

**Tools:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- CloudWatch Logs
- Datadog

**Pattern:**
- Structured logging (JSON)
- Correlation IDs
- Log levels
- Searchable aggregation

### Metrics and Monitoring

**Metrics to track:**
- Request rate
- Error rate
- Response time (latency)
- Resource usage (CPU, memory)

**Tools:**
- Prometheus + Grafana
- CloudWatch
- Datadog
- New Relic

### Health Checks

**Types:**
- Liveness: Is service alive?
- Readiness: Can service handle requests?
- Startup: Has service started?

**Implementation:**
```
/health/live    → 200 OK
/health/ready   → 200 OK (or 503 if not ready)
```

## Common Challenges

### Network Latency
**Solution:** Async communication, caching, service mesh

### Data Consistency
**Solution:** Eventual consistency, saga pattern, CQRS

### Testing
**Solution:** Contract testing, integration tests, chaos engineering

### Debugging
**Solution:** Distributed tracing, centralized logging, correlation IDs

### Security
**Solution:** API gateway, service mesh mTLS, OAuth2/JWT

### Service Proliferation
**Solution:** Clear service boundaries, API standards, governance

## Best Practices

1. **Start with a Monolith:** Don't start with microservices
2. **Define Clear Boundaries:** Use Domain-Driven Design
3. **Automate Everything:** CI/CD, testing, deployment
4. **Monitor from Day One:** Logging, metrics, tracing
5. **Design for Failure:** Circuit breakers, retries, timeouts
6. **Version APIs:** Support backward compatibility
7. **Document APIs:** OpenAPI/Swagger
8. **Use Async for Non-Critical Paths:** Message queues
9. **Implement Health Checks:** For orchestration
10. **Security at Every Layer:** Gateway, service mesh, code
