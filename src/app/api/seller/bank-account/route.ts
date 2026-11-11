import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedUid } from "@/lib/auth";
import {
  createRazorpayContact,
  createFundAccount,
  fetchIFSCDetails,
} from "@/lib/razorpay-route";

/** GET — fetch current bank account details */
export async function GET(req: NextRequest) {
  const firebaseUid = await getVerifiedUid(req);
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await db.seller.findFirst({
    where: { user: { firebaseUid } },
    select: { id: true },
  });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  const bankAccount = await db.sellerBankAccount.findUnique({
    where: { sellerId: seller.id },
    select: {
      id: true,
      accountHolderName: true,
      accountNumber: true,
      ifscCode: true,
      bankName: true,
      branchName: true,
      accountType: true,
      isVerified: true,
      createdAt: true,
    },
  });

  if (!bankAccount) return NextResponse.json({ bankAccount: null });

  // Mask account number — show only last 4 digits
  return NextResponse.json({
    bankAccount: {
      ...bankAccount,
      accountNumber:
        "•".repeat(bankAccount.accountNumber.length - 4) +
        bankAccount.accountNumber.slice(-4),
    },
  });
}

/** POST — save bank details and register with Razorpay */
export async function POST(req: NextRequest) {
  // checkRevoked: adding/changing a payout bank account is exactly the kind
  // of sensitive action worth the extra Firebase round-trip for — a token
  // issued just before the account owner revoked all sessions (e.g. after
  // noticing a compromise) must not still be able to redirect payouts.
  const firebaseUid = await getVerifiedUid(req, { checkRevoked: true });
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await db.seller.findFirst({
    where: { user: { firebaseUid } },
    include: { user: true },
  });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { accountHolderName, accountNumber, ifscCode, accountType } = body as {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountType?: string;
  };

  if (
    !accountHolderName?.trim() ||
    !accountNumber?.trim() ||
    !ifscCode?.trim()
  ) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (accountHolderName.trim().length > 100) {
    return NextResponse.json({ error: "Account holder name is too long" }, { status: 400 });
  }

  // Validate account number — digits only, 9-18 chars (covers all Indian bank formats)
  if (!/^\d{9,18}$/.test(accountNumber.trim())) {
    return NextResponse.json({ error: "Invalid account number — must be 9-18 digits" }, { status: 400 });
  }

  // Validate IFSC format
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
    return NextResponse.json({ error: "Invalid IFSC code format" }, { status: 400 });
  }

  if (accountType && !["savings", "current"].includes(accountType)) {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  const cleanAccountHolderName = accountHolderName.trim();
  const cleanAccountNumber = accountNumber.trim();

  // Fetch bank/branch name from IFSC
  const ifscDetails = await fetchIFSCDetails(ifscCode);

  let razorpayContactId: string | undefined;
  let razorpayFundAccountId: string | undefined;

  // Register with Razorpay if credentials are set
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_ROUTE_ACCOUNT_NUMBER) {
    try {
      const contact = await createRazorpayContact({
        storeName: seller.storeName,
        email: seller.user.email,
        phone: seller.user.phone,
      });
      razorpayContactId = contact.id;

      const fundAccount = await createFundAccount(contact.id, {
        accountHolderName: cleanAccountHolderName,
        accountNumber: cleanAccountNumber,
        ifscCode: ifscCode.toUpperCase(),
      });
      razorpayFundAccountId = fundAccount.id;
    } catch (err) {
      console.error("[bank-account] Razorpay registration failed:", err);
      // Don't fail — save details locally, retry later
    }
  }

  const bankAccount = await db.sellerBankAccount.upsert({
    where: { sellerId: seller.id },
    create: {
      sellerId: seller.id,
      accountHolderName: cleanAccountHolderName,
      accountNumber: cleanAccountNumber,
      ifscCode: ifscCode.toUpperCase(),
      bankName: ifscDetails?.BANK || null,
      branchName: ifscDetails?.BRANCH || null,
      accountType: accountType || "savings",
      razorpayContactId: razorpayContactId || null,
      razorpayFundAccountId: razorpayFundAccountId || null,
    },
    update: {
      accountHolderName: cleanAccountHolderName,
      accountNumber: cleanAccountNumber,
      ifscCode: ifscCode.toUpperCase(),
      bankName: ifscDetails?.BANK || null,
      branchName: ifscDetails?.BRANCH || null,
      accountType: accountType || "savings",
      razorpayContactId: razorpayContactId || null,
      razorpayFundAccountId: razorpayFundAccountId || null,
      isVerified: false,
    },
  });

  return NextResponse.json({ success: true, bankAccount });
}

/** DELETE — remove bank account */
export async function DELETE(req: NextRequest) {
  // Same reasoning as POST above — removing a bank account is sensitive
  // enough to warrant the revocation check.
  const firebaseUid = await getVerifiedUid(req, { checkRevoked: true });
  if (!firebaseUid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const seller = await db.seller.findFirst({
    where: { user: { firebaseUid } },
    select: { id: true },
  });
  if (!seller) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

  await db.sellerBankAccount.deleteMany({ where: { sellerId: seller.id } });
  return NextResponse.json({ success: true });
}
