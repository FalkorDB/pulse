/**
 * Minimal .env.local loader for CLI scripts (no dependency). Imported FIRST so
 * process.env is populated before any module that reads env at import time.
 */
import { readFileSync } from "fs";

for (const file of [".env.local", ".env"]) {
  try {
    const txt = readFileSync(file, "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // file not present — ignore
  }
}
