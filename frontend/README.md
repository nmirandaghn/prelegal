# Prelegal frontend

Mutual NDA creator. See the [root README](../README.md#frontend) for setup.

- `app/page.tsx` loads and parses `../templates/Mutual-NDA.md` on the server.
- `lib/nda.ts` holds the form model, template parser and cover-page content.
- `components/NdaPreview.tsx` (HTML) and `components/NdaPdf.tsx` (PDF) render the same parsed model.
