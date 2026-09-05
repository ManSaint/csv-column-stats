#!/usr/bin/env node
/**
 * PreToolUse gate for `git commit`.
 *
 * CLAUDE.md is context, not enforcement — Claude can decide to skip a rule written there.
 * This hook is enforcement: it runs the project's own checks and denies the commit if any
 * fail, regardless of what the model concluded.
 *
 * Checks are skipped (not failed) when the script is absent from package.json, so this file
 * is safe to drop into a project that has no typecheck or tests yet.
 *
 * It re-checks the command itself rather than trusting settings.json's `if` filter, so a
 * client that ignores `if` cannot turn this into a full test run on every shell command.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_CHECKS = ["lint", "typecheck", "test"];
const TIMEOUT_MS = 10 * 60 * 1000;

const deny = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
};

// --- Self-filter: only gate real commits. -----------------------------------------
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  /* no stdin or not JSON — the command check below then sees "" and exits */
}

const command = payload?.tool_input?.command ?? "";
const GIT_COMMIT =
  /(^|[;&|]\s*)git\s+(?:-[cC]\s+\S+\s+|--(?:git-dir|work-tree|namespace|exec-path)(?:=\S+\s+|\s+\S+\s+)|-\S+\s+)*commit(\s|$)/;
if (!GIT_COMMIT.test(command)) process.exit(0);

if (/\s(--no-verify|-n)(\s|$)/.test(command)) {
  deny(
    "Commit blocked: --no-verify bypasses the project's checks. Run them and fix what fails.",
  );
}

// --- Run the project's own checks. ------------------------------------------------
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const pkgPath = join(root, "package.json");
if (!existsSync(pkgPath)) process.exit(0); // not a JS project — nothing to gate

let scripts = {};
let CHECKS = DEFAULT_CHECKS;
try {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  scripts = pkg.scripts ?? {};
  // Opt in to more (e.g. "test:a11y") with:  "claudeCommitGate": { "checks": [...] }
  const override = pkg.claudeCommitGate?.checks;
  if (Array.isArray(override) && override.length) CHECKS = override;
} catch {
  process.exit(0); // an unparseable package.json is not this hook's problem
}

// Match the project's package manager instead of assuming bun.
const runner =
  existsSync(join(root, "bun.lock")) || existsSync(join(root, "bun.lockb"))
    ? "bun"
    : existsSync(join(root, "pnpm-lock.yaml"))
      ? "pnpm"
      : "npm";

const failures = [];
let ran = 0;

for (const script of CHECKS) {
  if (!scripts[script]) continue;
  ran++;
  const res = spawnSync(runner, ["run", script], {
    cwd: root,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    const tail = `${res.stdout ?? ""}${res.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(-25)
      .join("\n");
    failures.push(
      `--- ${runner} run ${script} (exit ${res.status ?? "timed out"}) ---\n${tail}`,
    );
  }
}

if (failures.length) {
  deny(
    `Commit blocked: ${failures.length} of ${ran} pre-commit checks failed. ` +
      `Fix the cause — do not bypass this hook, weaken the check, or commit around it.\n\n` +
      failures.join("\n\n"),
  );
}

process.exit(0);
