/**
 * Razorpay Route (Payouts) Helper
 * Handles: Contact creation, Fund Account creation, Payout initiation
 * Docs: https://razorpay.com/docs/api/route/
 */

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function getAuthHeader() {
  // Razorpay Payouts uses separate API keys from regular payment keys.
  // Generate them in: Razorpay Dashboard → Settings → API Keys → Payouts
  const key = process.env.RAZORPAY_PAYOUT_KEY_ID ?? process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_PAYOUT_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

async function razorpayRequest<T>(
  path: string,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${RAZORPAY_BASE}${path}`, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.error?.description || `Razorpay API error: ${res.status}`
    );
  }
  return data as T;
}

export interface RazorpayContact {
  id: string;
  name: string;
  email: string;
  contact: string;
  type: string;
}

export interface RazorpayFundAccount {
  id: string;
  contact_id: string;
  account_type: string;
  bank_account: {
    name: string;
    ifsc: string;
    bank_name: string;
    account_number: string;
  };
}

export interface RazorpayPayout {
  id: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  status: string;
  utr?: string;
  failure_reason?: string;
}

/** Create a Razorpay Contact for a seller */
export async function createRazorpayContact(seller: {
  storeName: string;
  email: string;
  phone?: string | null;
}): Promise<RazorpayContact> {
  return razorpayRequest<RazorpayContact>("/contacts", "POST", {
    name: seller.storeName,
    email: seller.email,
    contact: seller.phone || undefined,
    type: "vendor",
    reference_id: `seller_${Date.now()}`,
  });
}

/** Create a Fund Account (bank account) for a contact */
export async function createFundAccount(
  contactId: string,
  bank: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  }
): Promise<RazorpayFundAccount> {
  return razorpayRequest<RazorpayFundAccount>("/fund_accounts", "POST", {
    contact_id: contactId,
    account_type: "bank_account",
    bank_account: {
      name: bank.accountHolderName,
      ifsc: bank.ifscCode,
      account_number: bank.accountNumber,
    },
  });
}

/** Initiate a payout to a fund account */
export async function initiatePayout(
  fundAccountId: string,
  amountInPaise: number,
  narration: string
): Promise<RazorpayPayout> {
  return razorpayRequest<RazorpayPayout>("/payouts", "POST", {
    account_number: process.env.RAZORPAY_ROUTE_ACCOUNT_NUMBER,
    fund_account_id: fundAccountId,
    amount: amountInPaise,
    currency: "INR",
    mode: "IMPS",
    purpose: "payout",
    queue_if_low_balance: true,
    narration,
  });
}

/** Fetch IFSC details for auto-fill */
export async function fetchIFSCDetails(
  ifsc: string
): Promise<{ BANK: string; BRANCH: string; CITY: string } | null> {
  try {
    const res = await fetch(`https://ifsc.razorpay.com/${ifsc.toUpperCase()}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
