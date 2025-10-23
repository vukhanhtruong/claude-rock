#!/usr/bin/env python3
"""
Helm Chart Scaffolding Script
Generates production-ready Helm charts with best practices
"""

import os
import shutil
import argparse
from pathlib import Path
from typing import Dict, List, Optional


def replace_placeholder(content: str, chart_name: str) -> str:
    """Replace CHARTNAME placeholder with actual chart name"""
    return content.replace("CHARTNAME", chart_name)


def create_chart_structure(
    chart_name: str,
    output_dir: str,
    workload_type: str = "deployment",
    include_ingress: bool = False,
    include_hpa: bool = False,
    include_configmap: bool = False,
) -> None:
    """
    Create Helm chart directory structure and files
    
    Args:
        chart_name: Name of the Helm chart
        output_dir: Directory where chart will be created
        workload_type: Type of workload (deployment, statefulset, job, cronjob)
        include_ingress: Whether to include Ingress resource
        include_hpa: Whether to include HorizontalPodAutoscaler
        include_configmap: Whether to include ConfigMap
    """
    # Get templates directory
    script_dir = Path(__file__).parent.parent
    templates_dir = script_dir / "assets" / "templates"
    
    # Create chart directory
    chart_dir = Path(output_dir) / chart_name
    chart_dir.mkdir(parents=True, exist_ok=True)
    
    # Create templates subdirectory
    templates_output_dir = chart_dir / "templates"
    templates_output_dir.mkdir(exist_ok=True)
    
    print(f"📦 Creating Helm chart: {chart_name}")
    print(f"📂 Output directory: {chart_dir}")
    
    # Copy Chart.yaml
    chart_yaml_src = templates_dir / "Chart.yaml"
    chart_yaml_dst = chart_dir / "Chart.yaml"
    with open(chart_yaml_src, 'r') as f:
        content = replace_placeholder(f.read(), chart_name)
    with open(chart_yaml_dst, 'w') as f:
        f.write(content)
    print("✅ Created Chart.yaml")
    
    # Copy values.yaml
    values_yaml_src = templates_dir / "values.yaml"
    values_yaml_dst = chart_dir / "values.yaml"
    shutil.copy2(values_yaml_src, values_yaml_dst)
    print("✅ Created values.yaml")
    
    # Copy .helmignore
    helmignore_src = templates_dir / ".helmignore"
    helmignore_dst = chart_dir / ".helmignore"
    shutil.copy2(helmignore_src, helmignore_dst)
    print("✅ Created .helmignore")
    
    # Copy _helpers.tpl
    helpers_src = templates_dir / "_helpers.tpl"
    helpers_dst = templates_output_dir / "_helpers.tpl"
    with open(helpers_src, 'r') as f:
        content = replace_placeholder(f.read(), chart_name)
    with open(helpers_dst, 'w') as f:
        f.write(content)
    print("✅ Created templates/_helpers.tpl")
    
    # Copy NOTES.txt
    notes_src = templates_dir / "NOTES.txt"
    notes_dst = templates_output_dir / "NOTES.txt"
    with open(notes_src, 'r') as f:
        content = replace_placeholder(f.read(), chart_name)
    with open(notes_dst, 'w') as f:
        f.write(content)
    print("✅ Created templates/NOTES.txt")
    
    # Copy workload type template
    workload_templates = {
        "deployment": "deployment/deployment.yaml",
        "statefulset": "statefulset/statefulset.yaml",
        "job": "job/job.yaml",
        "cronjob": "cronjob/cronjob.yaml",
    }
    
    workload_src = templates_dir / workload_templates[workload_type]
    workload_dst = templates_output_dir / f"{workload_type}.yaml"
    with open(workload_src, 'r') as f:
        content = replace_placeholder(f.read(), chart_name)
    with open(workload_dst, 'w') as f:
        f.write(content)
    print(f"✅ Created templates/{workload_type}.yaml")
    
    # Copy Service (not for jobs)
    if workload_type in ["deployment", "statefulset"]:
        service_src = templates_dir / "service" / "service.yaml"
        service_dst = templates_output_dir / "service.yaml"
        with open(service_src, 'r') as f:
            content = replace_placeholder(f.read(), chart_name)
        with open(service_dst, 'w') as f:
            f.write(content)
        print("✅ Created templates/service.yaml")
    
    # Copy ServiceAccount
    sa_src = templates_dir / "rbac" / "serviceaccount.yaml"
    sa_dst = templates_output_dir / "serviceaccount.yaml"
    with open(sa_src, 'r') as f:
        content = replace_placeholder(f.read(), chart_name)
    with open(sa_dst, 'w') as f:
        f.write(content)
    print("✅ Created templates/serviceaccount.yaml")
    
    # Optionally copy Ingress
    if include_ingress:
        ingress_src = templates_dir / "ingress" / "ingress.yaml"
        ingress_dst = templates_output_dir / "ingress.yaml"
        with open(ingress_src, 'r') as f:
            content = replace_placeholder(f.read(), chart_name)
        with open(ingress_dst, 'w') as f:
            f.write(content)
        print("✅ Created templates/ingress.yaml")
    
    # Optionally copy HPA (only for deployment)
    if include_hpa and workload_type == "deployment":
        hpa_src = templates_dir / "hpa" / "hpa.yaml"
        hpa_dst = templates_output_dir / "hpa.yaml"
        with open(hpa_src, 'r') as f:
            content = replace_placeholder(f.read(), chart_name)
        with open(hpa_dst, 'w') as f:
            f.write(content)
        print("✅ Created templates/hpa.yaml")
    
    # Optionally copy ConfigMap
    if include_configmap:
        cm_src = templates_dir / "configmap" / "configmap.yaml"
        cm_dst = templates_output_dir / "configmap.yaml"
        with open(cm_src, 'r') as f:
            content = replace_placeholder(f.read(), chart_name)
        with open(cm_dst, 'w') as f:
            f.write(content)
        print("✅ Created templates/configmap.yaml")
    
    print(f"\n🎉 Chart '{chart_name}' created successfully at {chart_dir}")
    print(f"\nNext steps:")
    print(f"1. cd {chart_dir}")
    print(f"2. Edit values.yaml to configure your application")
    print(f"3. Run: helm lint .")
    print(f"4. Run: helm install {chart_name} .")


