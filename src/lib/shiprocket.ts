/**
 * Shiprocket API Library
 * Docs: https://apidocs.shiprocket.in/
 *
 * Covers:
 *  - Token auth (auto-refresh with 24h cache)
 *  - Create shipment / order
 *  - Schedule pickup
 *  - Track shipment (AWB / order)
 *  - Generate shipping label URL
 *  - Get courier serviceability
 */

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// ─── Token cache (module-level, resets on cold start) ──────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

export interface ShiprocketToken {
  token: string;
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Authenticate with Shiprocket and return a JWT token.
 * Token is cached for 23 hours (Shiprocket tokens expire in 24h).
 */
export async function getShiprocketToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD env vars are required");
  }

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shiprocket auth failed: ${err}`);
  }

  const data: ShiprocketToken = await res.json();
  _token = data.token;
  _tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
  return _token;
}

// ─── Generic authenticated request ─────────────────────────────────────────
async function srFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getShiprocketToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    throw new Error(`Shiprocket non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = (json as Record<string, unknown>)?.message ?? text.slice(0, 200);
    throw new Error(`Shiprocket API error ${res.status}: ${msg}`);
  }

  return json;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ShiprocketAddress {
  name: string;
  phone: string;          // 10-digit Indian mobile
  address: string;        // line1
  address2?: string;      // line2
  city: string;
  state: string;
  country?: string;
  pin_code: string;
}

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;          // quantity
  selling_price: number;  // per unit
  discount?: number;
  tax?: number;
  hsn?: number;
}

export interface CreateShipmentInput {
  /** Your internal order ID (shown on Shiprocket dashboard) */
  order_id: string;
  /** ISO date string e.g. new Date().toISOString() */
  order_date: string;
  /** Pickup location name as registered in Shiprocket */
  pickup_location: string;
  billing: ShiprocketAddress;
  shipping: ShiprocketAddress;
  order_items: ShiprocketOrderItem[];
  payment_method: "Prepaid" | "COD";
  sub_total: number;
  length: number;   // cm
  breadth: number;  // cm
  height: number;   // cm
  weight: number;   // kg
}

export interface CreateShipmentResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now: number;
  awb_code: string;
  courier_company_id: number;
  courier_name: string;
}

export interface AssignAWBResponse {
  awb_assign_status: number;
  response: {
    data: {
      awb_code: string;
      courier_company_id: number;
      courier_name: string;
      routing_code: string;
    };
  };
  courier_company_id: number;
}

export interface PickupResponse {
  pickup_scheduled_date: string;
  pickup_token_number: string;
  status: number;
  others?: string;
}

export interface ShippingLabelResponse {
  label_url: string;
}

export interface TrackingActivity {
  date: string;
  activity: string;
  location: string;
  "sr-status": string;
  "sr-status-label": string;
}

export interface TrackingData {
  awb: string;
  current_status: string;
  current_status_id: number;
  delivered_date?: string;
  eta?: string;
  courier: string;
  origin: string;
  destination: string;
  shipment_track_activities: TrackingActivity[];
}

export interface CourierServiceability {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd: string;           // estimated time of delivery (days)
  courier_type: number;
}

// ─── 1. Create Shipment ─────────────────────────────────────────────────────

/**
 * Creates an order in Shiprocket.
 * Returns order_id, shipment_id. Call assignCourierAndAWB next.
 */
