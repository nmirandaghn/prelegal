# prelegal
A platform for drafting common legal agreements

## Status

🚧 **This project is a work in progress.** It is under active development and is expected to be completed in one week (by approximately 17 November 2026). Features, structure and documentation may change in the meantime.

## Legal templates

The `templates/` directory holds the agreement templates the platform will modify for users, and `catalog.json` describes each one (name, category, description, file, and source repo and commit).

The templates are unmodified copies from the [Common Paper](https://github.com/CommonPaper) repositories, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [`templates/LICENSE`](templates/LICENSE) for the attribution and full license text.

## Frontend

`frontend/` is a [Next.js](https://nextjs.org) app (TypeScript, Tailwind, App Router) that creates a Mutual NDA. The user fills in a form, sees the agreement update live, and downloads it as a PDF. It reads `templates/Mutual-NDA.md` at build time.

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
npm run build   # production build
```