def main():
    parser = argparse.ArgumentParser(
        description="Generate production-ready Helm charts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create basic deployment chart
  %(prog)s my-app -o ./charts

  # Create statefulset with ingress
  %(prog)s my-db -o ./charts -t statefulset --ingress

  # Create job with configmap
  %(prog)s my-job -o ./charts -t job --configmap

  # Create deployment with HPA
  %(prog)s my-api -o ./charts --hpa
        """
    )
    
    parser.add_argument(
        "chart_name",
        help="Name of the Helm chart to create"
    )
    
    parser.add_argument(
        "-o", "--output",
        default=".",
        help="Output directory (default: current directory)"
    )
    
    parser.add_argument(
        "-t", "--type",
        choices=["deployment", "statefulset", "job", "cronjob"],
        default="deployment",
        help="Workload type (default: deployment)"
    )
    
    parser.add_argument(
        "--ingress",
        action="store_true",
        help="Include Ingress resource"
    )
    
    parser.add_argument(
        "--hpa",
        action="store_true",
        help="Include HorizontalPodAutoscaler (deployment only)"
    )
    
    parser.add_argument(
        "--configmap",
        action="store_true",
        help="Include ConfigMap resource"
    )
    
    args = parser.parse_args()
    
    create_chart_structure(
        chart_name=args.chart_name,
        output_dir=args.output,
        workload_type=args.type,
        include_ingress=args.ingress,
        include_hpa=args.hpa,
        include_configmap=args.configmap,
    )


if __name__ == "__main__":
    main()
