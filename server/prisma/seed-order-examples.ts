import { PrismaClient, PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const orderNumber = () => {
  const year = new Date().getFullYear();
  return `CC-${year}-${crypto.randomBytes(3).toString("hex").toUpperCase().substring(0, 5)}`;
};
const referenceCode = () => crypto.randomBytes(8).toString("hex").toUpperCase();

const at = (n: number, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 10, 0, 0);
  return d;
};
const after = (from: Date, n: number) => {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
};

const EXAMPLES: {
  key: string;
  status: OrderStatus;
  method: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAtDays: number;
  shippedDays?: number;
  deliveredDays?: number;
  trackingNumber?: string;
  carrier?: string;
  slugs: string[];
  qty: number;
}[] = [
  {
    key: "pending",
    status: "PENDING",
    method: "COD",
    paymentStatus: "PENDING",
    createdAtDays: 0,
    slugs: ["razer-blackwidow-v4-pro"],
    qty: 1,
  },
  {
    key: "confirmed",
    status: "CONFIRMED",
    method: "BANK_TRANSFER",
    paymentStatus: "COMPLETED",
    createdAtDays: 1,
    slugs: ["secretlab-titan-evo-2022"],
    qty: 1,
  },
  {
    key: "processing",
    status: "PROCESSING",
    method: "BANK_TRANSFER",
    paymentStatus: "COMPLETED",
    createdAtDays: 2,
    slugs: ["sony-wh-1000xm5"],
    qty: 1,
  },
  {
    key: "shipped",
    status: "SHIPPED",
    method: "COD",
    paymentStatus: "COMPLETED",
    createdAtDays: 3,
    shippedDays: 1,
    trackingNumber: "TRK0D5E9F2A",
    carrier: "DHL Express",
    slugs: ["razer-deathadder-v3-pro"],
    qty: 1,
  },
  {
    key: "delivered",
    status: "DELIVERED",
    method: "BANK_TRANSFER",
    paymentStatus: "COMPLETED",
    createdAtDays: 9,
    shippedDays: 6,
    deliveredDays: 1,
    trackingNumber: "TRK4C7B1E8D",
    carrier: "FedEx",
    slugs: ["logitech-g-pro-x-superlight"],
    qty: 1,
  },
  {
    key: "cancelled",
    status: "CANCELLED",
    method: "BANK_TRANSFER",
    paymentStatus: "REFUNDED",
    createdAtDays: 5,
    slugs: ["keychron-k2-v2"],
    qty: 1,
  },
];

async function main() {
  let demo = await prisma.user.findUnique({ where: { email: "demo@coreconnect.com" } });
  if (!demo) {
    demo = await prisma.user.create({
      data: {
        email: "demo@coreconnect.com",
        passwordHash: await bcrypt.hash("demo_123", 10),
        firstName: "Demo",
        lastName: "Customer",
        phone: "+1 555 010 0101",
        role: "CUSTOMER",
        isActive: true,
        emailVerified: true,
      },
    });
  }

  let address = await prisma.address.findFirst({ where: { userId: demo.id } });
  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: demo.id,
        label: "Home",
        street: "742 Evergreen Terrace",
        city: "Springfield",
        state: "CA",
        zipCode: "90210",
        country: "US",
        isDefault: true,
      },
    });
  }

  const existing = await prisma.order.count({ where: { userId: demo.id } });
  if (existing > 0) {
    console.log(`Demo customer already has ${existing} orders — skipping`);
    return;
  }

  const products = await prisma.product.findMany({ where: { isActive: true } });
  const pick = (slugs: string[], fallbackIndex: number) => {
    for (const s of slugs) {
      const p = products.find((p) => p.slug === s);
      if (p) return p;
    }
    return products[fallbackIndex % products.length];
  };

  for (const ex of EXAMPLES) {
    const exIndex = EXAMPLES.indexOf(ex);
  const product = pick(ex.slugs, exIndex + 1);
    const subtotal = Math.round(Number(product.price) * ex.qty * 100) / 100;
    const shippingCost = ex.method === "COD" ? 5.0 : 0;
    const taxAmount = Math.round(subtotal * 0.08 * 100) / 100;
    const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;

    const createdAt = at(ex.createdAtDays, 10 + exIndex * 2);
    const shippedAt = ex.shippedDays !== undefined ? after(createdAt, ex.shippedDays) : null;
    const deliveredAt = ex.deliveredDays !== undefined ? after(createdAt, ex.deliveredDays) : null;
    const hasTracking = !!ex.trackingNumber;

    await prisma.order.create({
      data: {
        orderNumber: orderNumber(),
        userId: demo.id,
        status: ex.status,
        paymentStatus: ex.paymentStatus,
        paymentMethod: ex.method,
        subtotal,
        shippingCost,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        shippingAddress: {
          label: address.label,
          street: address.street,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          country: address.country,
        },
        trackingNumber: ex.trackingNumber ?? null,
        carrier: hasTracking ? ex.carrier : null,
        createdAt,
        updatedAt: createdAt,
        shippedAt,
        deliveredAt,
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              quantity: ex.qty,
              unitPrice: Number(product.price),
              totalPrice: subtotal,
            },
          ],
        },
        payment:
          ex.paymentStatus !== "PENDING"
            ? {
                create: {
                  method: ex.method,
                  amount: totalAmount,
                  currency: "USD",
                  status: ex.paymentStatus,
                  referenceCode: referenceCode(),
                  initiatedAt: createdAt,
                  completedAt: ex.paymentStatus === "COMPLETED" ? createdAt : null,
                },
              }
            : undefined,
      },
    });

    console.log(`${ex.key.padEnd(10)} ${ex.status.padEnd(10)} ${product.name} — $${totalAmount.toFixed(2)}${hasTracking ? ` — ${ex.trackingNumber} (${ex.carrier})` : ""}`);
  }

  console.log(`Created ${EXAMPLES.length} example orders for demo@coreconnect.com (password: demo_123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
