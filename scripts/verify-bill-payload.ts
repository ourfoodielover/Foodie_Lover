// Standalone contract check for buildBillReceiptPayload() — no DB, no
// network. Feeds it a BillData object matching the exact scenario from the
// failed physical print job (Order #74, delivery, Sathish, Chicken Fry
// Piece Biryani (Half) x1 @ ₹150, no discount, unpaid/COD) and asserts the
// resulting payload has the canonical financial-item/document-type fields
// Android's TicketBuilder.buildBill() requires per the reported failure.
//
// Run with: npx tsx scripts/verify-bill-payload.ts
// Delete this file (or leave it — it has no runtime dependents) once the
// Android side has confirmed the corrected contract against a real device.
import { buildBillReceiptPayload, type BillData } from '../lib/billing-server';

const bill: BillData = {
  kind:            'delivery',
  restaurantName:  'Foodie Lover',
  orderId:         'ORD_74',
  orderIds:        ['ORD_74'],
  orderNumber:     74,
  customerName:    'Sathish',
  phone:           '6299118754',
  deliveryAddress: 'Dingra Appartment',
  items: [
    { name: 'Chicken Fry Piece Biryani (Half)', qty: 1, price: 150, subtotal: 150 },
  ],
  subtotal:       150,
  discount:       0,
  discountReason: null,
  couponCode:     null,
  couponDiscount: 0,
  total:          150,
  isPaid:         false,
  paymentMethod:  null,
  amountDue:      150,
  generatedAt:    new Date().toISOString(),
};

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ok  ${msg}`);
}

console.log('── CUSTOMER_BILL (delivery, Order #74) ──');
const billPayload = buildBillReceiptPayload('CUSTOMER_BILL', bill, { isReprint: false, requestedBy: 'delivery staff' });
console.log(JSON.stringify(billPayload, null, 2));

assert(billPayload.documentType === 'CUSTOMER_BILL', 'documentType === "CUSTOMER_BILL"');
assert(billPayload.docType === 'CUSTOMER_BILL', 'docType (legacy alias) === "CUSTOMER_BILL"');
const items = billPayload.items as Array<Record<string, unknown>>;
assert(Array.isArray(items) && items.length === 1, 'items has exactly 1 entry');
assert(items[0].quantity === 1, 'items[0].quantity exists and === 1');
assert(items[0].unitPrice === 150, 'items[0].unitPrice exists and === 150');
assert(items[0].lineTotal === 150, 'items[0].lineTotal exists and === 150');
assert(items[0].qty === undefined, 'items[0].qty is NOT present (old field name gone)');
assert(items[0].price === undefined, 'items[0].price is NOT present (old field name gone)');
assert(items[0].subtotal === undefined, 'items[0].subtotal is NOT present (old field name gone)');
assert(billPayload.subtotal === 150, 'subtotal exists and === 150');
assert(billPayload.total === 150, 'total exists and === 150');
assert(billPayload.discountAmount === 0, 'discountAmount exists and === 0');
assert(billPayload.paymentStatus === 'PENDING', 'paymentStatus === "PENDING"');
assert(billPayload.amountToCollect === 150, 'amountToCollect === 150 (delivery + PENDING)');
assert(billPayload.paymentMethod === null, 'paymentMethod === null while unpaid');
assert(billPayload.customerPhone === '6299118754', 'customerPhone present');
assert(billPayload.deliveryAddress === 'Dingra Appartment', 'deliveryAddress present');

console.log('\n── CUSTOMER_RECEIPT (same order, now paid via Cash) ──');
const paidBill: BillData = { ...bill, isPaid: true, paymentMethod: 'Cash', amountDue: 0 };
const receiptPayload = buildBillReceiptPayload('CUSTOMER_RECEIPT', paidBill, { isReprint: false, requestedBy: 'delivery staff' });
console.log(JSON.stringify(receiptPayload, null, 2));

assert(receiptPayload.documentType === 'CUSTOMER_RECEIPT', 'documentType === "CUSTOMER_RECEIPT"');
assert(receiptPayload.paymentStatus === 'PAID', 'paymentStatus === "PAID" once bill.isPaid');
assert(receiptPayload.paymentMethod === 'Cash', 'paymentMethod === "Cash"');
assert(receiptPayload.amountToCollect === undefined, 'amountToCollect absent once paid');
const rItems = receiptPayload.items as Array<Record<string, unknown>>;
assert(rItems[0].unitPrice === 150 && rItems[0].lineTotal === 150 && rItems[0].quantity === 1, 'receipt items also use canonical fields');

console.log('\n── Reprint marking ──');
const reprintPayload = buildBillReceiptPayload('CUSTOMER_BILL', bill, { isReprint: true, requestedBy: 'Manager Asha' });
assert(reprintPayload.isReprint === true, 'isReprint === true when requested');

console.log('\n── Dine-In CUSTOMER_BILL (2 rounds, coupon discount) ──');
const dineBill: BillData = {
  kind:           'dine-in',
  restaurantName: 'Foodie Lover',
  tabId:          'TAB_9',
  orderIds:       ['ORD_1', 'ORD_2'],
  tableLabel:     'Table 4',
  customerName:   'Priya',
  phone:          null,
  items: [
    { name: 'Paneer Tikka', qty: 1, price: 220, subtotal: 220 },
    { name: 'Butter Naan', qty: 2, price: 40, subtotal: 80 },
  ],
  rounds: [
    { orderId: 'ORD_1', orderNumber: 1001, source: 'table-qr', createdAt: null, items: [{ name: 'Paneer Tikka', qty: 1, price: 220, subtotal: 220 }] },
    { orderId: 'ORD_2', orderNumber: 1007, source: 'waiter', createdAt: null, items: [{ name: 'Butter Naan', qty: 2, price: 40, subtotal: 80 }] },
  ],
  subtotal:       300,
  discount:       0,
  discountReason: null,
  couponCode:     'WELCOME10',
  couponDiscount: 30,
  total:          270,
  isPaid:         false,
  paymentMethod:  null,
  amountDue:      270,
  generatedAt:    new Date().toISOString(),
};
const dinePayload = buildBillReceiptPayload('CUSTOMER_BILL', dineBill, { isReprint: false, requestedBy: 'Waiter Ravi' });
const dineRounds = dinePayload.rounds as Array<Record<string, unknown>>;
assert(dineRounds.length === 2, 'rounds has 2 entries');
for (const r of dineRounds) {
  const its = r.items as Array<Record<string, unknown>>;
  for (const it of its) {
    assert(typeof it.quantity === 'number' && typeof it.unitPrice === 'number' && typeof it.lineTotal === 'number', `round item "${it.name}" uses canonical fields`);
    assert(it.qty === undefined && it.price === undefined && it.subtotal === undefined, `round item "${it.name}" has no legacy fields`);
  }
}
assert(dinePayload.discountAmount === 30, 'discountAmount === 30 (subtotal 300 - total 270)');
assert(dinePayload.couponCode === 'WELCOME10', 'couponCode passed through');

console.log('\n── Pickup CUSTOMER_RECEIPT (multi-item, manager discount, paid) ──');
const pickupBill: BillData = {
  kind:           'pickup',
  restaurantName: 'Foodie Lover',
  orderId:        'ORD_2050',
  orderIds:       ['ORD_2050'],
  orderNumber:    2050,
  customerName:   'Manish',
  phone:          '9876500000',
  items: [
    { name: 'Veg Biryani', qty: 1, price: 180, subtotal: 180 },
    { name: 'Cold Coffee', qty: 1, price: 90, subtotal: 90 },
  ],
  subtotal:       270,
  discount:       20,
  discountReason: 'Manager discount',
  couponCode:     null,
  couponDiscount: 0,
  total:          250,
  isPaid:         true,
  paymentMethod:  'UPI',
  amountDue:      0,
  generatedAt:    new Date().toISOString(),
};
const pickupPayload = buildBillReceiptPayload('CUSTOMER_RECEIPT', pickupBill, { isReprint: false, requestedBy: 'Manager Asha' });
assert(pickupPayload.discountAmount === 20, 'discountAmount === 20 (manager discount only, no coupon)');
assert(pickupPayload.paymentStatus === 'PAID' && pickupPayload.paymentMethod === 'UPI', 'pickup receipt shows PAID/UPI');
const pItems = pickupPayload.items as Array<Record<string, unknown>>;
assert(pItems.length === 2, 'pickup items has 2 entries (multi-item case)');

console.log('\nALL CHECKS PASSED');
