const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const colors = ['#1E40AF', '#047857', '#B91C1C', '#7C3AED', '#C2410C', '#0E7490',
  '#4F46E5', '#0F766E', '#BE185D', '#854D0E', '#1D4ED8', '#15803D'];

function generateSVG(name, index) {
  const color = colors[index % colors.length];
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const lines = name.match(/.{1,20}/g) || [name];
  const textLines = lines.map((l, i) =>
    `<text x="300" y="${330 + i * 24}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#94A3B8">${l}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="#0F172A"/>
  <rect x="20" y="20" width="560" height="560" rx="16" fill="${color}" opacity="0.15"/>
  <circle cx="300" cy="200" r="80" fill="${color}" opacity="0.3"/>
  <circle cx="300" cy="200" r="55" fill="${color}" opacity="0.5"/>
  <text x="300" y="215" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="#FFFFFF">${initials}</text>
  <text x="300" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#E2E8F0">CoreConnect</text>
${textLines}
</svg>`;
}

async function main() {
  const products = await prisma.product.findMany({
    include: { images: true },
  });

  const dir = path.join(__dirname, '..', 'uploads', 'products');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const svg = generateSVG(p.name, i);
    const filename = `${p.sku}.svg`;
    fs.writeFileSync(path.join(dir, filename), svg);

    const imgUrl = `/uploads/products/${filename}`;
    if (p.images.length > 0) {
      await prisma.productImage.updateMany({
        where: { productId: p.id },
        data: { url: imgUrl },
      });
    } else {
      await prisma.productImage.create({
        data: {
          url: imgUrl,
          altText: p.name,
          isPrimary: true,
          sortOrder: 0,
          productId: p.id,
        },
      });
    }
  }

  console.log(`Generated ${products.length} product images`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
