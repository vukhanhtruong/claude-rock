#!/usr/bin/env python3
"""
Generate Mermaid.js diagrams for architecture documentation.
Creates 5 essential diagrams: C4 Context, Container, Component, Data Flow, and Deployment.
"""

import sys
import json
from typing import Dict, List, Any


def generate_c4_context(system_info: Dict[str, Any]) -> str:
    """Generate C4 Level 1: System Context diagram."""
    system_name = system_info.get('system_name', 'System')
    users = system_info.get('users', [])
    external_systems = system_info.get('external_systems', [])
    
    diagram = f"""```mermaid
C4Context
    title System Context - {system_name}
"""
    
    # Add users
    for i, user in enumerate(users):
        user_id = user.get('id', f'user{i}')
        user_name = user.get('name', f'User {i}')
        user_desc = user.get('description', 'System user')
        diagram += f'    Person({user_id}, "{user_name}", "{user_desc}")\n'
    
    # Add main system
    system_desc = system_info.get('description', 'Core system functionality')
    diagram += f'    System(system, "{system_name}", "{system_desc}")\n'
    
    # Add external systems
    for i, ext_sys in enumerate(external_systems):
        ext_id = ext_sys.get('id', f'ext{i}')
        ext_name = ext_sys.get('name', f'External System {i}')
        ext_desc = ext_sys.get('description', 'Third-party service')
        diagram += f'    System_Ext({ext_id}, "{ext_name}", "{ext_desc}")\n'
    
    diagram += '\n'
    
    # Add relationships
    for user in users:
        user_id = user.get('id', f'user{len(users)}')
        rel = user.get('relationship', 'uses')
        diagram += f'    Rel({user_id}, system, "{rel}")\n'
    
    for ext_sys in external_systems:
        ext_id = ext_sys.get('id', f'ext{len(external_systems)}')
        rel = ext_sys.get('relationship', 'integrates with')
        diagram += f'    Rel(system, {ext_id}, "{rel}")\n'
    
    diagram += '```'
    return diagram


def generate_c4_container(system_info: Dict[str, Any]) -> str:
    """Generate C4 Level 2: Container diagram."""
    system_name = system_info.get('system_name', 'System')
    containers = system_info.get('containers', [])
    external_systems = system_info.get('external_systems', [])
    
    diagram = f"""```mermaid
C4Container
    title Container Diagram - {system_name}
    
    Person(user, "User", "System user")
    
    System_Boundary(system, "{system_name}") {{
"""
    
    # Add containers
    for container in containers:
        cont_id = container.get('id', 'container')
        cont_name = container.get('name', 'Container')
        cont_tech = container.get('technology', 'Technology')
        cont_desc = container.get('description', 'Container description')
        diagram += f'        Container({cont_id}, "{cont_name}", "{cont_tech}", "{cont_desc}")\n'
    
    diagram += '    }\n\n'
    
    # Add external systems (simplified)
    for ext_sys in external_systems[:2]:  # Limit to 2 for clarity
        ext_id = ext_sys.get('id', 'ext')
        ext_name = ext_sys.get('name', 'External System')
        ext_desc = ext_sys.get('description', 'External service')
        diagram += f'    System_Ext({ext_id}, "{ext_name}", "{ext_desc}")\n'
    
    diagram += '\n'
    
    # Add relationships
    relationships = system_info.get('container_relationships', [])
    for rel in relationships:
        from_id = rel.get('from', '')
        to_id = rel.get('to', '')
        desc = rel.get('description', 'interacts')
        protocol = rel.get('protocol', '')
        if protocol:
            diagram += f'    Rel({from_id}, {to_id}, "{desc} [{protocol}]")\n'
        else:
            diagram += f'    Rel({from_id}, {to_id}, "{desc}")\n'
    
    diagram += '```'
    return diagram


