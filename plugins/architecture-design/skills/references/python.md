# Python Architecture Patterns

## Table of Contents
- Common Frameworks and Patterns
- Project Structure Conventions
- Deployment Considerations
- Best Practices

## Common Frameworks and Patterns

### Django
**Typical Structure:**
```
project/
├── manage.py
├── project_name/        # Project config
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── app_name/            # Django apps
│   ├── models.py
│   ├── views.py
│   ├── serializers.py   # If using DRF
│   ├── urls.py
│   └── admin.py
└── requirements.txt
```

**Key Characteristics:**
- "Batteries included" framework
- ORM built-in
- Admin interface out of the box
- Best for full-stack web applications
- Django REST Framework for APIs

### Flask
**Typical Structure:**
```
project/
├── app/
│   ├── __init__.py      # Application factory
│   ├── routes/
│   ├── models/
│   ├── services/
│   └── utils/
├── tests/
├── config.py
├── requirements.txt
└── run.py
```

**Key Characteristics:**
- Microframework, minimal
- Flexible and unopinionated
- Extension-based (Flask-SQLAlchemy, Flask-JWT, etc.)
- Good for APIs and smaller applications

### FastAPI
**Typical Structure:**
```
project/
├── app/
│   ├── main.py
│   ├── routers/
│   ├── models/
│   ├── schemas/         # Pydantic models
│   ├── services/
│   └── dependencies.py
├── tests/
└── requirements.txt
```

**Key Characteristics:**
- Modern, high-performance
- Type hints and validation (Pydantic)
- Automatic API documentation (Swagger/ReDoc)
- Async support built-in
- Ideal for APIs and microservices

## Project Structure Conventions

### API Application (Flask/FastAPI)
```
project/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   └── dependencies.py
│   │   └── v2/
│   ├── core/
│   │   ├── config.py
│   │   └── security.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── db/
├── tests/
├── alembic/             # Database migrations
├── .env
└── requirements.txt
```

### Django Monolith
```
project/
├── manage.py
├── project_name/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/
│   ├── orders/
│   └── products/
├── static/
├── templates/
└── requirements/
```

### Data Science/ML Application
```
project/
├── data/
│   ├── raw/
│   ├── processed/
│   └── models/
├── notebooks/
├── src/
│   ├── data/
│   ├── features/
│   ├── models/
│   └── visualization/
├── tests/
└── requirements.txt
```

## Deployment Considerations

### WSGI/ASGI Servers
**Production servers:**
- **Gunicorn**: WSGI server for Django/Flask
- **Uvicorn**: ASGI server for FastAPI
- **uWSGI**: Full-featured application server
- **Hypercorn**: ASGI server alternative

**Typical setup:**
```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app  # Flask
gunicorn -w 4 myproject.wsgi:application  # Django
uvicorn app.main:app --workers 4  # FastAPI
```

### Containerization
**Dockerfile patterns:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run as non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:app"]
```

### Common Deployment Platforms
- **AWS**: Lambda (Zappa, Chalice), ECS, EC2, Elastic Beanstalk
- **Google Cloud**: Cloud Run, App Engine, Compute Engine
- **Azure**: App Service, Functions, Container Instances
- **Heroku**: Simple deployment with Procfile
- **PythonAnywhere**: Python-specific hosting
- **Kubernetes**: Container orchestration

### Virtual Environments
- **venv**: Built-in Python 3.3+
- **virtualenv**: Cross-version compatibility
- **conda**: Data science focused
- **Poetry**: Modern dependency management
- **pipenv**: Combines pip and virtualenv

## Best Practices

### Code Organization
- Follow PEP 8 style guide
- Use blueprints (Flask) or apps (Django) for modularity
- Separate business logic from views/routes
- Keep models lean, use services for complex logic

### Database Integration

**Django ORM:**
- Built-in, powerful ORM
- Migrations with django-admin
- QuerySet API

**SQLAlchemy (Flask/FastAPI):**
- Most popular ORM
- Core and ORM layers
- Alembic for migrations

**Alternatives:**
- **Tortoise ORM**: AsyncIO ORM for FastAPI
- **Peewee**: Lightweight ORM
- **asyncpg/psycopg3**: Direct database drivers

### Configuration Management
```python
# Use environment-specific configs
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DEBUG = os.getenv('DEBUG', False)
    DATABASE_URL = os.getenv('DATABASE_URL')
    SECRET_KEY = os.getenv('SECRET_KEY')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
```

### Security

**Django:**
- CSRF protection built-in
- XSS protection
- SQL injection prevention via ORM
- Security middleware enabled

**Flask/FastAPI:**
- Use Flask-Security or FastAPI security utilities
- Validate input with Pydantic (FastAPI) or marshmallow (Flask)
- CORS: flask-cors or FastAPI CORSMiddleware
- Rate limiting: Flask-Limiter

**General:**
- Never commit secrets
- Use environment variables
- Validate and sanitize input
- Use parameterized queries
- Keep dependencies updated

### Error Handling
```python
# Centralized error handling
from fastapi import HTTPException
from flask import jsonify

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={"message": str(exc)}
    )
```

### Testing

**Frameworks:**
- **pytest**: Most popular, full-featured
- **unittest**: Built-in
- **nose2**: Extension of unittest

**Tools:**
- **pytest-cov**: Coverage reporting
- **factory_boy**: Test fixtures
- **faker**: Generate fake data
- **responses/httpx**: Mock HTTP requests

**Patterns:**
- Unit tests for business logic
- Integration tests for endpoints
- Use fixtures for test data
- Mock external services

### Logging
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

**Production logging:**
- Use structured logging (structlog)
- Log to stdout/stderr for containers
- Integrate with ELK, Datadog, CloudWatch

### Package Management
```txt
# requirements.txt
Django==4.2.0
psycopg2-binary==2.9.6
gunicorn==20.1.0

# Or use Poetry
# pyproject.toml
[tool.poetry.dependencies]
python = "^3.11"
django = "^4.2"
```

### Type Hints
```python
from typing import List, Optional

def get_users(limit: int = 10) -> List[User]:
    return User.objects.all()[:limit]

# Use mypy for static type checking
```

### Async/Await (FastAPI, modern Python)
```python
async def get_data():
    async with httpx.AsyncClient() as client:
        response = await client.get('https://api.example.com')
        return response.json()
```

## Technology-Specific Patterns

### REST APIs
- Django REST Framework: Full-featured, batteries included
- Flask-RESTX: Flask extension for APIs
- FastAPI: Modern, automatic docs, high performance

### Background Jobs
- **Celery**: Distributed task queue (with Redis/RabbitMQ)
- **RQ**: Simple Redis-based queue
- **Dramatiq**: Alternative to Celery
- **APScheduler**: Scheduler for periodic tasks

### Caching
- **Redis**: Most common
- **Memcached**: Simple key-value store
- **Django cache framework**: Built-in abstraction
- **Flask-Caching**: Flask extension

### GraphQL
- **Graphene-Django**: Django integration
- **Strawberry**: Modern, type-hint based
- **Ariadne**: Schema-first approach

### WebSockets
- **Django Channels**: Async Django
- **Flask-SocketIO**: WebSocket support for Flask
- **FastAPI WebSockets**: Built-in support

### API Documentation
- FastAPI: Auto-generated (Swagger/ReDoc)
- Django REST Framework: Browsable API + schema generation
- Flask: flask-swagger or flasgger

### Monitoring
- **Sentry**: Error tracking
- **New Relic/Datadog**: APM
- **Prometheus**: Metrics
- **django-debug-toolbar**: Development profiling
