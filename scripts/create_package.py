#!/usr/bin/env python3
"""
Package architecture documentation into a comprehensive ZIP file.
Includes: ARCHITECTURE.md, OpenAPI spec, PDF, and diagram images.
"""

import sys
import os
import json
import subprocess
import shutil
from pathlib import Path
import zipfile


def convert_markdown_to_pdf(md_file: str, output_pdf: str, work_dir: str) -> bool:
    """Convert markdown to PDF using pandoc if available, else create placeholder."""
    try:
        # Try using pandoc
        result = subprocess.run(
            ['pandoc', md_file, '-o', output_pdf, '--pdf-engine=pdflatex'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    # Fallback: Try weasyprint
    try:
        import markdown
        from weasyprint import HTML, CSS
        
        # Read markdown
        with open(md_file, 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # Convert to HTML
        html_content = markdown.markdown(md_content, extensions=['tables', 'fenced_code'])
        
        # Add styling
        styled_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 0 20px;
                }}
                h1, h2, h3 {{ color: #333; }}
                h1 {{ border-bottom: 2px solid #333; padding-bottom: 10px; }}
                h2 {{ border-bottom: 1px solid #666; padding-bottom: 5px; margin-top: 30px; }}
                code {{
                    background: #f4f4f4;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                }}
                pre {{
                    background: #f4f4f4;
                    padding: 15px;
                    border-radius: 5px;
                    overflow-x: auto;
                }}
                table {{
                    border-collapse: collapse;
                    width: 100%;
                    margin: 20px 0;
                }}
                th, td {{
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }}
                th {{
                    background-color: #f2f2f2;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        
        # Convert HTML to PDF
        HTML(string=styled_html).write_pdf(output_pdf)
        return True
        
    except ImportError:
        pass
    
    # Last resort: Create a simple text-based PDF notice
    notice = f"""PDF Generation Not Available

The required tools (pandoc or weasyprint) are not installed.
Please refer to the ARCHITECTURE.md file for the full documentation.

To generate a PDF manually:
1. Install pandoc: apt-get install pandoc texlive-latex-base
   OR
2. Install weasyprint: pip install markdown weasyprint --break-system-packages

Then run:
   pandoc {md_file} -o {output_pdf}
   OR
   python {os.path.abspath(__file__)} <work_dir>
"""
    
    # Create a simple text file as placeholder
    with open(output_pdf + '.txt', 'w') as f:
        f.write(notice)
    
    print(f"⚠️  PDF generation tools not available. Created notice file instead.")
    return False


def render_mermaid_diagrams(work_dir: str, diagrams_dir: str) -> list:
    """Render Mermaid diagrams to PNG images using mmdc if available."""
    
    # Find all .mmd files in work directory
    mmd_files = list(Path(work_dir).glob('*.mmd'))
    
    if not mmd_files:
        print("No .mmd files found to render")
        return []
    
    os.makedirs(diagrams_dir, exist_ok=True)
    rendered_files = []
    
    for mmd_file in mmd_files:
        output_file = os.path.join(diagrams_dir, mmd_file.stem + '.png')
        
        try:
            # Try using mermaid-cli (mmdc)
            result = subprocess.run(
                ['mmdc', '-i', str(mmd_file), '-o', output_file, '-b', 'transparent'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and os.path.exists(output_file):
                rendered_files.append(output_file)
                print(f"✅ Rendered: {mmd_file.name} → {os.path.basename(output_file)}")
            else:
                print(f"⚠️  Could not render: {mmd_file.name}")
        
        except (FileNotFoundError, subprocess.TimeoutExpired) as e:
            print(f"⚠️  mermaid-cli not available. Skipping diagram rendering.")
            print(f"   Install with: npm install -g @mermaid-js/mermaid-cli")
            break
    
    return rendered_files


def create_package_zip(work_dir: str, output_zip: str) -> bool:
    """Create a ZIP package with all documentation files in proper structure."""
    
    work_path = Path(work_dir)
    
    # Collect files to include
    files_to_include = []
    
    # ARCHITECTURE.md (required)
    arch_file = work_path / 'ARCHITECTURE.md'
    if arch_file.exists():
        files_to_include.append(('ARCHITECTURE.md', arch_file))
    else:
        print("❌ ARCHITECTURE.md not found!")
        return False
    
    # OpenAPI spec (if exists)
    openapi_file = work_path / 'openapi.json'
    if openapi_file.exists():
        files_to_include.append(('openapi.json', openapi_file))
    
    # PDF (if exists)
    pdf_file = work_path / 'ARCHITECTURE.pdf'
    pdf_exists = False
    if pdf_file.exists():
        files_to_include.append(('ARCHITECTURE.pdf', pdf_file))
        pdf_exists = True
    else:
        # Check for the txt notice
        pdf_txt = work_path / 'ARCHITECTURE.pdf.txt'
        if pdf_txt.exists():
            files_to_include.append(('PDF_GENERATION_NOTICE.txt', pdf_txt))
    
    # Find .mmd source files (should be in work_dir root)
    mmd_files = sorted(list(work_path.glob('*.mmd')))
    
    # Find diagram images (PNG/SVG)
    diagrams_dir = work_path / 'diagrams'
    diagram_files = []
    if diagrams_dir.exists():
        diagram_files = sorted(list(diagrams_dir.glob('*.png')) + list(diagrams_dir.glob('*.svg')))
    
    # Create ZIP with proper structure
    try:
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add main files at root
            for arc_name, file_path in files_to_include:
                zipf.write(file_path, arc_name)
                print(f"📦 Added: {arc_name}")
            
            # Add .mmd source files to diagrams/source/
            if mmd_files:
                for mmd_file in mmd_files:
                    arc_name = f"diagrams/source/{mmd_file.name}"
                    zipf.write(mmd_file, arc_name)
                    print(f"📦 Added: {arc_name}")
            
            # Add rendered diagram images to diagrams/
            if diagram_files:
                for diagram_file in diagram_files:
                    arc_name = f"diagrams/{diagram_file.name}"
                    zipf.write(diagram_file, arc_name)
                    print(f"📦 Added: {arc_name}")
        
        # Print summary
        print(f"\n✅ Package created: {output_zip}")
        print(f"\n📦 Package contents:")
        print(f"   ├── ARCHITECTURE.md")
        if pdf_exists:
            print(f"   ├── ARCHITECTURE.pdf")
        if openapi_file.exists():
            print(f"   ├── openapi.json")
        if mmd_files or diagram_files:
            print(f"   └── diagrams/")
            if diagram_files:
                for df in diagram_files:
                    print(f"       ├── {df.name}")
            if mmd_files:
                print(f"       └── source/")
                for mf in mmd_files:
                    print(f"           ├── {mf.name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating ZIP: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python create_package.py <work_directory> [output_zip]")
        print("\nThe work directory should contain:")
        print("  - ARCHITECTURE.md (required)")
        print("  - openapi.json (optional)")
        print("  - *.mmd files (optional, for diagram rendering)")
        sys.exit(1)
    
    work_dir = sys.argv[1]
    output_zip = sys.argv[2] if len(sys.argv) > 2 else os.path.join(work_dir, 'architecture-package.zip')
    
    if not os.path.exists(work_dir):
        print(f"❌ Work directory not found: {work_dir}")
        sys.exit(1)
    
    print(f"📦 Creating architecture documentation package...\n")
    print(f"Work directory: {work_dir}")
    print(f"Output ZIP: {output_zip}\n")
    
    # Step 1: Convert Markdown to PDF
    arch_md = os.path.join(work_dir, 'ARCHITECTURE.md')
    if os.path.exists(arch_md):
        print("📄 Converting ARCHITECTURE.md to PDF...")
        pdf_file = os.path.join(work_dir, 'ARCHITECTURE.pdf')
        convert_markdown_to_pdf(arch_md, pdf_file, work_dir)
        print()
    
    # Step 2: Render Mermaid diagrams
    diagrams_dir = os.path.join(work_dir, 'diagrams')
    print("🎨 Rendering Mermaid diagrams...")
    rendered = render_mermaid_diagrams(work_dir, diagrams_dir)
    if rendered:
        print(f"✅ Rendered {len(rendered)} diagram(s)")
    print()
    
    # Step 3: Create ZIP package
    print("📦 Creating ZIP package...")
    success = create_package_zip(work_dir, output_zip)
    
    if success:
        # Get file size
        size_mb = os.path.getsize(output_zip) / (1024 * 1024)
        print(f"\n✅ Package complete! Size: {size_mb:.2f} MB")
        print(f"📦 {output_zip}")
    else:
        print("\n❌ Package creation failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
