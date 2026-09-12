#!/usr/bin/env node
/**
 * Audit and clean stale payout data.
 *
 * Shops accumulate payment identifiers that outlive the Flutterwave account
 * they were minted under. A subaccount id is scoped to the merchant behind the
 * secret key, so a key switch (sandbox <-> live, or a different merchant
 * account) leaves ids that read as valid — non-null — but are rejected when a
 * payment link is created. The same migration left `paystack_subaccount_code`
 * values behind after the move to Flutterwave.
 *
 * This tool reports what is stale and, with --apply, clears it so vendors can
 * redo payout setup cleanly.
 *
 *   node scripts/reset-payout-data.mjs           # report only (dry run)
 *   node scripts/reset-payout-data.mjs --apply   # clear stale identifiers
 *
 * Clears only `flutterwave_subaccount_id` and `paystack_subaccount_code`.
 * The settlement_* columns are deliberately kept: they describe the vendor's
 * bank account, which is still correct, and they prefill the payout form.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

// ── Env ─────────────────────────────────────────────────────────────────────

function loadEnv() {
  let raw;
  try {
    raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  } catch {
    console.error("Could not read .env.local at the project root.");
    process.exit(1);
  }
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
  );
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const FLW_KEY = env.FLW_SECRET_KEY;

for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY],
]) {
  if (!value) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// ── Flutterwave ─────────────────────────────────────────────────────────────

/** Returns "valid" | "not_found" | "unavailable". */
async function checkSubaccount(subaccountId) {
  if (!FLW_KEY) return "unavailable";
  try {
    const res = await fetch(
      `https://api.flutterwave.com/v3/subaccounts/${encodeURIComponent(subaccountId)}`,
      { headers: { Authorization: `Bearer ${FLW_KEY}` } }
    );
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === "success" && body.data) return "valid";
    const message = String(body.message ?? "");
    if (/not found|does not exist|invalid subaccount/i.test(message)) {
      return "not_found";
    }
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

const isTestKey = FLW_KEY ? FLW_KEY.includes("TEST") : false;
console.log(
  `Flutterwave key: ${FLW_KEY ? (isTestKey ? "sandbox (test)" : "live") : "NOT CONFIGURED"}\n`
);

const shops = await (
  await fetch(
    `${SUPABASE_URL}/rest/v1/shops?select=id,name,paystack_subaccount_code,flutterwave_subaccount_id,settlement_account_number`,
    { headers: sbHeaders }
  )
).json();

if (!Array.isArray(shops)) {
  console.error("Failed to load shops:", JSON.stringify(shops));
  process.exit(1);
}

const toClearSubaccount = [];
const toClearPaystack = [];
let healthy = 0;

for (const shop of shops) {
  const notes = [];

  if (shop.flutterwave_subaccount_id) {
    const state = await checkSubaccount(shop.flutterwave_subaccount_id);
    if (state === "valid") {
      notes.push("subaccount valid");
    } else if (state === "not_found") {
      notes.push("subaccount NOT FOUND under current key -> stale, will clear");
      toClearSubaccount.push(shop);
    } else {
      notes.push("subaccount unverified (provider unreachable) -> left untouched");
    }
  } else {
    notes.push("no Flutterwave subaccount");
  }

  if (shop.paystack_subaccount_code) {
    notes.push("legacy Paystack code -> will clear");
    toClearPaystack.push(shop);
  }

  if (notes.every((n) => n === "subaccount valid")) healthy++;

  console.log(`${shop.name}`);
  for (const note of notes) console.log(`   - ${note}`);
}

console.log(
  `\n${shops.length} shops: ${healthy} healthy, ` +
    `${toClearSubaccount.length} stale subaccount id(s), ` +
    `${toClearPaystack.length} legacy Paystack code(s).`
);

if (toClearSubaccount.length === 0 && toClearPaystack.length === 0) {
  console.log("Nothing to clean.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply to clear the above.");
  process.exit(0);
}

console.log("\nApplying...");

for (const shop of toClearSubaccount) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shops?id=eq.${shop.id}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify({
      flutterwave_subaccount_id: null,
      updated_at: new Date().toISOString(),
    }),
  });
  console.log(`  cleared subaccount for "${shop.name}": HTTP ${res.status}`);
}

for (const shop of toClearPaystack) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shops?id=eq.${shop.id}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify({ paystack_subaccount_code: null }),
  });
  console.log(`  cleared Paystack code for "${shop.name}": HTTP ${res.status}`);
}

console.log(
  "\nDone. Affected vendors must redo payout setup at /seller/payout before their shops can take orders."
);
