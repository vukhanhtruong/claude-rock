# Serverless Architecture Patterns

## Table of Contents
- Core Concepts
- Function Patterns
- Data Patterns
- Integration Patterns
- Best Practices

## Core Concepts

### Function as a Service (FaaS)
Code runs in response to events without managing servers.

**Key Characteristics:**
- Event-driven execution
- Automatic scaling
- Pay-per-execution pricing
- Stateless functions
- Short-lived execution

**Major Providers:**
- AWS Lambda
- Google Cloud Functions
- Azure Functions
- Cloudflare Workers

### Backend as a Service (BaaS)
Managed services replace traditional backend components.

**Examples:**
- Database: DynamoDB, Firestore, Fauna
- Auth: Auth0, AWS Cognito, Firebase Auth
- Storage: S3, Cloud Storage
- APIs: API Gateway, AppSync

## Function Patterns

### API Endpoint Pattern
```
API Gateway --trigger--> Lambda Function --response--> API Gateway
```

**Use case:** REST API, GraphQL API

**Example (AWS):**
```
API Gateway (POST /users)
    ↓
Lambda (createUser)
    ↓
DynamoDB
```

### Event Processing Pattern
```
Event Source --event--> Lambda --process--> Output
```

**Event Sources:**
- S3: File uploads
- DynamoDB Streams: Database changes
- SQS: Message queue
- SNS: Notifications
- EventBridge: Custom events

**Use case:** Image processing, data transformation, ETL

### Scheduled Jobs Pattern
```
CloudWatch Events (cron) --trigger--> Lambda
```

**Use case:** Batch processing, cleanup jobs, reports

**Example:**
```
EventBridge Rule (rate(1 day))
    ↓
Lambda (dailyReport)
    ↓
Send Email / Store Results
```

### Stream Processing Pattern
```
Kinesis Stream --records--> Lambda --aggregate/transform-->  Destination
```

**Use case:** Real-time analytics, log processing

## Data Patterns

### DynamoDB Pattern (NoSQL)

**Access Patterns:**
- Single table design
- GSI for query flexibility
- DynamoDB Streams for CDC

**Best practices:**
- Design for access patterns first
- Use partition keys for distribution
- Batch operations when possible
- Enable auto-scaling

### Aurora Serverless Pattern (SQL)

**Features:**
- Auto-scaling SQL database
- Pay per use
- Data API for HTTP access

**Use case:** Variable workloads, development environments

### Multi-Database Pattern

**Polyglot persistence:**
- DynamoDB for user profiles
- S3 for files
- ElastiCache for sessions
- RDS for relational data

### API Composition Pattern

Function aggregates data from multiple sources:
```
Lambda
    ├── Call Service A API
    ├── Call Service B API
    ├── Query DynamoDB
    └── Aggregate results
```

## Integration Patterns

### API Gateway Integration

**Types:**
- Lambda Proxy: Full HTTP request to function
- Lambda Integration: Custom request/response mapping
- HTTP Proxy: Direct passthrough to backend
- Mock: Return static response

**Features:**
- Request validation
- Authorization
- Rate limiting
- Caching
- CORS

### EventBridge Pattern

Central event bus for service integration:
```
Service A --event--> EventBridge --route--> Lambda B
                                    --route--> Lambda C
                                    --route--> SQS Queue
```

**Use case:** Event-driven architecture, decoupling services

### Step Functions Pattern

Orchestrate multiple Lambda functions:
```
Step Functions State Machine
    ↓
Step 1: Validate (Lambda)
    ↓
Step 2: Process (Lambda)
    ↓
Step 3: Notify (Lambda)
```

**Use case:** Workflows, long-running processes, error handling

### SQS Queue Pattern

Decouple and buffer workloads:
```
Producer --message--> SQS Queue --poll--> Lambda Consumer
```

**Benefits:**
- Async processing
- Rate limiting
- Retry logic
- Dead letter queue

### Fan-out Pattern

