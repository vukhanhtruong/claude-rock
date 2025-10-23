# Java Architecture Patterns

## Table of Contents
- Common Frameworks and Patterns
- Project Structure Conventions
- Deployment Considerations
- Best Practices

## Common Frameworks and Patterns

### Spring Boot
**Typical Structure:**
```
project/
├── src/main/java/com/company/project/
│   ├── Application.java         # Main class
│   ├── controller/              # REST controllers
│   ├── service/                 # Business logic
│   ├── repository/              # Data access
│   ├── model/entity/            # JPA entities
│   ├── model/dto/               # DTOs
│   ├── config/                  # Configuration
│   └── exception/               # Exception handling
├── src/main/resources/
│   ├── application.properties
│   └── application-{env}.properties
├── src/test/java/
└── pom.xml or build.gradle
```

**Key Characteristics:**
- Convention over configuration
- Auto-configuration
- Embedded servers (Tomcat, Jetty)
- Spring ecosystem integration
- Dependency injection

### Jakarta EE (formerly Java EE)
**Key Technologies:**
- JAX-RS for REST APIs
- JPA for persistence
- CDI for dependency injection
- EJB for business logic
- Deployed to application servers (WildFly, Payara)

### Micronaut
**Key Characteristics:**
- Fast startup, low memory
- Compile-time dependency injection
- Native image support (GraalVM)
- Cloud-native focus

### Quarkus
**Key Characteristics:**
- Kubernetes-native
- Fast startup, low memory
- Developer experience focused
- GraalVM native images

## Project Structure Conventions

### Spring Boot Microservice
```
project/
├── src/main/java/com/company/service/
│   ├── ServiceApplication.java
│   ├── api/                     # API layer
│   │   ├── controller/
│   │   └── dto/
│   ├── domain/                  # Domain layer
│   │   ├── model/
│   │   └── service/
│   ├── infrastructure/          # Infrastructure
│   │   ├── repository/
│   │   ├── client/
│   │   └── config/
│   └── common/                  # Shared utilities
├── src/main/resources/
├── src/test/
├── pom.xml
└── Dockerfile
```

### Maven Multi-Module Project
```
parent-project/
├── pom.xml                      # Parent POM
├── api-module/
│   ├── pom.xml
│   └── src/
├── service-module/
│   ├── pom.xml
│   └── src/
├── common-module/
│   ├── pom.xml
│   └── src/
└── integration-tests/
    ├── pom.xml
    └── src/
```

## Deployment Considerations

### Build Tools
- **Maven**: XML-based, widespread
- **Gradle**: Groovy/Kotlin DSL, flexible, faster

### Application Servers
- **Spring Boot**: Embedded Tomcat/Jetty/Undertow
- **Traditional**: WildFly, Payara, WebLogic, WebSphere
- **Lightweight**: Tomcat, Jetty as standalone

### Containerization
```dockerfile
# Multi-stage build
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Common Deployment Platforms
- **AWS**: Elastic Beanstalk, ECS, Lambda (with GraalVM)
- **Google Cloud**: App Engine, Cloud Run, GKE
- **Azure**: App Service, Container Instances, AKS
- **Kubernetes**: Primary choice for microservices
- **Traditional**: On-premise application servers

## Best Practices

### Code Organization

**Layered Architecture:**
- Controller → Service → Repository
- DTOs for data transfer
- Entities for persistence
- Use interfaces for services

**Package by Feature:**
```
com.company.project/
├── user/
│   ├── UserController.java
│   ├── UserService.java
│   ├── UserRepository.java
│   └── User.java
├── order/
└── product/
```

### Database Integration

**Spring Data JPA:**
```java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}
```

**Hibernate:** JPA implementation
**Flyway/Liquibase:** Database migrations
**Connection Pooling:** HikariCP (default in Spring Boot)

### Configuration

**Spring Boot application.properties:**
```properties
spring.datasource.url=${DB_URL}
spring.jpa.hibernate.ddl-auto=validate
server.port=${PORT:8080}
```

**Profiles:** application-dev.properties, application-prod.properties
**Environment variables:** For secrets and env-specific config
**Spring Cloud Config:** Centralized configuration

### Security

**Spring Security:**
- Authentication and authorization
- JWT support
- OAuth2/OpenID Connect
- Method-level security

**Best Practices:**
- Use BCrypt for passwords
- Validate input with Bean Validation
- Prevent SQL injection (use JPA)
- CORS configuration
- HTTPS in production

### Error Handling

**Spring Boot:**
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
        ResourceNotFoundException ex) {
        return ResponseEntity.status(404)
            .body(new ErrorResponse(ex.getMessage()));
    }
}
```

### Testing

**Frameworks:**
- **JUnit 5**: Standard testing framework
- **Mockito**: Mocking framework
- **Spring Boot Test**: Integration testing
- **RestAssured**: API testing
- **TestContainers**: Database testing with containers

**Patterns:**
- Unit tests with Mockito
- Integration tests with @SpringBootTest
- Slice tests (@WebMvcTest, @DataJpaTest)
- Test coverage with JaCoCo

### Logging

**SLF4J + Logback (Spring Boot default):**
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger log = 
    LoggerFactory.getLogger(MyClass.class);

log.info("Processing request for user {}", userId);
```

**Structured Logging:** Logstash encoder for JSON logs

### API Documentation

**OpenAPI/Swagger:**
- springdoc-openapi for automatic generation
- Annotations for customization
- Swagger UI for interactive docs

### Dependency Injection

**Spring:**
- Constructor injection (preferred)
- @Autowired annotation
- @Component, @Service, @Repository stereotypes
- Java Config with @Configuration and @Bean

### Common Libraries

- **Lombok**: Reduce boilerplate
- **MapStruct**: Object mapping
- **Apache Commons**: Utility libraries
- **Guava**: Google's core libraries
- **Jackson**: JSON processing

## Technology-Specific Patterns

### Microservices

**Spring Cloud:**
- Service Discovery: Eureka
- API Gateway: Spring Cloud Gateway
- Config: Spring Cloud Config
- Circuit Breaker: Resilience4j
- Distributed Tracing: Micrometer + Zipkin

### Messaging

- **Spring AMQP**: RabbitMQ integration
- **Spring Kafka**: Kafka integration
- **Spring JMS**: JMS support
- **AWS SQS**: Cloud messaging

### Caching

- **Spring Cache**: Abstraction layer
- **Redis**: Distributed cache
- **Caffeine**: In-memory cache
- **Hazelcast**: Distributed cache

### Reactive Programming

**Spring WebFlux:**
- Non-blocking, event-driven
- Project Reactor
- Better for high concurrency
- MongoDB/Cassandra reactive support

### GraphQL

- **Spring for GraphQL**: Official Spring support
- Schema-first approach
- DataFetchers for resolvers

### Monitoring

- **Spring Boot Actuator**: Health checks, metrics
- **Micrometer**: Metrics facade
- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Zipkin/Jaeger**: Distributed tracing
- **ELK Stack**: Logging

### Performance

- **Connection pooling**: HikariCP
- **Query optimization**: Proper JPA fetch strategies
- **Caching**: Redis, Caffeine
- **Async processing**: @Async, CompletableFuture
- **JVM tuning**: Heap size, GC configuration
