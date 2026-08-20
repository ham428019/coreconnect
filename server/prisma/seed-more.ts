import { PrismaClient, UserRole, PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const CUSTOMERS: { first: string; last: string }[] = [
  { first: "Aiden", last: "Moore" },
  { first: "Bella", last: "Anderson" },
  { first: "Carter", last: "Thompson" },
  { first: "Delilah", last: "White" },
  { first: "Elijah", last: "Harris" },
  { first: "Fiona", last: "Martin" },
  { first: "Gabriel", last: "Clark" },
  { first: "Hannah", last: "Lewis" },
  { first: "Isaac", last: "Robinson" },
  { first: "Julia", last: "Walker" },
  { first: "Kevin", last: "Young" },
  { first: "Laura", last: "King" },
  { first: "Mason", last: "Wright" },
  { first: "Natalie", last: "Scott" },
  { first: "Owen", last: "Green" },
  { first: "Penelope", last: "Adams" },
  { first: "Quinn", last: "Baker" },
  { first: "Ruby", last: "Nelson" },
  { first: "Samuel", last: "Hill" },
  { first: "Tessa", last: "Ramirez" },
  { first: "Ulysses", last: "Torres" },
  { first: "Violet", last: "Peterson" },
  { first: "William", last: "Cooper" },
  { first: "Xander", last: "Reed" },
  { first: "Zoe", last: "Bailey" },
];

const STAFF = [
  { first: "Sarah", last: "Chen", role: UserRole.EMPLOYEE },
  { first: "Elena", last: "Rodriguez", role: UserRole.MANAGER },
];

const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin", "Seattle", "Denver"];
const STATES = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "TX", "WA", "CO"];

const orderNumber = () => `CC-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase().substring(0, 5)}`;
const referenceCode = () => crypto.randomBytes(8).toString("hex").toUpperCase();

const daysAgo = (n: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d;
};

const minusDays = (from: Date, n: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
};

const STATUS_POOL: { status: OrderStatus; method: PaymentMethod; paymentStatus: PaymentStatus; weight: number }[] = [
  { status: "DELIVERED", method: "BANK_TRANSFER", paymentStatus: "COMPLETED", weight: 4 },
  { status: "SHIPPED", method: "COD", paymentStatus: "COMPLETED", weight: 3 },
  { status: "PENDING", method: "COD", paymentStatus: "PENDING", weight: 3 },
  { status: "PROCESSING", method: "BANK_TRANSFER", paymentStatus: "COMPLETED", weight: 2 },
  { status: "CONFIRMED", method: "BANK_TRANSFER", paymentStatus: "COMPLETED", weight: 2 },
  { status: "CANCELLED", method: "BANK_TRANSFER", paymentStatus: "REFUNDED", weight: 1 },
  { status: "RETURNED", method: "COD", paymentStatus: "REFUNDED", weight: 1 },
];

const pickStatus = () => {
  const total = STATUS_POOL.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * total;
  for (const s of STATUS_POOL) {
    roll -= s.weight;
    if (roll <= 0) return s;
  }
  return STATUS_POOL[0];
};

