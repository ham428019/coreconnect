import { prisma } from '../../config/database';

const USE_CASE_TAGS = new Set([
  'gaming', 'esports', 'office', 'productivity', 'professional', 'programming',
  'creator', 'travel', 'portable', 'repair', 'beginner', 'photography',
  'surveillance', 'smart-home', 'overclocking',
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function findSpec(specs: Record<string, unknown>, keys: string[]): string | null {
  for (const [key, value] of Object.entries(specs)) {
    if (keys.includes(key.toLowerCase().trim())) {
      const cleaned = cleanValue(value);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

export function deriveStructuredProductData(product: {
  tags: string[];
  specs: unknown;
  shortDescription: string | null;
}) {
  const specs = asRecord(product.specs);
  const keyFeatures = Object.entries(specs)
    .map(([key, value]) => {
      const cleaned = cleanValue(value);
      return cleaned ? `${key.replace(/[-_]/g, ' ')}: ${cleaned}` : null;
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, 8);

  const compatibility = findSpec(specs, ['compatibility', 'compatible with']);
  const colors = findSpec(specs, ['color', 'colors', 'colour', 'colours']);

  return {
    productType: product.tags[0]?.trim() || null,
    keyFeatures: keyFeatures.length
      ? keyFeatures
      : product.shortDescription?.split(',').map(item => item.trim()).filter(Boolean).slice(0, 8) || [],
    warranty: findSpec(specs, ['warranty', 'guarantee']),
    compatibility: compatibility ? [compatibility] : [],
    useCases: product.tags.filter(tag => USE_CASE_TAGS.has(tag.toLowerCase())),
    colors: colors ? colors.split(/[,/]/).map(color => color.trim()).filter(Boolean) : [],
  };
}

/** Promote facts already stored in specs/tags into queryable fields, without guessing. */
export async function backfillStructuredProductData(): Promise<void> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { productType: null },
        { keyFeatures: { isEmpty: true } },
      ],
    },
    select: {
      id: true,
      tags: true,
      specs: true,
      shortDescription: true,
      productType: true,
      keyFeatures: true,
      warranty: true,
      compatibility: true,
      useCases: true,
      colors: true,
    },
  });

  for (let index = 0; index < products.length; index += 10) {
    const batch = products.slice(index, index + 10);
    await Promise.all(batch.map(product => {
      const derived = deriveStructuredProductData(product);
      return prisma.product.update({
        where: { id: product.id },
        data: {
          productType: product.productType || derived.productType,
          keyFeatures: product.keyFeatures.length ? product.keyFeatures : derived.keyFeatures,
          warranty: product.warranty || derived.warranty,
          compatibility: product.compatibility.length ? product.compatibility : derived.compatibility,
          useCases: product.useCases.length ? product.useCases : derived.useCases,
          colors: product.colors.length ? product.colors : derived.colors,
        },
      });
    }));
  }

  if (products.length) {
    console.info(`[catalog] Structured ${products.length} existing product record(s) from stored catalog facts.`);
  }
}
