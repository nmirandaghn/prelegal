import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { parseStandardTerms, type Block } from "./nda";

// The templates live in the repository root, one level above this app.
// `next dev` and `next build` both run with the frontend/ directory as cwd.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

/** Load and parse the Common Paper Mutual NDA Standard Terms. */
export async function getMutualNdaTerms(): Promise<Block[]> {
  "use cache";
  cacheLife("max");
  const markdown = await readFile(
    path.join(TEMPLATES_DIR, "Mutual-NDA.md"),
    "utf8",
  );
  return parseStandardTerms(markdown);
}
