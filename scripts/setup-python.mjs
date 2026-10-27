#!/usr/bin/env node
/**
 * Cross-platform Python environment setup for the data update scripts
 * (src/config/{f1,f2,f1a}/api_update.py, format.py, scrape_standings.py).
 *
 * - Finds a system Python 3 (py launcher, python3, or python)
 * - Creates ./.venv if missing
 * - Installs requirements.txt into the venv
 * - Installs Playwright's Chromium browser
 *
 * Runs automatically on `npm install` (postinstall) and can be re-run with
 * `npm run py:install`. Never fails `npm install`: if Python is missing it
 * prints instructions and exits 0. Pass --strict to exit non-zero instead.
 * Set SKIP_PYTHON_SETUP=1 to skip entirely (e.g. CI / production builds).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";
const strict = process.argv.includes("--strict");
const venvDir = path.join(root, ".venv");
const venvPython = path.join(venvDir, isWin ? "Scripts" : "bin", isWin ? "python.exe" : "python");
const requirements = path.join(root, "requirements.txt");

const log = (msg) => console.log(`[python-setup] ${msg}`);
const fail = (msg) => {
  console.warn(`\n[python-setup] ⚠  ${msg}`);
  console.warn(
    "[python-setup] The admin 'api_update.py' buttons will not work until this is fixed.\n" +
      "[python-setup] Install Python 3.9+ from https://www.python.org/downloads/ then run: npm run py:install\n",
  );
  process.exit(strict ? 1 : 0);
};

if (process.env.SKIP_PYTHON_SETUP) {
  log("SKIP_PYTHON_SETUP set, skipping.");
  process.exit(0);
}

const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" }).status === 0;

function findSystemPython() {
  const candidates = [
    process.env.PYTHON_CMD && [process.env.PYTHON_CMD, []],
    isWin && ["py", ["-3"]],
    ["python3", []],
    ["python", []],
  ].filter(Boolean);
  for (const [cmd, pre] of candidates) {
    const r = spawnSync(cmd, [...pre, "-c", "import sys; print(sys.version_info >= (3, 9))"], {
      encoding: "utf8",
    });
    if (r.status === 0 && r.stdout.trim() === "True") return [cmd, pre];
  }
  return null;
}

if (!existsSync(venvPython)) {
  const sys = findSystemPython();
  if (!sys) fail("No Python 3.9+ found on PATH (tried py, python3, python).");
  const [cmd, pre] = sys;
  log(`Creating virtual environment in .venv using '${cmd}'...`);
  if (!run(cmd, [...pre, "-m", "venv", venvDir]) || !existsSync(venvPython)) {
    fail(
      "Failed to create .venv." +
        (isWin ? "" : " On Debian/Ubuntu you may need: sudo apt install python3-venv"),
    );
  }
} else {
  log("Using existing .venv");
}

log("Installing Python packages from requirements.txt...");
if (!run(venvPython, ["-m", "pip", "install", "-r", requirements])) {
  fail("pip install -r requirements.txt failed (see output above).");
}

log("Installing Playwright Chromium browser...");
if (!run(venvPython, ["-m", "playwright", "install", "chromium"])) {
  fail("playwright install chromium failed (see output above).");
}

log("✔ Python environment ready (.venv)");
