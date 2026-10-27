#!/usr/bin/env node
/**
 * Cross-platform runner for the Python update scripts.
 * Usage: node scripts/run-python.mjs <series> <script.py> [more.py ...]
 * e.g.   node scripts/run-python.mjs f2 api_update.py format.py
 * Uses ./.venv if present (run `npm run py:install` first).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const venvPython = path.join(root, ".venv", isWin ? "Scripts" : "bin", isWin ? "python.exe" : "python");

const [series, ...scripts] = process.argv.slice(2);
if (!series || scripts.length === 0) {
  console.error("Usage: node scripts/run-python.mjs <series> <script.py> [...]");
  process.exit(1);
}
if (!existsSync(venvPython)) {
  console.error("No .venv found. Run `npm run py:install` first.");
  process.exit(1);
}

const cwd = path.join(root, "src", "config", series);
for (const script of scripts) {
  console.log(`\n▶ ${series}/${script}`);
  const r = spawnSync(venvPython, [script], { cwd, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
