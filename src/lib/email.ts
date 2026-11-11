/**
 * Order Email Notifications via Resend
 * Install: npm install resend
 * Add RESEND_API_KEY to Vercel env vars (get from https://resend.com)
 * Add RESEND_FROM_EMAIL e.g. "NexCart <orders@yourdomain.com>"
 */

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
}

function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(paise / 100);
}

function buildOrderConfirmationHtml(data: OrderEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${item.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:center;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const discountRow =
    data.discountAmount && data.discountAmount > 0
      ? `<tr>
          <td colspan="2" style="padding:6px 0;font-size:14px;color:#10b981;">Discount</td>
          <td style="padding:6px 0;font-size:14px;color:#10b981;text-align:right;">−${formatPrice(data.discountAmount)}</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 6px;font-size:20px;color:#09090b;">Order Confirmed! 🎉</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
              Hi ${data.customerName || "there"}, your order has been placed successfully.
            </p>

            <!-- Order ID badge -->
            <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:inline-block;">
              <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br>
              <span style="font-size:15px;font-weight:600;color:#09090b;font-family:monospace;">${data.orderId}</span>
            </div>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <thead>
                <tr>
                  <th style="text-align:left;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Item</th>
                  <th style="text-align:center;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qty</th>
                  <th style="text-align:right;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                ${discountRow}
                <tr>
                  <td colspan="2" style="padding:12px 0 0;font-size:16px;font-weight:700;color:#09090b;">Total</td>
                  <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#09090b;text-align:right;">${formatPrice(data.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Delivery address -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:24px;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Delivering to</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                ${data.address.line1}<br>
                ${data.address.city}, ${data.address.state} – ${data.address.pincode}
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-top:32px;">
              <a href="${appUrl}/orders" style="background:#09090b;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Track Your Order →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#09090b;">${appUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Send order confirmation email using Resend.
 * Fails silently — never throws — so it never blocks the order API response.
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "NexCart <orders@nexcart.in>";

  if (!apiKey) {
    // Not configured — skip silently in dev, warn in prod
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY not set — order confirmation not sent");
    }
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: fromEmail,
      to: data.customerEmail,
      subject: `Order Confirmed — ${data.orderId} | NexCart`,
      html: buildOrderConfirmationHtml(data),
    });
  } catch (err) {
    // Log but never propagate — email failure must not break order creation
    console.error("[email] Failed to send order confirmation:", err instanceof Error ? err.message : err);
  }
}

// ── Seller Approval / Rejection Email ────────────────────────────────────────

interface SellerStatusEmailData {
  sellerEmail: string;
  sellerName: string;
  storeName: string;
  status: "APPROVED" | "REJECTED" | "SUSPENDED";
}

function buildSellerApprovedHtml(data: SellerStatusEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <!-- Green approved banner -->
        <tr>
          <td style="background:#f0fdf4;border-bottom:3px solid #22c55e;padding:24px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🎉</div>
            <h2 style="margin:0;font-size:22px;font-weight:700;color:#15803d;">Your Seller Account is Approved!</h2>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">
              Hi <strong>${data.sellerName || "there"}</strong>,
            </p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              Great news! Your seller account for <strong>${data.storeName}</strong> has been <span style="color:#15803d;font-weight:700;">approved</span> by the NexCart team.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              You can now log in to your seller dashboard and start listing products, managing orders, and growing your business on NexCart.
            </p>
            <!-- What's next -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:28px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#09090b;text-transform:uppercase;letter-spacing:0.5px;">What's next?</p>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;">✅ &nbsp;Log in to your dashboard</p>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;">📦 &nbsp;Add your first product</p>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;">🚀 &nbsp;Start receiving orders</p>
            </div>
            <!-- CTA -->
            <div style="text-align:center;">
              <a href="${appUrl}/dashboard" style="background:#09090b;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Go to Seller Dashboard →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#09090b;">${appUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildSellerRejectedHtml(data: SellerStatusEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fef2f2;border-bottom:3px solid #ef4444;padding:24px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">📋</div>
            <h2 style="margin:0;font-size:20px;font-weight:700;color:#b91c1c;">Application Under Review</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>${data.sellerName || "there"}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              Thank you for applying to sell on NexCart. Unfortunately, your application for <strong>${data.storeName}</strong> was not approved at this time.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              You're welcome to re-apply after reviewing our seller guidelines. If you believe this was a mistake, please contact our support team.
            </p>
            <div style="text-align:center;">
              <a href="${appUrl}/become-seller" style="background:#09090b;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Re-apply →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#09090b;">${appUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildSellerSuspendedHtml(data: SellerStatusEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fffbeb;border-bottom:3px solid #f59e0b;padding:24px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">⚠️</div>
            <h2 style="margin:0;font-size:20px;font-weight:700;color:#92400e;">Your Seller Account Has Been Suspended</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>${data.sellerName || "there"}</strong>,</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Your seller account for <strong>${data.storeName}</strong> has been temporarily suspended. Please contact our support team to resolve this.
            </p>
            <div style="text-align:center;">
              <a href="${appUrl}" style="background:#09090b;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Contact Support →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#09090b;">${appUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSellerStatusEmail(data: SellerStatusEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "NexCart <noreply@nexcart.in>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY not set — seller status email not sent");
    }
    return;
  }

  const subjectMap = {
    APPROVED: `🎉 Your Seller Account is Approved — ${data.storeName} | NexCart`,
    REJECTED: `Your NexCart Seller Application — ${data.storeName}`,
    SUSPENDED: `Your Seller Account Has Been Suspended — ${data.storeName} | NexCart`,
  };

  const htmlMap = {
    APPROVED: buildSellerApprovedHtml(data),
    REJECTED: buildSellerRejectedHtml(data),
    SUSPENDED: buildSellerSuspendedHtml(data),
  };

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: data.sellerEmail,
      subject: subjectMap[data.status],
      html: htmlMap[data.status],
    });
  } catch (err) {
    console.error("[email] Failed to send seller status email:", err instanceof Error ? err.message : err);
  }
}

// ─── Low Stock Alert Emails ───────────────────────────────────────────────────

interface LowStockProduct {
  name: string;
  stock: number;
}

interface LowStockAlertEmailData {
  sellerEmail: string;
  sellerName: string;
  storeName: string;
  products: LowStockProduct[];
}

function buildLowStockAlertHtml(data: LowStockAlertEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  const productsTable = data.products
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${p.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:700;color:${p.stock === 0 ? "#dc2626" : "#d97706"};text-align:center;">${p.stock === 0 ? "Out of Stock" : p.stock}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff7ed;border-bottom:3px solid #fed7aa;padding:24px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">⚠️</div>
            <h2 style="margin:0;font-size:20px;font-weight:700;color:#c2410c;">Low Stock Alert</h2>
            <p style="margin:6px 0 0;font-size:14px;color:#9a3412;">${data.products.length} product${data.products.length > 1 ? "s need" : " needs"} your attention</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">
              Hi <strong>${data.sellerName || "there"}</strong>,<br><br>
              The following products in your store <strong>${data.storeName}</strong> have fallen below the minimum stock threshold (10 units):
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Product</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Stock</th>
                </tr>
              </thead>
              <tbody>${productsTable}</tbody>
            </table>
            <div style="text-align:center;margin-top:28px;">
              <a href="${appUrl}/dashboard/products" style="background:#09090b;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Update Inventory →
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Manage your products at <a href="${appUrl}/dashboard/products" style="color:#09090b;">${appUrl.replace("https://", "")}/dashboard/products</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLowStockAlertEmail(data: LowStockAlertEmailData): Promise<void> {
  const apiKey    = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "NexCart <noreply@nexcart.in>";
  if (!apiKey) { console.error("[email] RESEND_API_KEY not set — low stock alert not sent"); return; }

  const subject = `⚠️ Low Stock Alert: ${data.products.length} product${data.products.length > 1 ? "s need" : " needs"} restocking — ${data.storeName}`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: fromEmail, to: data.sellerEmail, subject, html: buildLowStockAlertHtml(data) });
  } catch (err) {
    console.error("[email] Failed to send low stock alert:", err instanceof Error ? err.message : err);
  }
}


// ─── Order Shipped Email ──────────────────────────────────────────────────────

interface OrderShippedEmailData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  trackingId: string;
  courierName: string;
  trackingUrl?: string;
  estimatedDelivery?: string; // human-readable e.g. "25 May 2026"
}

function buildOrderShippedHtml(data: OrderShippedEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  const trackUrl = data.trackingUrl || `${appUrl}/orders`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <!-- Blue shipped banner -->
        <tr>
          <td style="background:#eff6ff;border-bottom:3px solid #3b82f6;padding:24px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">🚚</div>
            <h2 style="margin:0;font-size:22px;font-weight:700;color:#1d4ed8;">Your Order is On the Way!</h2>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">
              Hi <strong>${data.customerName || "there"}</strong>, great news — your order has been shipped and is headed your way.
            </p>

            <!-- Order ID badge -->
            <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin-bottom:20px;display:inline-block;">
              <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br>
              <span style="font-size:15px;font-weight:600;color:#09090b;font-family:monospace;">${data.orderId}</span>
            </div>

            <!-- Tracking details card -->
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:28px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#09090b;text-transform:uppercase;letter-spacing:0.5px;">📦 Shipment Details</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;width:40%;">Courier</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:#09090b;">${data.courierName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">Tracking Number</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:#09090b;font-family:monospace;">${data.trackingId}</td>
                </tr>
                ${data.estimatedDelivery ? `<tr>
                  <td style="padding:6px 0;font-size:13px;color:#6b7280;">Estimated Delivery</td>
                  <td style="padding:6px 0;font-size:14px;font-weight:600;color:#059669;">${data.estimatedDelivery}</td>
                </tr>` : ""}
              </table>
            </div>

            <!-- CTA -->
            <div style="text-align:center;">
              <a href="${trackUrl}" style="background:#09090b;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Track Package →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#09090b;">${appUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderShippedEmail(data: OrderShippedEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "NexCart <orders@nexcart.in>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY not set — order shipped email not sent");
    }
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: data.customerEmail,
      subject: `📦 Your Order Has Shipped — ${data.orderId} | NexCart`,
      html: buildOrderShippedHtml(data),
    });
  } catch (err) {
    console.error("[email] Failed to send order shipped email:", err instanceof Error ? err.message : err);
  }
}

// ─── Order Delivered Email ────────────────────────────────────────────────────

interface OrderDeliveredEmailData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
}

function buildOrderDeliveredHtml(data: OrderDeliveredEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nexcart.vercel.app";
  const reviewUrl = `${appUrl}/orders/${data.orderId}`;

  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;">${item.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:center;">×${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#374151;text-align:right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#09090b;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">NexCart</h1>
            <p style="margin:4px 0 0;color:#a1a1aa;font-size:13px;">India's Multi-Vendor Marketplace</p>
          </td>
        </tr>
        <!-- Green delivered banner -->
        <tr>
          <td style="background:#f0fdf4;border-bottom:3px solid #22c55e;padding:24px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">✅</div>
            <h2 style="margin:0;font-size:22px;font-weight:700;color:#15803d;">Order Delivered!</h2>
            <p style="margin:6px 0 0;font-size:14px;color:#166534;">Your package has arrived</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">
              Hi <strong>${data.customerName || "there"}</strong>, your order has been successfully delivered. We hope you love your purchase!
            </p>

            <!-- Order ID badge -->
            <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin-bottom:24px;display:inline-block;">
              <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Order ID</span><br>
              <span style="font-size:15px;font-weight:600;color:#09090b;font-family:monospace;">${data.orderId}</span>
            </div>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <thead>
                <tr>
                  <th style="text-align:left;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Item</th>
                  <th style="text-align:center;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Qty</th>
                  <th style="text-align:right;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:2px solid #f0f0f0;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
                <tr>
                  <td colspan="2" style="padding:12px 0 0;font-size:16px;font-weight:700;color:#09090b;">Total</td>
                  <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#09090b;text-align:right;">${formatPrice(data.totalAmount)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Rate your purchase box -->
            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;margin-top:24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#92400e;">⭐ Loved your purchase?</p>
              <p style="margin:0 0 16px;font-size:14px;color:#78350f;">Your review helps other shoppers and supports our sellers.</p>
              <a href="${reviewUrl}" style="background:#09090b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">
                Rate Your Purchase →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Questions? Reply to this email or visit <a href="${appUrl}" style="color:#09090b;">${appUrl.replace("https://", "")}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderDeliveredEmail(data: OrderDeliveredEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "NexCart <orders@nexcart.in>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY not set — order delivered email not sent");
    }
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromEmail,
      to: data.customerEmail,
      subject: `✅ Delivered! Order ${data.orderId} — Rate Your Purchase | NexCart`,
      html: buildOrderDeliveredHtml(data),
    });
  } catch (err) {
    console.error("[email] Failed to send order delivered email:", err instanceof Error ? err.message : err);
  }
}
