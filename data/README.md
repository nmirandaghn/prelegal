# Legal document template dataset

Structured templates that the system can later load, fill in from user answers, and modify.

> **Disclaimer:** These templates are general starting points, not legal advice. Have a qualified lawyer review any document before it is relied on.

## Templates

| ID | Name | Category |
| --- | --- | --- |
| `mutual-nda` | Mutual Non-Disclosure Agreement | confidentiality |
| `service-agreement` | Service Agreement | commercial |
| `independent-contractor-agreement` | Independent Contractor Agreement | employment |
| `residential-lease` | Residential Lease Agreement | real-estate |
| `employment-offer-letter` | Employment Offer Letter | employment |

## Format

Each template is one JSON file in `data/templates/`, named `<id>.json`.

```jsonc
{
  "id": "mutual-nda",            // must match the filename
  "name": "…",
  "category": "…",
  "version": "1.0.0",
  "description": "…",
  "fields": [                    // values the user supplies
    {
      "key": "party_a_name",     // lowercase snake_case, used as {{party_a_name}}
      "label": "Party A legal name",
      "type": "string",          // string | text | number | date
      "required": true,
      "default": "…",            // optional
      "help": "…"                // optional
    }
  ],
  "sections": [                  // ordered clauses of the document
    {
      "id": "parties",
      "title": "Parties",
      "required": true,          // false = optional clause the user may drop
      "text": "… {{party_a_name}} …"
    }
  ]
}
```

## Validation

```
python scripts/validate_templates.py
```

Checks that each file is valid, that every `{{placeholder}}` is declared in `fields`, and that every declared field is used. It needs only the Python standard library.

## Adding a template

1. Create `data/templates/<id>.json` following the format above.
2. Run the validator.
3. Add a row to the table in this file.
