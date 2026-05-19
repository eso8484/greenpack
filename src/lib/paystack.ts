/**
 * Paystack REST API helpers
 *
 * All helpers require `PAYSTACK_SECRET_KEY` in the environment. They throw a
 * friendly `Error` on failure so callers can `.catch()` and surface the
 * message to the user via toast / JSON response.
 *
 * Server-only — never import this module from a "use client" component.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }
  return key;
}

interface PaystackResponse<T> {
  status: boolean;
  message?: string;
  data?: T;
}

async function paystackFetch<T>(
  path: string,
  init: RequestInit & { method?: string } = {}
): Promise<T> {
  const secret = getSecret();
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: PaystackResponse<T>;
  try {
    payload = (await response.json()) as PaystackResponse<T>;
  } catch {
    throw new Error(
      `Paystack returned an invalid response (status ${response.status})`
    );
  }

  if (!response.ok || !payload.status || !payload.data) {
    const message =
      typeof payload.message === "string" && payload.message.length > 0
        ? payload.message
        : `Paystack request failed (status ${response.status})`;
    throw new Error(message);
  }

  return payload.data;
}

// ─── Banks ────────────────────────────────────────────────────────────────────

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  country: string;
  currency: string;
  type: string;
  active: boolean;
}

/**
 * GET /bank?country=nigeria — list all supported Nigerian banks.
 */
export async function paystackListBanks(): Promise<PaystackBank[]> {
  return paystackFetch<PaystackBank[]>("/bank?country=nigeria", {
    method: "GET",
  });
}

// ─── Account resolution ───────────────────────────────────────────────────────

export interface PaystackResolvedAccount {
  account_number: string;
  account_name: string;
  bank_id?: number;
}

/**
 * GET /bank/resolve — verify a bank account belongs to the named holder.
 */
export async function paystackResolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<PaystackResolvedAccount> {
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Account number must be 10 digits");
  }
  if (!bankCode) {
    throw new Error("Bank code is required");
  }

  const query = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode,
  });

  return paystackFetch<PaystackResolvedAccount>(
    `/bank/resolve?${query.toString()}`,
    { method: "GET" }
  );
}

// ─── Subaccounts (split payments to vendors) ──────────────────────────────────

export interface PaystackSubaccount {
  id: number;
  subaccount_code: string;
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  is_verified: boolean;
}

export interface CreateSubaccountParams {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  /** Percentage of each transaction kept by the subaccount (e.g. 97 = 97%). */
  percentage_charge: number;
}

/**
 * POST /subaccount — create a Paystack subaccount for vendor payouts.
 */
export async function paystackCreateSubaccount(
  params: CreateSubaccountParams
): Promise<PaystackSubaccount> {
  return paystackFetch<PaystackSubaccount>("/subaccount", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Transfer recipients (courier payouts) ────────────────────────────────────

export interface PaystackTransferRecipient {
  id: number;
  recipient_code: string;
  type: string;
  name: string;
  details: {
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
  };
  currency: string;
}

export interface CreateTransferRecipientParams {
  name: string;
  account_number: string;
  bank_code: string;
}

/**
 * POST /transferrecipient — create a NUBAN recipient used for outgoing
 * transfers (e.g. courier payouts).
 */
export async function paystackCreateTransferRecipient(
  params: CreateTransferRecipientParams
): Promise<PaystackTransferRecipient> {
  return paystackFetch<PaystackTransferRecipient>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({
      type: "nuban",
      currency: "NGN",
      ...params,
    }),
  });
}

// ─── Outgoing transfers (paying couriers) ─────────────────────────────────────

export interface PaystackTransfer {
  id: number;
  amount: number;
  reference: string;
  recipient: number;
  transfer_code: string;
  status: string;
  reason?: string;
  currency: string;
}

export interface InitiateTransferParams {
  /** Amount in NGN (naira) — converted to kobo internally. */
  amountNaira: number;
  recipientCode: string;
  reason: string;
  /** Deterministic reference for idempotency. Paystack rejects duplicates. */
  reference: string;
}

/**
 * POST /transfer — send NGN from the platform balance to a recipient.
 *
 * Idempotent on `reference`: if the same reference is submitted twice,
 * Paystack returns an error rather than double-paying. Callers should treat
 * the "transfer with this reference already exists" error as a no-op success.
 */
export async function paystackInitiateTransfer(
  params: InitiateTransferParams
): Promise<PaystackTransfer> {
  const amountKobo = Math.round(params.amountNaira * 100);
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
    throw new Error("Transfer amount must be a positive number");
  }
  if (!params.recipientCode) {
    throw new Error("recipientCode is required");
  }
  return paystackFetch<PaystackTransfer>("/transfer", {
    method: "POST",
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: params.recipientCode,
      reason: params.reason,
      reference: params.reference,
      currency: "NGN",
    }),
  });
}