export async function createShiprocketOrder(
  input: CreateShipmentInput
): Promise<CreateShipmentResponse> {
  return srFetch<CreateShipmentResponse>("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify({
      order_id: input.order_id,
      order_date: input.order_date,
      pickup_location: input.pickup_location,
      billing_customer_name: input.billing.name,
      billing_last_name: "",
      billing_address: input.billing.address,
      billing_address_2: input.billing.address2 ?? "",
      billing_city: input.billing.city,
      billing_pincode: input.billing.pin_code,
      billing_state: input.billing.state,
      billing_country: input.billing.country ?? "India",
      billing_email: "noreply@nexcart.in",
      billing_phone: input.billing.phone,
      shipping_is_billing: JSON.stringify(input.shipping) === JSON.stringify(input.billing) ? 1 : 0,
      shipping_customer_name: input.shipping.name,
      shipping_last_name: "",
      shipping_address: input.shipping.address,
      shipping_address_2: input.shipping.address2 ?? "",
      shipping_city: input.shipping.city,
      shipping_pincode: input.shipping.pin_code,
      shipping_country: input.shipping.country ?? "India",
      shipping_state: input.shipping.state,
      shipping_email: "noreply@nexcart.in",
      shipping_phone: input.shipping.phone,
      order_items: input.order_items,
      payment_method: input.payment_method,
      sub_total: input.sub_total,
      length: input.length,
      breadth: input.breadth,
      height: input.height,
      weight: input.weight,
    }),
  });
}

// ─── 2. Assign Courier & AWB ────────────────────────────────────────────────

/**
 * Auto-assigns best courier and AWB code for a shipment.
 */
export async function assignCourierAndAWB(
  shipmentId: number,
  courierId?: number
): Promise<AssignAWBResponse> {
  return srFetch<AssignAWBResponse>("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: String(shipmentId),
      courier_id: courierId ? String(courierId) : undefined,
    }),
  });
}

// ─── 3. Schedule Pickup ─────────────────────────────────────────────────────

/**
 * Schedules pickup for one or more shipments.
 * pickup_date: "YYYY-MM-DD" format
 */
export async function schedulePickup(
  shipmentIds: number[],
  pickup_date?: string
): Promise<PickupResponse> {
  return srFetch<PickupResponse>("/courier/generate/pickup", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: shipmentIds,
      pickup_date: pickup_date ?? new Date().toISOString().slice(0, 10),
    }),
  });
}

// ─── 4. Generate Shipping Label ─────────────────────────────────────────────

/**
 * Generates PDF shipping label and returns a URL.
 */
export async function generateShippingLabel(
  shipmentIds: number[]
): Promise<string> {
  const data = await srFetch<ShippingLabelResponse>("/courier/generate/label", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentIds }),
  });
  return data.label_url;
}

// ─── 5. Track Shipment ──────────────────────────────────────────────────────

/**
 * Track by AWB code (most reliable).
 */
export async function trackByAWB(awb: string): Promise<TrackingData> {
  const data = await srFetch<{ tracking_data: TrackingData }>(
    `/courier/track/awb/${awb}`
  );
  return data.tracking_data;
}

/**
 * Track by Shiprocket shipment ID.
 */
export async function trackByShipmentId(shipmentId: number): Promise<TrackingData> {
  const data = await srFetch<{ tracking_data: TrackingData }>(
    `/courier/track/id/${shipmentId}`
  );
  return data.tracking_data;
}

// ─── 6. Cancel Shipment ─────────────────────────────────────────────────────

export async function cancelShiprocketOrders(orderIds: number[]): Promise<{ message: string }> {
  return srFetch("/orders/cancel", {
    method: "POST",
    body: JSON.stringify({ ids: orderIds }),
  });
}

// ─── 7. Courier Serviceability ──────────────────────────────────────────────

/**
 * Check which couriers can deliver from pickup_pin to delivery_pin.
 */
export async function checkServiceability(
  pickup_pin: string,
  delivery_pin: string,
  weight_kg: number,
  cod = false
): Promise<CourierServiceability[]> {
  const params = new URLSearchParams({
    pickup_postcode: pickup_pin,
    delivery_postcode: delivery_pin,
    weight: String(weight_kg),
    cod: cod ? "1" : "0",
  });
  const data = await srFetch<{
    data: { available_courier_companies: CourierServiceability[] };
  }>(`/courier/serviceability/?${params.toString()}`);
  return data.data?.available_courier_companies ?? [];
}

// ─── 8. Create Return (Reverse) Pickup ─────────────────────────────────────

