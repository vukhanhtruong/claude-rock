#!/usr/bin/env python3
"""
Generate OpenAPI 3.0 specification from architecture information.
Creates a comprehensive API specification for the designed endpoints.
"""

import sys
import json
from typing import Dict, List, Any


def generate_openapi_spec(api_info: Dict[str, Any]) -> Dict[str, Any]:
    """Generate OpenAPI 3.0 specification."""
    
    system_name = api_info.get('system_name', 'API')
    version = api_info.get('version', '1.0.0')
    description = api_info.get('description', 'API for ' + system_name)
    base_url = api_info.get('base_url', 'https://api.example.com')
    
    spec = {
        "openapi": "3.0.3",
        "info": {
            "title": f"{system_name} API",
            "description": description,
            "version": version,
            "contact": {
                "name": api_info.get('contact_name', 'API Team'),
                "email": api_info.get('contact_email', 'api@example.com')
            }
        },
        "servers": [
            {
                "url": base_url,
                "description": api_info.get('server_description', 'Production server')
            }
        ],
        "paths": {},
        "components": {
            "schemas": {},
            "securitySchemes": {},
            "responses": {}
        },
        "tags": []
    }
    
    # Add security schemes
    auth_type = api_info.get('authentication', 'bearer')
    if auth_type == 'bearer' or auth_type == 'jwt':
        spec['components']['securitySchemes']['bearerAuth'] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
        spec['security'] = [{"bearerAuth": []}]
    elif auth_type == 'apikey':
        spec['components']['securitySchemes']['apiKey'] = {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key"
        }
        spec['security'] = [{"apiKey": []}]
    
    # Add common schemas
    spec['components']['schemas']['Error'] = {
        "type": "object",
        "properties": {
            "error": {
                "type": "string",
                "description": "Error message"
            },
            "code": {
                "type": "string",
                "description": "Error code"
            }
        },
        "required": ["error"]
    }
    
    # Add common responses
    spec['components']['responses']['UnauthorizedError'] = {
        "description": "Authentication information is missing or invalid",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/Error"
                }
            }
        }
    }
    
    spec['components']['responses']['NotFoundError'] = {
        "description": "The specified resource was not found",
        "content": {
            "application/json": {
                "schema": {
                    "$ref": "#/components/schemas/Error"
                }
            }
        }
    }
    
    # Add tags
    tags = api_info.get('tags', [])
    for tag in tags:
        spec['tags'].append({
            "name": tag.get('name', 'default'),
            "description": tag.get('description', '')
        })
    
    # Add schemas
    schemas = api_info.get('schemas', {})
    for schema_name, schema_def in schemas.items():
        spec['components']['schemas'][schema_name] = schema_def
    
    # Add endpoints
    endpoints = api_info.get('endpoints', [])
    for endpoint in endpoints:
        path = endpoint.get('path', '/')
        method = endpoint.get('method', 'get').lower()
        
        if path not in spec['paths']:
            spec['paths'][path] = {}
        
        operation = {
            "summary": endpoint.get('summary', ''),
            "description": endpoint.get('description', ''),
            "operationId": endpoint.get('operation_id', method + path.replace('/', '_')),
            "tags": endpoint.get('tags', ['default']),
            "responses": {}
        }
        
        # Add parameters
        parameters = endpoint.get('parameters', [])
        if parameters:
            operation['parameters'] = parameters
        
        # Add request body
        request_body = endpoint.get('request_body', None)
        if request_body:
            operation['requestBody'] = request_body
        
        # Add responses
        responses = endpoint.get('responses', {})
        if responses:
            operation['responses'] = responses
        else:
            # Default responses
            operation['responses'] = {
                "200": {
                    "description": "Successful operation",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object"
                            }
                        }
                    }
                },
                "401": {
                    "$ref": "#/components/responses/UnauthorizedError"
                },
                "404": {
                    "$ref": "#/components/responses/NotFoundError"
                }
            }
        
        spec['paths'][path][method] = operation
    
    return spec


