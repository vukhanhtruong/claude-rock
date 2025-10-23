# Node.js Architecture Patterns

## Table of Contents
- Common Frameworks and Patterns
- Project Structure Conventions
- Deployment Considerations
- Best Practices

## Common Frameworks and Patterns

### Express.js
**Typical Structure:**
```
src/
├── routes/          # Route definitions
├── controllers/     # Request handlers
├── services/        # Business logic
├── models/          # Data models
├── middleware/      # Custom middleware
└── config/          # Configuration
```

**Key Characteristics:**
- Minimalist, unopinionated framework
- Middleware-based architecture
- Common with REST APIs
- Often paired with ORM (Sequelize, Prisma, TypeORM)

### NestJS
**Typical Structure:**
```
src/
├── modules/         # Feature modules
│   └── user/
│       ├── user.controller.ts
│       ├── user.service.ts
│       ├── user.module.ts
│       └── dto/
├── common/          # Shared utilities
└── config/          # Configuration
```

**Key Characteristics:**
- Opinionated, TypeScript-first
- Dependency injection
- Modular architecture
- Built-in support for microservices, GraphQL, WebSockets

### Fastify
**Key Characteristics:**
- Performance-focused
- Schema-based validation
- Plugin architecture
- Similar patterns to Express but faster

### Koa
**Key Characteristics:**
- Lightweight, modern middleware
- Async/await native
- No bundled middleware
- More control than Express

## Project Structure Conventions

### REST API (Express/Koa)
```
project/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   └── controllers/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   ├── utils/
│   └── config/
├── tests/
├── .env
└── package.json
```

### Microservices (NestJS)
```
project/
├── apps/                    # Multiple services
│   ├── api-gateway/
│   ├── user-service/
│   └── order-service/
├── libs/                    # Shared libraries
│   ├── common/
│   └── database/
└── package.json
```

### Serverless (Lambda)
```
project/
├── functions/
│   ├── handler1/
│   │   └── index.js
│   ├── handler2/
│   │   └── index.js
│   └── shared/
├── layers/                  # Lambda layers
└── serverless.yml
```

## Deployment Considerations

### Containerization
**Dockerfile patterns:**
- Multi-stage builds for smaller images
- Use Alpine for minimal size
- Install only production dependencies
- Set NODE_ENV=production

**Typical:**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/index.js"]
```

### Process Management
- **PM2**: Production process manager, clustering
- **nodemon**: Development auto-reload
- **Docker**: Container orchestration handles process management

### Common Deployment Platforms
- **AWS**: Lambda (serverless), ECS/Fargate (containers), EC2, Elastic Beanstalk
- **Vercel/Netlify**: Serverless functions, Edge functions
- **Heroku**: PaaS, simple deployment
- **Google Cloud**: Cloud Run, App Engine, Cloud Functions
- **Kubernetes**: Container orchestration

## Best Practices

### Code Organization
- Separate concerns: routes, controllers, services, models
- Use dependency injection (especially with NestJS)
- Keep controllers thin, services fat
- Use environment variables for configuration

### Database Integration
**Popular ORMs/ODMs:**
- **Sequelize**: SQL ORM, supports multiple databases
- **TypeORM**: TypeScript-first SQL ORM
- **Prisma**: Modern ORM with great DX
- **Mongoose**: MongoDB ODM
- **Knex**: SQL query builder

### Error Handling
- Use centralized error handler middleware
- Create custom error classes
- Log errors properly
- Return appropriate HTTP status codes

### Security
- Use helmet for security headers
- Validate input with joi, yup, or class-validator
- Rate limiting with express-rate-limit
- CORS configuration
- SQL injection prevention via ORM
- Don't expose sensitive errors to clients

### Performance
- Use compression middleware
- Implement caching (Redis)
- Database connection pooling
- Optimize queries
- Use clustering for CPU-intensive tasks

### Testing
**Frameworks:**
- Jest: Most popular, full-featured
- Mocha + Chai: Flexible, modular
- Supertest: HTTP endpoint testing

**Patterns:**
- Unit tests for services
- Integration tests for routes
- Mock external dependencies
- Use test databases

### Configuration
- dotenv for environment variables
- config package for multi-environment configs
- Never commit secrets
- Use secrets management in production

### Common Middleware Stack
```javascript
app.use(helmet());              // Security headers
app.use(cors());                // CORS
app.use(express.json());        // Parse JSON
app.use(compression());         // Compress responses
app.use(morgan('combined'));    // Logging
app.use(rateLimit({...}));     // Rate limiting
```

### Monitoring and Observability
- **Application monitoring**: New Relic, Datadog, AppDynamics
- **Error tracking**: Sentry, Rollbar
- **Logging**: Winston, Pino, Bunyan
- **APM**: OpenTelemetry, AWS X-Ray

### Package Management
- Use npm or yarn consistently
- Lock dependencies with package-lock.json or yarn.lock
- Regular dependency updates
- Check for vulnerabilities: npm audit

## Technology-Specific Patterns

### Real-time Applications
- Socket.io for WebSockets
- Server-Sent Events (SSE) for one-way updates
- Redis pub/sub for scaling WebSockets

### GraphQL APIs
- Apollo Server
- Type-GraphQL with TypeScript
- DataLoader for batching and caching

### Background Jobs
- Bull (Redis-based queue)
- Agenda (MongoDB-based)
- BeeQueue (lightweight)
- AWS SQS for serverless

### API Documentation
- Swagger/OpenAPI with swagger-jsdoc
- API Blueprint
- Postman collections
