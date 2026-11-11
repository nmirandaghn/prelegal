import { readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { parseStandardTerms, type Block } from "./nda";

// next.config.ts sets TEMPLATES_DIR to an absolute path. It is looked up with a
// variable key on purpose: a literal `process.env.TEMPLATES_DIR` would be inlined
// at build time and Turbopack would then try to trace the file, which lives
// outside this app's root. The fallback only matters outside Next.
const TEMPLATES_DIR_VAR = "TEMPLATES_DIR";

function templatesDir(): string {
  return process.env[TEMPLATES_DIR_VAR] ?? path.join(process.cwd(), "..", "templates");
}

/** Load and parse the Common Paper Mutual NDA Standard Terms. */
export async function getMutualNdaTerms(): Promise<Block[]> {
  "use cache";
  cacheLife("max");
  const markdown = await readFile(path.join(templatesDir(), "Mutual-NDA.md"), "utf8");
  return parseStandardTerms(markdown);
}