def generate_default_crud_api(resource_name: str) -> Dict[str, Any]:
    """Generate a default CRUD API specification for a resource."""
    
    resource_lower = resource_name.lower()
    resource_title = resource_name.title()
    
    api_info = {
        "system_name": f"{resource_title} Management",
        "version": "1.0.0",
        "description": f"API for managing {resource_lower} resources",
        "base_url": "https://api.example.com/v1",
        "authentication": "bearer",
        "tags": [
            {
                "name": resource_lower,
                "description": f"{resource_title} operations"
            }
        ],
        "schemas": {
            resource_title: {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "format": "uuid",
                        "description": f"{resource_title} ID"
                    },
                    "name": {
                        "type": "string",
                        "description": f"{resource_title} name"
                    },
                    "createdAt": {
                        "type": "string",
                        "format": "date-time",
                        "description": "Creation timestamp"
                    },
                    "updatedAt": {
                        "type": "string",
                        "format": "date-time",
                        "description": "Last update timestamp"
                    }
                },
                "required": ["id", "name"]
            },
            f"{resource_title}Input": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": f"{resource_title} name"
                    }
                },
                "required": ["name"]
            }
        },
        "endpoints": [
            {
                "path": f"/{resource_lower}s",
                "method": "get",
                "summary": f"List all {resource_lower}s",
                "description": f"Retrieve a list of {resource_lower}s with pagination",
                "operation_id": f"list{resource_title}s",
                "tags": [resource_lower],
                "parameters": [
                    {
                        "name": "page",
                        "in": "query",
                        "description": "Page number",
                        "schema": {"type": "integer", "default": 1}
                    },
                    {
                        "name": "limit",
                        "in": "query",
                        "description": "Items per page",
                        "schema": {"type": "integer", "default": 20}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Successful operation",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "data": {
                                            "type": "array",
                                            "items": {
                                                "$ref": f"#/components/schemas/{resource_title}"
                                            }
                                        },
                                        "total": {"type": "integer"},
                                        "page": {"type": "integer"},
                                        "limit": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                "path": f"/{resource_lower}s",
                "method": "post",
                "summary": f"Create a new {resource_lower}",
                "description": f"Create a new {resource_lower} resource",
                "operation_id": f"create{resource_title}",
                "tags": [resource_lower],
                "request_body": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": f"#/components/schemas/{resource_title}Input"
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Created successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": f"#/components/schemas/{resource_title}"
                                }
                            }
                        }
                    }
                }
            },
            {
                "path": f"/{resource_lower}s/{{id}}",
                "method": "get",
                "summary": f"Get a {resource_lower} by ID",
                "description": f"Retrieve a specific {resource_lower} by its ID",
                "operation_id": f"get{resource_title}",
                "tags": [resource_lower],
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "description": f"{resource_title} ID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Successful operation",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": f"#/components/schemas/{resource_title}"
                                }
                            }
                        }
                    }
                }
            },
            {
                "path": f"/{resource_lower}s/{{id}}",
                "method": "put",
                "summary": f"Update a {resource_lower}",
                "description": f"Update an existing {resource_lower} resource",
                "operation_id": f"update{resource_title}",
                "tags": [resource_lower],
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "description": f"{resource_title} ID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "request_body": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "$ref": f"#/components/schemas/{resource_title}Input"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Updated successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "$ref": f"#/components/schemas/{resource_title}"
                                }
                            }
                        }
                    }
                }
            },
            {
                "path": f"/{resource_lower}s/{{id}}",
                "method": "delete",
                "summary": f"Delete a {resource_lower}",
                "description": f"Delete a {resource_lower} resource",
                "operation_id": f"delete{resource_title}",
                "tags": [resource_lower],
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "description": f"{resource_title} ID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "responses": {
                    "204": {
                        "description": "Deleted successfully"
                    }
                }
            }
        ]
    }
    
    return generate_openapi_spec(api_info)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python generate_openapi.py <config_json|resource_name>")
        print("\nExamples:")
        print("  python generate_openapi.py 'User'  # Generate default CRUD API")
        print("  python generate_openapi.py '{...}'  # Generate from JSON config")
        sys.exit(1)
    
    input_data = sys.argv[1]
    
    # Try to parse as JSON first
    try:
        config = json.loads(input_data)
        spec = generate_openapi_spec(config)
    except json.JSONDecodeError:
        # Treat as resource name for default CRUD API
        spec = generate_default_crud_api(input_data)
    
    # Output OpenAPI spec
    print(json.dumps(spec, indent=2))


if __name__ == "__main__":
    main()