Single event triggers multiple functions:
```
S3 Upload Event
    ↓
SNS Topic
    ├── Lambda: Create Thumbnail
    ├── Lambda: Extract Metadata
    └── Lambda: Virus Scan
```

## Best Practices

### Cold Start Optimization

**Strategies:**
- Keep functions small
- Minimize dependencies
- Use provisioned concurrency (critical paths)
- Reuse connections
- Initialize outside handler

```javascript
// Good: Initialize outside
const db = new DynamoDB.DocumentClient();

exports.handler = async (event) => {
    // Use db here
};
```

### Error Handling

**Patterns:**
- Return errors explicitly
- Use Dead Letter Queues
- Implement retry logic
- Log errors with context

```javascript
exports.handler = async (event) => {
    try {
        // Process event
    } catch (error) {
        console.error('Error:', error);
        // Send to DLQ or SNS
        throw error; // Trigger retry
    }
};
```

### Security

**Best practices:**
- Least privilege IAM roles
- Encrypt environment variables
- Use VPC for private resources
- Validate input
- Use AWS Secrets Manager

### Cost Optimization

**Strategies:**
- Right-size memory (affects CPU)
- Optimize execution time
- Use SQS for buffering
- Set appropriate timeouts
- Monitor unused functions

### Observability

**Logging:**
- Use structured logging (JSON)
- Include correlation IDs
- Log key metrics

**Monitoring:**
- CloudWatch Metrics
- X-Ray for tracing
- Custom metrics

**Alerts:**
- Error rates
- Duration
- Throttles
- Dead letter queue depth

### State Management

**Stateless functions:**
- No local state
- Use external stores (DynamoDB, S3, ElastiCache)
- Pass state in events

**Step Functions for stateful workflows:**
- Maintain workflow state
- Handle long-running processes

### Testing

**Levels:**
- Unit: Test handler logic
- Integration: Test with local services (LocalStack)
- E2E: Test in AWS

**Tools:**
- Jest/Mocha for unit tests
- AWS SAM for local testing
- LocalStack for local AWS

### Deployment

**IaC Tools:**
- AWS SAM (Serverless Application Model)
- Serverless Framework
- AWS CDK
- Terraform

**CI/CD:**
- Automated testing
- Canary deployments
- Blue-green deployments
- Rollback capability

## Architecture Examples

### REST API
```
API Gateway (REST)
    ├── GET /items --> Lambda (listItems) --> DynamoDB
    ├── POST /items --> Lambda (createItem) --> DynamoDB
    └── GET /items/{id} --> Lambda (getItem) --> DynamoDB
```

### Event-Driven Processing
```
S3 Bucket (image upload)
    ↓
Lambda (processImage)
    ├── Resize image
    ├── Store in S3
    └── Update DynamoDB
```

### Microservices
```
Service 1: API Gateway + Lambda + DynamoDB
Service 2: API Gateway + Lambda + RDS Aurora
Service 3: EventBridge + Lambda + SQS

Inter-service: HTTP APIs or EventBridge
```

### Data Pipeline
```
S3 (raw data)
    ↓
Lambda (transform)
    ↓
Kinesis Firehose
    ↓
S3 (processed data)
    ↓
Athena (query)
```

## Common Challenges

### Vendor Lock-in
**Mitigation:** Use frameworks (Serverless Framework), abstract provider-specific code

### Cold Starts
**Mitigation:** Provisioned concurrency, keep functions warm, optimize bundle size

### Debugging
**Mitigation:** Structured logging, X-Ray tracing, local testing

### Testing
**Mitigation:** Unit tests, integration tests with LocalStack, E2E tests in staging

### Distributed Tracing
**Mitigation:** AWS X-Ray, correlation IDs, structured logs

## When to Use Serverless

**Good for:**
- Variable workload
- Event-driven applications
- APIs with unpredictable traffic
- Scheduled jobs
- Rapid prototyping
- Startups (reduce ops overhead)

**Not ideal for:**
- Long-running processes (>15 min)
- Consistent high-throughput
- Applications requiring low latency
- Complex state management
- Heavy computation (cost)
