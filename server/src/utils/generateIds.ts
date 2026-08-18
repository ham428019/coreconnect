import crypto from 'crypto';

export function generateSKU(category: string, brand: string): string {
  const cat = category.substring(0, 3).toUpperCase();
  const brd = brand.substring(0, 3).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${cat}-${brd}-${rand}`;
}

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  return `CC-${year}-${rand}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
  return `INV-${year}-${rand}`;
}

export function generateReferenceCode(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
