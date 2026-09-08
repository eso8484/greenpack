/**
 * Flutterwave REST API helpers.
 *
 * All helpers require `FLW_SECRET_KEY` and run on the server only. Keeping
 * provider calls here prevents secret-key handling from leaking into routes or
 * client components.
 */

export const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

function getSecret(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) {
    throw new Error("FLW_SECRET_KEY is not configured");
  }
  return key;
}

interface FlutterwaveResponse<T> {
  status: "success" | "error" | string;
  message?: string;
  data?: T | null;
}

async function flutterwaveFetch<T>(
  path: string,
  init: RequestInit & { method?: string } = {}
): Promise<T> {
  const response = await fetch(`${FLUTTERWAVE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  let payload: FlutterwaveResponse<T>;
  try {
    payload = (await response.json()) as FlutterwaveResponse<T>;
  } catch {
    throw new Error(
      `Flutterwave returned an invalid response (status ${response.status})`
    );
  }

  if (!response.ok || payload.status !== "success" || payload.data == null) {
    throw new Error(
      typeof payload.message === "string" && payload.message.length > 0
        ? payload.message
        : `Flutterwave request failed (status ${response.status})`
    );
  }

  return payload.data;
}

// ─── Hosted payments ───────────────────────────────────────────────────────

export interface CreateFlutterwavePaymentParams {
  txRef: string;
  amount: number;
  currency: "NGN";
  redirectUrl: string;
  customer: {
    email: string;
    name?: string;
    phoneNumber?: string;
  };
  subaccounts?: Array<{
    id: string;
    transaction_charge_type: "flat";
    transaction_charge: number;
  }>;
  meta?: Record<string, unknown>;
}

export interface FlutterwavePaymentLink {
  link: string;
}

/** Create a Flutterwave Standard hosted checkout link. Amounts are in naira. */
export async function flutterwaveCreatePaymentLink(
  params: CreateFlutterwavePaymentParams
): Promise<FlutterwavePaymentLink> {
  return flutterwaveFetch<FlutterwavePaymentLink>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: String(params.amount),
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: {
        email: params.customer.email,
        ...(params.customer.name ? { name: params.customer.name } : {}),
        ...(params.customer.phoneNumber
          ? { phonenumber: params.customer.phoneNumber }
          : {}),
      },
      customizations: {
        title: "Green Pack Delight payment",
      },
      ...(params.subaccounts?.length
        ? { subaccounts: params.subaccounts }
        : {}),
      ...(params.meta ? { meta: params.meta } : {}),
    }),
  });
}

export interface FlutterwaveTransaction {
  id: number | string;
  tx_ref: string;
  amount: number | string;
  currency: string;
  status: string;
  [key: string]: unknown;
}

/** Verify the final state of a Flutterwave payment or charge. */
export async function flutterwaveVerifyTransaction(
  transactionId: string | number
): Promise<FlutterwaveTransaction> {
  return flutterwaveFetch<FlutterwaveTransaction>(
    `/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    { method: "GET" }
  );
}

// ─── Bank accounts and marketplace subaccounts ─────────────────────────────

export interface FlutterwaveBank {
  id?: number;
  code: string;
  name: string;
  [key: string]: unknown;
}

/** List Nigerian banks supported by Flutterwave. */
export async function flutterwaveListBanks(): Promise<FlutterwaveBank[]> {
  return flutterwaveFetch<FlutterwaveBank[]>("/banks/NG", { method: "GET" });
}

export interface FlutterwaveResolvedAccount {
  account_number: string;
  account_name: string;
}

/** Resolve a Nigerian account number against its Flutterwave bank code. */
export async function flutterwaveResolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<FlutterwaveResolvedAccount> {
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error("Account number must be 10 digits");
  }
  if (!bankCode) {
    throw new Error("Bank code is required");
  }

  return flutterwaveFetch<FlutterwaveResolvedAccount>("/accounts/resolve", {
    method: "POST",
    body: JSON.stringify({
      account_number: accountNumber,
      account_bank: bankCode,
    }),
  });
}

export interface FlutterwaveSubaccount {
  id: number;
  subaccount_id: string;
  account_number: string;
  account_bank: string;
  full_name?: string;
  bank_name?: string;
}

export interface CreateFlutterwaveSubaccountParams {
  accountBank: string;
  accountNumber: string;
  businessName: string;
  businessMobile: string;
}

/**
 * Create a collection subaccount for a vendor. The default 3% split is a
 * safety net; each checkout overrides it with the exact platform + delivery
 * fee for that order.
 */
export async function flutterwaveCreateSubaccount(
  params: CreateFlutterwaveSubaccountParams
): Promise<FlutterwaveSubaccount> {
  return flutterwaveFetch<FlutterwaveSubaccount>("/subaccounts", {
    method: "POST",
    body: JSON.stringify({
      account_bank: params.accountBank,
      account_number: params.accountNumber,
      business_name: params.businessName,
      business_mobile: params.businessMobile,
      country: "NG",
      split_type: "percentage",
      split_value: 0.03,
    }),
  });
}

// ─── Courier transfers ─────────────────────────────────────────────────────

export interface FlutterwaveTransfer {
  id: number | string;
  reference: string;
  status: string;
  complete_message?: string;
  [key: string]: unknown;
}

export interface InitiateFlutterwaveTransferParams {
  accountBank: string;
  accountNumber: string;
  amountNaira: number;
  narration: string;
  reference: string;
  callbackUrl?: string;
}

/** Start an NGN transfer to a courier's verified bank account. */
export async function flutterwaveInitiateTransfer(
  params: InitiateFlutterwaveTransferParams
): Promise<FlutterwaveTransfer> {
  if (!Number.isFinite(params.amountNaira) || params.amountNaira <= 0) {
    throw new Error("Transfer amount must be a positive number");
  }

  return flutterwaveFetch<FlutterwaveTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      account_bank: params.accountBank,
      account_number: params.accountNumber,
      amount: params.amountNaira,
      narration: params.narration,
      currency: "NGN",
      debit_currency: "NGN",
      reference: params.reference,
      ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
    }),
  });
}