def generate_c4_component(system_info: Dict[str, Any]) -> str:
    """Generate C4 Level 3: Component diagram for main container."""
    container_name = system_info.get('main_container_name', 'API Service')
    components = system_info.get('components', [])
    
    diagram = f"""```mermaid
C4Component
    title Component Diagram - {container_name}
    
    Container_Boundary(container, "{container_name}") {{
"""
    
    # Add components
    for comp in components:
        comp_id = comp.get('id', 'component')
        comp_name = comp.get('name', 'Component')
        comp_tech = comp.get('technology', 'Technology')
        comp_desc = comp.get('description', 'Component description')
        diagram += f'        Component({comp_id}, "{comp_name}", "{comp_tech}", "{comp_desc}")\n'
    
    diagram += '    }\n\n'
    
    # Add external dependencies
    ext_deps = system_info.get('component_dependencies', [])
    for dep in ext_deps:
        dep_id = dep.get('id', 'dep')
        dep_name = dep.get('name', 'Dependency')
        dep_type = dep.get('type', 'Database')
        dep_tech = dep.get('technology', 'Technology')
        
        if 'db' in dep_type.lower() or 'database' in dep_type.lower():
            diagram += f'    ContainerDb({dep_id}, "{dep_name}", "{dep_tech}", "{dep_type}")\n'
        else:
            diagram += f'    System_Ext({dep_id}, "{dep_name}", "{dep_type}")\n'
    
    diagram += '\n'
    
    # Add component relationships
    comp_rels = system_info.get('component_relationships', [])
    for rel in comp_rels:
        from_id = rel.get('from', '')
        to_id = rel.get('to', '')
        desc = rel.get('description', 'uses')
        diagram += f'    Rel({from_id}, {to_id}, "{desc}")\n'
    
    diagram += '```'
    return diagram


def generate_data_flow(system_info: Dict[str, Any]) -> str:
    """Generate Data Flow Diagram."""
    diagram = """```mermaid
flowchart LR
    subgraph sources["📥 Data Sources"]
"""
    
    # Data sources
    data_sources = system_info.get('data_sources', [])
    for source in data_sources:
        source_id = source.get('id', 'source')
        source_name = source.get('name', 'Source')
        diagram += f'        {source_id}["{source_name}"]\n'
    
    diagram += '    end\n\n'
    diagram += '    subgraph processes["⚙️ Data Processing"]\n'
    
    # Processing steps
    processes = system_info.get('data_processes', [])
    for process in processes:
        proc_id = process.get('id', 'process')
        proc_name = process.get('name', 'Process')
        diagram += f'        {proc_id}["{proc_name}"]\n'
    
    diagram += '    end\n\n'
    diagram += '    subgraph storage["💾 Data Storage"]\n'
    
    # Storage
    storages = system_info.get('data_storage', [])
    for store in storages:
        store_id = store.get('id', 'store')
        store_name = store.get('name', 'Storage')
        store_tech = store.get('technology', '')
        if store_tech:
            diagram += f'        {store_id}["{store_name}<br/>({store_tech})"]\n'
        else:
            diagram += f'        {store_id}["{store_name}"]\n'
    
    diagram += '    end\n\n'
    diagram += '    subgraph outputs["📤 Data Outputs"]\n'
    
    # Outputs
    outputs = system_info.get('data_outputs', [])
    for output in outputs:
        out_id = output.get('id', 'output')
        out_name = output.get('name', 'Output')
        diagram += f'        {out_id}["{out_name}"]\n'
    
    diagram += '    end\n\n'
    
    # Add flows
    flows = system_info.get('data_flows', [])
    for flow in flows:
        from_id = flow.get('from', '')
        to_id = flow.get('to', '')
        label = flow.get('label', 'data')
        diagram += f'    {from_id} -->|"{label}"| {to_id}\n'
    
    diagram += '```'
    return diagram


