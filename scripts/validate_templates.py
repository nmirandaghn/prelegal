#!/usr/bin/env python3
"""Validate the legal document templates in data/templates/.

Checks that every template is well-formed, that every {{placeholder}} used in
a section is declared in `fields`, and that every declared field is used.
Uses only the standard library. Exit code is non-zero if any check fails.
"""
import json
import re
import sys
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "data" / "templates"
PLACEHOLDER = re.compile(r"\{\{\s*([a-z][a-z0-9_]*)\s*\}\}")
FIELD_TYPES = {"string", "text", "number", "date"}
TOP_LEVEL = ("id", "name", "category", "version", "description", "fields", "sections")


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"invalid JSON: {exc}"]

    for key in TOP_LEVEL:
        if key not in doc:
            errors.append(f"missing top-level key '{key}'")
    if errors:
        return errors

    if doc["id"] != path.stem:
        errors.append(f"id '{doc['id']}' does not match filename '{path.stem}'")

    declared: set[str] = set()
    for field in doc["fields"]:
        key = field.get("key")
        if not key or not field.get("label"):
            errors.append(f"field missing key or label: {field}")
            continue
        if key in declared:
            errors.append(f"duplicate field key '{key}'")
        declared.add(key)
        if field.get("type") not in FIELD_TYPES:
            errors.append(f"field '{key}' has invalid type '{field.get('type')}'")
        if not isinstance(field.get("required"), bool):
            errors.append(f"field '{key}' needs boolean 'required'")

    used: set[str] = set()
    section_ids: set[str] = set()
    for section in doc["sections"]:
        sid = section.get("id")
        if not sid or not section.get("title") or not section.get("text"):
            errors.append(f"section missing id, title or text: {sid}")
            continue
        if sid in section_ids:
            errors.append(f"duplicate section id '{sid}'")
        section_ids.add(sid)
        if not isinstance(section.get("required"), bool):
            errors.append(f"section '{sid}' needs boolean 'required'")
        used.update(PLACEHOLDER.findall(section["text"]))

    for name in sorted(used - declared):
        errors.append(f"placeholder '{{{{{name}}}}}' used but not declared in fields")
    for name in sorted(declared - used):
        errors.append(f"field '{name}' declared but never used in a section")
    return errors


def main() -> int:
    files = sorted(TEMPLATES_DIR.glob("*.json"))
    if not files:
        print(f"No templates found in {TEMPLATES_DIR}")
        return 1
    failed = 0
    for path in files:
        errors = validate(path)
        if errors:
            failed += 1
            print(f"FAIL {path.name}")
            for err in errors:
                print(f"  - {err}")
        else:
            print(f"ok   {path.name}")
    print(f"\n{len(files) - failed}/{len(files)} templates valid")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
