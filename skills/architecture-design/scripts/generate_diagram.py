#!/usr/bin/env python3
"""
Generate ASCII/text-based system architecture diagrams.
Supports simple component and data flow diagrams.
"""

import sys
import json
from typing import List, Dict, Tuple


def generate_simple_diagram(components: List[str], connections: List[Tuple[str, str]]) -> str:
    """
    Generate a simple left-to-right component diagram.
    
    Args:
        components: List of component names
        connections: List of (from_component, to_component) tuples
    """
    diagram_lines = []
    
    # Create component boxes
    for i, component in enumerate(components):
        if i == 0:
            diagram_lines.append(f"[{component}]")
        else:
            # Add connection arrow
            prev = components[i-1]
            if (prev, component) in connections or (component, prev) in connections:
                diagram_lines.append("    |")
                diagram_lines.append("    v")
            else:
                diagram_lines.append("")
            diagram_lines.append(f"[{component}]")
    
    return "\n".join(diagram_lines)


def generate_layered_diagram(layers: Dict[str, List[str]]) -> str:
    """
    Generate a layered architecture diagram.
    
    Args:
        layers: Dict of layer_name -> [components]
    """
    diagram_lines = []
    
    for layer_name, components in layers.items():
        diagram_lines.append(f"\n{layer_name}:")
        diagram_lines.append("+" + "-" * 60 + "+")
        
        for component in components:
            # Center the component name
            padding = (58 - len(component)) // 2
            diagram_lines.append(f"| {' ' * padding}{component}{' ' * (58 - len(component) - padding)} |")
        
        diagram_lines.append("+" + "-" * 60 + "+")
        diagram_lines.append("        |")
        diagram_lines.append("        v")
    
    # Remove last arrow
    if diagram_lines:
        diagram_lines = diagram_lines[:-2]
    
    return "\n".join(diagram_lines)


def generate_flow_diagram(flow: List[Dict[str, str]]) -> str:
    """
    Generate a data flow diagram.
    
    Args:
        flow: List of dicts with 'from', 'to', 'label' keys
    """
    diagram_lines = []
    components_seen = set()
    
    for step in flow:
        from_comp = step['from']
        to_comp = step['to']
        label = step.get('label', '')
        
        if from_comp not in components_seen:
            diagram_lines.append(f"[{from_comp}]")
            components_seen.add(from_comp)
        
        # Add arrow with label
        arrow = f"    |--{label}-->" if label else "    |---->"
        diagram_lines.append(arrow)
        diagram_lines.append(f"[{to_comp}]")
        components_seen.add(to_comp)
    
    return "\n".join(diagram_lines)


def generate_c4_context_diagram(system: str, actors: List[str], external_systems: List[str]) -> str:
    """
    Generate a C4 Level 1 (System Context) diagram.
    
    Args:
        system: Name of the system being documented
        actors: List of user types/actors
        external_systems: List of external systems
    """
    diagram_lines = []
    
    # Add actors
    for actor in actors:
        diagram_lines.append(f"[{actor}]")
        diagram_lines.append("    |")
        diagram_lines.append("    v")
    
    # Add main system
    diagram_lines.append("+" + "=" * 40 + "+")
    diagram_lines.append(f"|{system.center(40)}|")
    diagram_lines.append("+" + "=" * 40 + "+")
    
    # Add external systems
    if external_systems:
        diagram_lines.append("    |")
        diagram_lines.append("    v")
        for ext_sys in external_systems:
            diagram_lines.append(f"[{ext_sys}] (External)")
            if ext_sys != external_systems[-1]:
                diagram_lines.append("    |")
    
    return "\n".join(diagram_lines)


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python generate_diagram.py <type> [json_config]")
        print("\nTypes:")
        print("  simple    - Simple component flow")
        print("  layered   - Layered architecture")
        print("  flow      - Data flow diagram")
        print("  c4        - C4 context diagram")
        print("\nExamples:")
        print('  python generate_diagram.py simple \'{"components": ["User", "API", "DB"], "connections": [["User", "API"], ["API", "DB"]]}\'')
        print('  python generate_diagram.py layered \'{"Presentation": ["Web UI", "Mobile App"], "Business": ["API Service"], "Data": ["Database"]}\'')
        sys.exit(1)
    
    diagram_type = sys.argv[1].lower()
    
    if diagram_type == "simple":
        if len(sys.argv) < 3:
            # Default simple example
            components = ["User", "Frontend", "Backend", "Database"]
            connections = [("User", "Frontend"), ("Frontend", "Backend"), ("Backend", "Database")]
        else:
            config = json.loads(sys.argv[2])
            components = config.get('components', [])
            connections = [tuple(c) for c in config.get('connections', [])]
        
        print(generate_simple_diagram(components, connections))
    
    elif diagram_type == "layered":
        if len(sys.argv) < 3:
            # Default layered example
            layers = {
                "Presentation Layer": ["Web Interface", "Mobile App"],
                "Application Layer": ["Business Logic", "API Service"],
                "Data Layer": ["Database", "Cache"]
            }
        else:
            layers = json.loads(sys.argv[2])
        
        print(generate_layered_diagram(layers))
    
    elif diagram_type == "flow":
        if len(sys.argv) < 3:
            # Default flow example
            flow = [
                {"from": "User", "to": "API Gateway", "label": "request"},
                {"from": "API Gateway", "to": "Service", "label": "route"},
                {"from": "Service", "to": "Database", "label": "query"}
            ]
        else:
            flow = json.loads(sys.argv[2])
        
        print(generate_flow_diagram(flow))
    
    elif diagram_type == "c4":
        if len(sys.argv) < 3:
            # Default C4 example
            system = "My Application"
            actors = ["End User", "Administrator"]
            external_systems = ["Payment Gateway", "Email Service"]
        else:
            config = json.loads(sys.argv[2])
            system = config.get('system', 'System')
            actors = config.get('actors', [])
            external_systems = config.get('external_systems', [])
        
        print(generate_c4_context_diagram(system, actors, external_systems))
    
    else:
        print(f"Unknown diagram type: {diagram_type}")
        print("Available types: simple, layered, flow, c4")
        sys.exit(1)


if __name__ == "__main__":
    main()
