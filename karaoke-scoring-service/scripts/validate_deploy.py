#!/usr/bin/env python3
"""
Pre-deploy validation for karaoke-scoring-service SAM template.

Checks for:
  - Reserved Lambda environment variables in template.yaml
  - Required files (Dockerfile, samconfig.toml, template.yaml)
  - Basic YAML structure

Usage:
  python scripts/validate_deploy.py
  python scripts/validate_deploy.py --template path/to/template.yaml
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Reserved keys that Lambda rejects when set via CloudFormation/SAM.
# https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
RESERVED_LAMBDA_ENV_VARS = {
    "AWS_REGION",
    "AWS_DEFAULT_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "AWS_LAMBDA_FUNCTION_NAME",
    "AWS_LAMBDA_FUNCTION_VERSION",
    "AWS_LAMBDA_FUNCTION_MEMORY_SIZE",
    "AWS_LAMBDA_LOG_GROUP_NAME",
    "AWS_LAMBDA_LOG_STREAM_NAME",
    "AWS_LAMBDA_RUNTIME_API",
    "AWS_EXECUTION_ENV",
    "LAMBDA_TASK_ROOT",
    "LAMBDA_RUNTIME_DIR",
    "_HANDLER",
    "TZ",
    "LANG",
    "LD_LIBRARY_PATH",
    "PATH",
    "PWD",
    "SHLVL",
    "_",
}

REQUIRED_FILES = (
    "template.yaml",
    "Dockerfile",
    "samconfig.toml",
    "requirements.txt",
    "app/main.py",
)


def find_env_var_keys(template_text: str) -> list[tuple[int, str]]:
    """Return (line_number, key) pairs for Variables blocks under Environment."""
    keys: list[tuple[int, str]] = []
    in_variables = False
    indent_level = 0

    for line_no, line in enumerate(template_text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if re.match(r"^Variables:\s*$", stripped):
            in_variables = True
            indent_level = len(line) - len(line.lstrip())
            continue

        if in_variables:
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= indent_level and stripped.endswith(":"):
                in_variables = False
                continue

            match = re.match(r"^([A-Z0-9_]+):", stripped)
            if match:
                keys.append((line_no, match.group(1)))

    return keys


def validate_template(template_path: Path) -> list[str]:
    errors: list[str] = []

    if not template_path.exists():
        return [f"Template not found: {template_path}"]

    text = template_path.read_text(encoding="utf-8")

    for line_no, key in find_env_var_keys(text):
        if key in RESERVED_LAMBDA_ENV_VARS:
            errors.append(
                f"{template_path}:{line_no}: reserved Lambda env var '{key}' must not be set in SAM template"
            )

    if "AWS::Serverless::Function" not in text:
        errors.append(f"{template_path}: missing AWS::Serverless::Function resource")

    if "RecordingsBucket" not in text and "AWS::S3::Bucket" not in text:
        errors.append(f"{template_path}: missing S3 bucket resource (AWS::S3::Bucket)")

    if "rds-db:connect" in text:
        rds_blocks = re.findall(
            r"rds-db:connect[\s\S]*?Resource:\s*(.+)",
            text,
        )
        for resource in rds_blocks:
            if resource.strip() in {'"*"', '"*"', "*"}:
                errors.append(
                    f"{template_path}: rds-db:connect policy must use a scoped dbuser ARN, not Resource: \"*\""
                )
                break

    return errors


def validate_required_files(service_root: Path) -> list[str]:
    errors: list[str] = []
    for relative in REQUIRED_FILES:
        path = service_root / relative
        if not path.exists():
            errors.append(f"Missing required file: {path}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate SAM deploy configuration")
    parser.add_argument(
        "--template",
        type=Path,
        default=None,
        help="Path to template.yaml (default: ../template.yaml from scripts/)",
    )
    args = parser.parse_args()

    service_root = Path(__file__).resolve().parent.parent
    template_path = args.template or (service_root / "template.yaml")

    errors: list[str] = []
    errors.extend(validate_required_files(service_root))
    errors.extend(validate_template(template_path))

    if errors:
        print("Deploy validation FAILED:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Deploy validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