async function main() {
  const passwordHash = await bcrypt.hash("demo123", 12);
  let usersCreated = 0;

  for (const c of CUSTOMERS) {
    const email = `${c.first.toLowerCase()}@coreconnect.com`;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) continue;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: c.first,
        lastName: c.last,
        role: UserRole.CUSTOMER,
        emailVerified: true,
        addresses: {
          create: {
            label: "Home",
            street: `${100 + Math.floor(Math.random() * 900)} Demo Street`,
            city: CITIES[Math.floor(Math.random() * CITIES.length)],
            state: STATES[Math.floor(Math.random() * STATES.length)],
            zipCode: String(10000 + Math.floor(Math.random() * 90000)),
            country: "US",
            isDefault: true,
          },
        },
      },
    });
    usersCreated++;
  }

  for (const s of STAFF) {
    const rolePart = s.role === UserRole.MANAGER ? "manager" : "employee";
    const email = `${s.first.toLowerCase()}0${rolePart}@coreconnect.com`;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) continue;
    const staffHash = await bcrypt.hash(`${s.first.toLowerCase()}_123`, 12);
    await prisma.user.create({
      data: { email, passwordHash: staffHash, firstName: s.first, lastName: s.last, role: s.role, emailVerified: true },
    });
    usersCreated++;
  }

  console.log(`Created ${usersCreated} new users`);

  const customers = await prisma.user.findMany({ where: { role: "CUSTOMER" } });
  const newCustomers = customers.filter((c) => CUSTOMERS.some((n) => n.first.toLowerCase() === c.firstName.toLowerCase() && n.last.toLowerCase() === c.lastName.toLowerCase()));
  const products = await prisma.product.findMany({ where: { isActive: true } });
  if (newCustomers.length === 0 || products.length < 5) {
    console.log("No new customers to build orders for (or not enough products)");
    return;
  }

  let ordersCreated = 0;
  for (const cust of newCustomers) {
    const addr = await prisma.address.findFirst({ where: { userId: cust.id } });
    const orderCount = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < orderCount; i++) {
      const s = pickStatus();
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const picked = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount);
      const orderItems = picked.map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: 1 + Math.floor(Math.random() * 3),
        unitPrice: Number(p.price),
      }));
      const subtotal = orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
      const shippingCost = s.method === "COD" ? 5.0 : 0;
      const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
      const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

      const createdAt = daysAgo(5 + Math.floor(Math.random() * 105));
      const shippedAt = s.status === "SHIPPED" || s.status === "DELIVERED" || s.status === "RETURNED" ? minusDays(createdAt, 4) : null;
      const deliveredAt = s.status === "DELIVERED" || s.status === "RETURNED" ? minusDays(createdAt, 8) : null;

      await prisma.order.create({
        data: {
          orderNumber: orderNumber(),
          userId: cust.id,
          status: s.status,
          paymentStatus: s.paymentStatus,
          paymentMethod: s.method,
          subtotal,
          shippingCost,
          taxAmount,
          discountAmount: 0,
          totalAmount,
          shippingAddress: {
            label: addr?.label || "Home",
            street: addr?.street || "123 Demo Street",
            city: addr?.city || "Demo City",
            state: addr?.state || "CA",
            zipCode: addr?.zipCode || "90001",
            country: addr?.country || "US",
          },
          trackingNumber: s.status === "SHIPPED" || s.status === "DELIVERED" || s.status === "RETURNED" ? `TRK${crypto.randomBytes(4).toString("hex").toUpperCase()}` : null,
          carrier: s.status === "SHIPPED" || s.status === "DELIVERED" || s.status === "RETURNED" ? "DHL Express" : null,
          createdAt,
          shippedAt,
          deliveredAt,
          items: {
            create: orderItems.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.unitPrice * it.quantity,
            })),
          },
          payment: s.method === "BANK_TRANSFER" && s.paymentStatus !== "PENDING" ? {
            create: {
              method: s.method,
              amount: totalAmount,
              currency: "USD",
              status: s.paymentStatus,
              referenceCode: referenceCode(),
              initiatedAt: createdAt,
              completedAt: s.paymentStatus === "COMPLETED" ? createdAt : null,
            },
          } : undefined,
        },
      });

      for (const it of orderItems) {
        await prisma.$transaction([
          prisma.product.updateMany({
            where: { id: it.productId, stockQty: { gte: it.quantity } },
            data: { stockQty: { decrement: it.quantity } },
          }),
          prisma.product.updateMany({
            where: { id: it.productId, stockQty: { lt: it.quantity } },
            data: { stockQty: 0 },
          }),
        ]);
      }
      ordersCreated++;
    }
  }

  console.log(`Created ${ordersCreated} new demo orders`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());