export interface CreateReturnPickupInput {
  returnId: string;
  orderDate: string;
  // Customer address — where courier picks up the return FROM
  customer: ShiprocketAddress & { email?: string };
  // Seller address — where courier DELIVERS the return TO
  seller: ShiprocketAddress & { email?: string };
  item: {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
  };
  subTotal: number;
}

export interface CreateReturnPickupResult {
  shipment_id: number;
  awb_code: string;
  pickup_scheduled_date: string;
}

/**
 * Creates a reverse pickup order in Shiprocket.
 * The courier picks up from the customer and delivers to the seller.
 * Uses the /orders/create/return endpoint.
 */
export async function createReturnPickup(
  input: CreateReturnPickupInput
): Promise<CreateReturnPickupResult> {
  const payload = {
    order_id: `RET-${input.returnId.slice(-8).toUpperCase()}`,
    order_date: input.orderDate,
    pickup_customer_name: input.customer.name,
    pickup_phone: input.customer.phone,
    pickup_address: input.customer.address,
    pickup_address_2: input.customer.address2 ?? "",
    pickup_city: input.customer.city,
    pickup_state: input.customer.state,
    pickup_country: input.customer.country ?? "India",
    pickup_pincode: input.customer.pin_code,
    pickup_email: input.customer.email ?? "noreply@nexcart.in",
    shipping_customer_name: input.seller.name,
    shipping_phone: input.seller.phone,
    shipping_address: input.seller.address,
    shipping_address_2: input.seller.address2 ?? "",
    shipping_city: input.seller.city,
    shipping_state: input.seller.state,
    shipping_country: input.seller.country ?? "India",
    shipping_pincode: input.seller.pin_code,
    shipping_email: input.seller.email ?? "noreply@nexcart.in",
    order_items: [input.item],
    payment_method: "Prepaid",
    sub_total: input.subTotal,
    length: 10,
    breadth: 10,
    height: 10,
    weight: 0.5,
  };

  const res = await srFetch<{ shipment_id: number; awb_code: string; pickup_scheduled_date?: string }>(
    "/orders/create/return",
    { method: "POST", body: JSON.stringify(payload) }
  );

  return {
    shipment_id: res.shipment_id,
    awb_code: res.awb_code,
    pickup_scheduled_date: res.pickup_scheduled_date ?? new Date().toISOString().slice(0, 10),
  };
}

// ─── 9. Full "ship order" helper ────────────────────────────────────────────

export interface AutoShipResult {
  shiprocket_order_id: number;
  shipment_id: number;
  awb_code: string;
  courier_name: string;
  label_url: string;
  pickup_scheduled_date: string;
}

/**
 * Full flow:
 *  1. Create order in Shiprocket
 *  2. Auto-assign best courier + AWB
 *  3. Schedule pickup (tomorrow)
 *  4. Generate label
 *
 * Returns everything needed to save to Prisma.
 */
export async function autoShipOrder(
  input: CreateShipmentInput
): Promise<AutoShipResult> {
  // Step 1: Create order
  const orderRes = await createShiprocketOrder(input);

  // Step 2: Assign courier + AWB
  const awbRes = await assignCourierAndAWB(orderRes.shipment_id);
  const awb = awbRes.response?.data?.awb_code ?? orderRes.awb_code;
  const courierName =
    awbRes.response?.data?.courier_name ?? orderRes.courier_name ?? "Courier";

  // Step 3: Schedule pickup for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pickupDate = tomorrow.toISOString().slice(0, 10);
  const pickupRes = await schedulePickup([orderRes.shipment_id], pickupDate);

  // Step 4: Label
  const labelUrl = await generateShippingLabel([orderRes.shipment_id]);

  return {
    shiprocket_order_id: orderRes.order_id,
    shipment_id: orderRes.shipment_id,
    awb_code: awb,
    courier_name: courierName,
    label_url: labelUrl,
    pickup_scheduled_date: pickupRes.pickup_scheduled_date ?? pickupDate,
  };
}