def generate_deployment(system_info: Dict[str, Any]) -> str:
    """Generate C4 Deployment diagram."""
    system_name = system_info.get('system_name', 'System')
    cloud_provider = system_info.get('cloud_provider', 'Cloud Provider')
    
    diagram = f"""```mermaid
C4Deployment
    title Deployment Diagram - {system_name}
    
"""
    
    # Generate deployment nodes
    deployment_nodes = system_info.get('deployment_nodes', [])
    
    for node in deployment_nodes:
        node_id = node.get('id', 'node')
        node_name = node.get('name', 'Node')
        node_tech = node.get('technology', 'Technology')
        containers = node.get('containers', [])
        nested_nodes = node.get('nested_nodes', [])
        
        diagram += f'    Deployment_Node({node_id}, "{node_name}", "{node_tech}") {{\n'
        
        # Add nested nodes if any
        for nested in nested_nodes:
            nested_id = nested.get('id', 'nested')
            nested_name = nested.get('name', 'Node')
            nested_tech = nested.get('technology', 'Tech')
            nested_containers = nested.get('containers', [])
            
            diagram += f'        Deployment_Node({nested_id}, "{nested_name}", "{nested_tech}") {{\n'
            
            for cont in nested_containers:
                cont_id = cont.get('id', 'cont')
                cont_name = cont.get('name', 'Container')
                cont_tech = cont.get('technology', 'Tech')
                cont_desc = cont.get('description', 'Description')
                
                if 'db' in cont_name.lower() or 'database' in cont_name.lower():
                    diagram += f'            ContainerDb({cont_id}, "{cont_name}", "{cont_tech}", "{cont_desc}")\n'
                else:
                    diagram += f'            Container({cont_id}, "{cont_name}", "{cont_tech}", "{cont_desc}")\n'
            
            diagram += '        }\n'
        
        # Add direct containers
        for cont in containers:
            cont_id = cont.get('id', 'cont')
            cont_name = cont.get('name', 'Container')
            cont_tech = cont.get('technology', 'Tech')
            cont_desc = cont.get('description', 'Description')
            
            if 'db' in cont_name.lower() or 'database' in cont_name.lower():
                diagram += f'        ContainerDb({cont_id}, "{cont_name}", "{cont_tech}", "{cont_desc}")\n'
            else:
                diagram += f'        Container({cont_id}, "{cont_name}", "{cont_tech}", "{cont_desc}")\n'
        
        diagram += '    }\n\n'
    
    # Add relationships
    deployment_rels = system_info.get('deployment_relationships', [])
    for rel in deployment_rels:
        from_id = rel.get('from', '')
        to_id = rel.get('to', '')
        desc = rel.get('description', 'connects')
        protocol = rel.get('protocol', '')
        
        if protocol:
            diagram += f'    Rel({from_id}, {to_id}, "{desc}", "{protocol}")\n'
        else:
            diagram += f'    Rel({from_id}, {to_id}, "{desc}")\n'
    
    diagram += '```'
    return diagram


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python generate_mermaid.py <config_json>")
        print("\nConfig JSON should contain system architecture information")
        sys.exit(1)
    
    # Load configuration
    try:
        config = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        sys.exit(1)
    
    # Generate all 5 diagrams
    diagrams = {
        'c4_context': generate_c4_context(config),
        'c4_container': generate_c4_container(config),
        'c4_component': generate_c4_component(config),
        'data_flow': generate_data_flow(config),
        'deployment': generate_deployment(config)
    }
    
    # Output diagrams
    print("### Diagram 1: System Context (C4 Level 1)\n")
    print("**Description**: Shows the system in context with external users and systems\n")
    print(diagrams['c4_context'])
    print("\n---\n")
    
    print("### Diagram 2: Container Diagram (C4 Level 2)\n")
    print("**Description**: Shows the main technical components and their relationships\n")
    print(diagrams['c4_container'])
    print("\n---\n")
    
    print("### Diagram 3: Component Diagram (C4 Level 3)\n")
    print("**Description**: Shows internal components of the main container\n")
    print(diagrams['c4_component'])
    print("\n---\n")
    
    print("### Diagram 4: Data Flow Diagram\n")
    print("**Description**: Shows how data moves through the system\n")
    print(diagrams['data_flow'])
    print("\n---\n")
    
    print("### Diagram 5: Deployment Diagram\n")
    print("**Description**: Shows infrastructure and deployment topology\n")
    print(diagrams['deployment'])


if __name__ == "__main__":
    main()
