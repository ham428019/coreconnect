import { PrismaClient, PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const orderNumber = () => {
  const year = new Date().getFullYear();
  return `CC-${year}-${crypto.randomBytes(3).toString("hex").toUpperCase().substring(0, 5)}`;
};
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
  const customers = await prisma.user.findMany({ where: { role: "CUSTOMER" } });
  if (customers.length === 0) {
    console.log("No customer accounts found — run seed first");
    return;
  }

  const products = await prisma.product.findMany({ where: { isActive: true } });
  if (products.length < 5) {
    console.log("Not enough products to build orders");
    return;
  }

  const customersWithAddresses = await Promise.all(
    customers.map(async (c) => {
      const addresses = await prisma.address.findMany({ where: { userId: c.id } });
      return { ...c, addresses };
    })
  );

  let created = 0;
  for (const cust of customersWithAddresses) {
    const addr = cust.addresses[0];
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
        await prisma.product.update({
          where: { id: it.productId },
          data: { stockQty: { decrement: it.quantity } },
        });
      }
      created++;
    }
  }

  console.log(`Created ${created} demo orders across ${customers.length} customers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());