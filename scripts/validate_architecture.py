#!/usr/bin/env python3
"""
Validate ARCHITECTURE.md for completeness and consistency.
Checks that all required sections are present and have content.
"""

import sys
import re
from pathlib import Path


# Required sections in ARCHITECTURE.md
REQUIRED_SECTIONS = [
    "1. Project Structure",
    "2. High-Level System Diagram",
    "3. Core Components",
    "4. Data Stores",
    "5. External Integrations / APIs",
    "6. Deployment & Infrastructure",
    "7. Security Considerations",
    "8. Development & Testing Environment",
    "9. Future Considerations / Roadmap",
    "10. Project Identification",
    "11. Glossary / Acronyms"
]


def validate_architecture(file_path):
    """Validate ARCHITECTURE.md file."""
    
    if not Path(file_path).exists():
        return False, [f"File not found: {file_path}"]
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    issues = []
    warnings = []
    
    # Check for required sections
    missing_sections = []
    for section in REQUIRED_SECTIONS:
        # Create regex pattern that matches section headings
        pattern = re.compile(rf'^##\s+{re.escape(section)}', re.MULTILINE)
        if not pattern.search(content):
            missing_sections.append(section)
    
    if missing_sections:
        issues.append(f"Missing required sections: {', '.join(missing_sections)}")
    
    # Check if sections have content (not just placeholders)
    empty_sections = []
    lines = content.split('\n')
    current_section = None
    section_content = []
    
    for line in lines:
        if line.startswith('## '):
            # Save previous section
            if current_section and len(section_content) < 3:
                # Section has fewer than 3 lines of content
                if not any('[' in l or 'TODO' in l.upper() for l in section_content):
                    empty_sections.append(current_section)
            # Start new section
            current_section = line.strip('# ').strip()
            section_content = []
        elif line.strip() and not line.startswith('#'):
            section_content.append(line)
    
    # Check last section
    if current_section and len(section_content) < 3:
        if not any('[' in l or 'TODO' in l.upper() for l in section_content):
            empty_sections.append(current_section)
    
    if empty_sections:
        warnings.append(f"Sections with minimal content: {', '.join(empty_sections[:3])}")
    
    # Check for placeholder text
    placeholders = ['[TODO]', '[FILL IN]', '[INSERT', '[e.g.,']
    placeholder_count = sum(content.count(p) for p in placeholders)
    if placeholder_count > 10:
        warnings.append(f"Found {placeholder_count} placeholders - consider filling them in")
    
    # Check for Project Identification fields
    required_fields = ['Project Name:', 'Repository URL:', 'Primary Contact', 'Date of Last Update:']
    missing_fields = []
    for field in required_fields:
        if field not in content:
            missing_fields.append(field)
    
    if missing_fields:
        warnings.append(f"Missing project identification fields: {', '.join(missing_fields)}")
    
    # Report results
    if issues:
        return False, issues
    
    return True, warnings


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python validate_architecture.py <path-to-ARCHITECTURE.md>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    valid, messages = validate_architecture(file_path)
    
    if valid:
        print("✅ ARCHITECTURE.md validation PASSED")
        if messages:
            print("\n⚠️  Warnings:")
            for msg in messages:
                print(f"   - {msg}")
        sys.exit(0)
    else:
        print("❌ ARCHITECTURE.md validation FAILED")
        print("\n❌ Issues:")
        for msg in messages:
            print(f"   - {msg}")
        sys.exit(1)


if __name__ == "__main__":
    main()
