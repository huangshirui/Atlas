#!/usr/bin/env python3
"""Validate AISR Atlas JSON Schemas and committed examples."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker, RefResolver
from jsonschema.exceptions import SchemaError, ValidationError

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_DIR = ROOT / "schemas" / "v0.1"
EXAMPLE_DIR = SCHEMA_DIR / "examples"

EXAMPLES = {
    "atlas-self.workspace.json": "workspace.schema.json",
    "atlas-self.draft.json": "draft.schema.json",
    "atlas-self.revision.json": "revision.schema.json",
    "atlas-self.layout.json": "layout.schema.json",
    "atlas-self.runtime-state.json": "runtime-state.schema.json",
    "atlas-self.work-state.json": "work-state.schema.json",
}


def load_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_schema_files() -> None:
    for path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        schema = load_json(path)
        if not isinstance(schema, dict):
            raise SchemaError(f"{path}: schema root must be an object")
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
            raise SchemaError(f"{path}: expected JSON Schema Draft 2020-12")
        Draft202012Validator.check_schema(schema)


def validate_examples() -> None:
    checker = FormatChecker()
    for example_name, schema_name in EXAMPLES.items():
        schema_path = SCHEMA_DIR / schema_name
        example_path = EXAMPLE_DIR / example_name
        schema = load_json(schema_path)
        instance = load_json(example_path)
        resolver = RefResolver(base_uri=schema_path.resolve().as_uri(), referrer=schema)
        validator = Draft202012Validator(schema, resolver=resolver, format_checker=checker)
        validator.validate(instance)


def main() -> int:
    try:
        validate_schema_files()
        validate_examples()
    except (OSError, json.JSONDecodeError, SchemaError, ValidationError) as exc:
        print(f"Schema validation failed: {exc}", file=sys.stderr)
        return 1

    print(
        f"Validated {len(list(SCHEMA_DIR.glob('*.schema.json')))} schemas "
        f"and {len(EXAMPLES)} examples."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
