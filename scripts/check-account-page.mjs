import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = readFileSync(join(root, "account.html"), "utf8");

const required = [
  "passkeyLoginButton",
  "addPasskeyButton",
  "registerPasskey",
  "signInWithPasskey",
  "recoveryEmailForm",
  "recoveryEmailCodeForm",
  "accountRecoveryRequestForm",
  "accountRecoveryVerifyForm",
  "accountRecoveryPasswordForm",
  "/api/account/recovery/reset-password",
  "@supabase/supabase-js@2.105.0"
];

for (const marker of required) {
  assert.ok(html.includes(marker), `account.html is missing required security feature: ${marker}`);
}

assert.ok(!html.includes("SUPABASE_SECRET_KEY"), "A server-only Supabase secret must never appear in account.html.");

const blocks = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)]
  .map((match) => ({ attributes: match[1], source: match[2] }))
  .filter((block) => block.source.trim().length > 0);

assert.ok(blocks.length >= 2, "Expected the passkey module and account-page script.");

const temp = mkdtempSync(join(tmpdir(), "mindit-account-check-"));
try {
  for (let i = 0; i < blocks.length; i += 1) {
    const file = join(temp, `inline-${i + 1}.mjs`);
    writeFileSync(file, blocks[i].source, "utf8");
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(result.status, 0, `Inline account script ${i + 1} has a syntax error:\\n${result.stderr || result.stdout}`);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log(`Mind-It account page OK: ${blocks.length} inline scripts checked; passkey and recovery controls present.`);
