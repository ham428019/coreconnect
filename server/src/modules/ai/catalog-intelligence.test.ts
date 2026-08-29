import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogSummary, CatalogContext, CatalogProduct, resolveCatalogIntent } from './catalog-intelligence';

const product = (data: Partial<CatalogProduct> & Pick<CatalogProduct, 'name' | 'slug' | 'price' | 'stockQty' | 'tags' | 'specs' | 'description' | 'brand' | 'category'>): CatalogProduct => ({
  lowStockThreshold: 10,
  shortDescription: data.description,
  productType: data.tags[0] || null,
  keyFeatures: Object.entries(data.specs).map(([key, value]) => `${key}: ${value}`),
  warranty: data.specs.warranty || null,
  compatibility: [],
  useCases: data.tags.filter(tag => ['gaming', 'esports', 'productivity'].includes(tag)),
  colors: [],
  dimensions: null,
  weight: null,
  variants: [],
  rating: 0,
  reviewCount: 0,
  orderCount: 0,
  ...data,
});

// These fixtures mirror facts already present in prisma/seed.ts; no invented catalog claims.
const catalog: CatalogProduct[] = [
  product({
    name: 'Secretlab TITAN Evo 2022', slug: 'secretlab-titan-evo-2022', price: 549.99, stockQty: 23,
    brand: 'Secretlab', category: 'Gaming', tags: ['chair', 'secretlab', 'gaming', 'ergonomic'],
    description: 'Cold-cure foam technology, 4-way L-ADAPT lumbar support, magnetic memory foam head pillow, CloudSwap 4D armrests. 5-year warranty.',
    specs: { foam: 'Cold-cure', lumbar: '4-way L-ADAPT', armrests: 'CloudSwap 4D', warranty: '5 years' },
    warranty: '5 years',
  }),
  product({
    name: 'Razer BlackWidow V4 Pro', slug: 'razer-blackwidow-v4-pro', price: 229.99, stockQty: 45,
    brand: 'Razer', category: 'Peripherals', tags: ['keyboard', 'razer', 'mechanical', 'gaming'],
    description: 'Razer Yellow linear switches, command dial, 8 macro keys, Chroma underglow. Full-size mechanical gaming keyboard.',
    specs: { switches: 'Razer Yellow Linear', layout: 'Full-size', macros: '8 keys', backlight: 'Chroma RGB' },
  }),
  product({
    name: 'Logitech G Pro X TKL Keyboard', slug: 'logitech-g-pro-x-tkl-keyboard', price: 149.99, stockQty: 67,
    brand: 'Logitech', category: 'Peripherals', tags: ['keyboard', 'logitech', 'tkl', 'esports'],
    description: 'Tenkeyless, GX Blue Clicky switches, LIGHTSYNC RGB, detachable USB-C. Esports standard tournament keyboard.',
    specs: { layout: 'Tenkeyless', switches: 'GX Blue Clicky', backlight: 'LIGHTSYNC RGB', connection: 'USB-C Detachable' },
  }),
  product({
    name: 'Keychron Q1 Pro', slug: 'keychron-q1-pro', price: 199.99, stockQty: 38,
    brand: 'Keychron', category: 'Peripherals', tags: ['keyboard', 'keychron', 'wireless', 'aluminum'],
    description: '75% aluminum wireless, hot-swappable, QMK/VIA programmable, gasket mount. Premium custom keyboard experience.',
    specs: { layout: '75%', material: 'Aluminum', connection: 'Wireless/USB-C', switches: 'Hot-swappable' },
  }),
  product({
    name: 'Logitech G Pro X Superlight 2', slug: 'logitech-g-pro-x-superlight-2', price: 159.99, stockQty: 73,
    brand: 'Logitech', category: 'Peripherals', tags: ['mouse', 'logitech', 'wireless', 'esports'],
    description: '<60g ultra-lightweight, HERO 2 32K DPI sensor, LIGHTFORCE hybrid switches, 95-hour battery. Pro esports choice.',
    specs: { weight: '60g', sensor: 'HERO 2 32K', battery: '95 hours', switches: 'LIGHTFORCE' },
  }),
  product({
    name: 'Razer DeathAdder V3 Pro', slug: 'razer-deathadder-v3-pro', price: 149.99, stockQty: 61,
    brand: 'Razer', category: 'Peripherals', tags: ['mouse', 'razer', 'wireless', 'ergonomic'],
    description: '63g, Focus Pro 30K optical sensor, 90-hour battery, ergonomic right-hand design. Wireless esports mouse.',
    specs: { weight: '63g', sensor: 'Focus Pro 30K', battery: '90 hours', design: 'Ergonomic right-hand' },
  }),
];

const emptyContext = (): CatalogContext => ({ lastProduct: null, lastProducts: [] });

test('answers a named-product warranty question from structured data', () => {
  const answer = resolveCatalogIntent(catalog, 'What is the warranty period of Secretlab TITAN Evo 2022?', emptyContext());
  assert.match(answer?.reply || '', /5-year/i);
  assert.doesNotMatch(answer?.reply || '', /no matching/i);
});

test('answers product price exactly', () => {
  const answer = resolveCatalogIntent(catalog, 'How much does Secretlab TITAN Evo 2022 cost?', emptyContext());
  assert.match(answer?.reply || '', /\$549\.99/);
});

test('answers stock from catalog quantity', () => {
  const answer = resolveCatalogIntent(catalog, 'Is the Secretlab TITAN Evo 2022 in stock?', emptyContext());
  assert.match(answer?.reply || '', /23 units available/i);
});

test('answers an arbitrary specification attribute such as foam', () => {
  const answer = resolveCatalogIntent(catalog, 'What type of foam does Secretlab TITAN Evo 2022 use?', emptyContext());
  assert.match(answer?.reply || '', /foam: Cold-cure/i);
});

test('returns listed specifications without invented fields', () => {
  const answer = resolveCatalogIntent(catalog, 'What are the specifications of Keychron Q1 Pro?', emptyContext());
  assert.match(answer?.reply || '', /QMK|Wireless\/USB-C|Hot-swappable/i);
  assert.doesNotMatch(answer?.reply || '', /warranty/i);
});

test('filters by product type, features, use case, price, and stock together', () => {
  const answer = resolveCatalogIntent(catalog, 'Show me wireless gaming mice under $200 that are in stock.', emptyContext());
  assert.match(answer?.reply || '', /Superlight 2/);
  assert.match(answer?.reply || '', /DeathAdder V3 Pro/);
  assert.doesNotMatch(answer?.reply || '', /Keychron/);
});

test('finds wireless gaming mice without requiring a price filter', () => {
  const answer = resolveCatalogIntent(catalog, 'Show me wireless gaming mice.', emptyContext());
  assert.match(answer?.reply || '', /Superlight 2/);
  assert.match(answer?.reply || '', /DeathAdder V3 Pro/);
});

test('counts gaming products exactly without treating many as a keyword', () => {
  const answer = resolveCatalogIntent(catalog, 'How many gaming products are available?', emptyContext());
  assert.equal(answer?.stats?.[0]?.value, '5');
  assert.doesNotMatch(answer?.reply || '', /matching.*many/i);
});

test('counts in-stock keyboards exactly', () => {
  const answer = resolveCatalogIntent(catalog, 'How many keyboards are in stock?', emptyContext());
  assert.equal(answer?.stats?.[0]?.value, '3');
});

test('compares two named catalog products factually', () => {
  const answer = resolveCatalogIntent(catalog, 'Compare Razer BlackWidow V4 Pro and Logitech G Pro X TKL Keyboard.', emptyContext());
  assert.match(answer?.reply || '', /Razer BlackWidow V4 Pro/);
  assert.match(answer?.reply || '', /Logitech G Pro X TKL Keyboard/);
  assert.equal(answer?.links?.length, 2);
});

test('does not invent an objective comparison winner', () => {
  const context = { lastProduct: catalog[1], lastProducts: [catalog[1], catalog[2]] };
  const answer = resolveCatalogIntent(catalog, 'Which one has better specifications?', context);
  assert.match(answer?.reply || '', /no objective overall winner/i);
});

test('recommends only matching in-catalog products', () => {
  const answer = resolveCatalogIntent(catalog, 'Recommend a wireless gaming mouse under $170.', emptyContext());
  assert.match(answer?.reply || '', /DeathAdder V3 Pro|Superlight 2/);
  assert.ok(answer?.links?.every(link => catalog.some(item => item.slug === link.slug)));
});

test('uses the last product for follow-up pronouns', () => {
  const first = resolveCatalogIntent(catalog, 'Tell me about Secretlab TITAN Evo 2022.', emptyContext());
  const context = { lastProduct: first?.lastProduct || null, lastProducts: first?.lastProducts || [] };
  const warranty = resolveCatalogIntent(catalog, 'What is its warranty?', context);
  const stock = resolveCatalogIntent(catalog, 'Is it in stock?', context);
  assert.match(warranty?.reply || '', /5-year/i);
  assert.match(stock?.reply || '', /23 units/i);
});

test('states when a requested fact is unavailable', () => {
  const answer = resolveCatalogIntent(catalog, 'What is the warranty of Logitech G Pro X TKL Keyboard?', emptyContext());
  assert.match(answer?.reply || '', /not available/i);
});

test('uses a clean no-results response', () => {
  const answer = resolveCatalogIntent(catalog, 'Recommend a gaming mouse under $50.', emptyContext());
  assert.equal(answer?.reply, "I couldn't find any products matching those criteria.");
});

test('handles the Recommendations quick action using catalog products', () => {
  const answer = resolveCatalogIntent(catalog, 'Recommendations', emptyContext());
  assert.match(answer?.reply || '', /current CoreConnect catalog/i);
  assert.ok((answer?.links?.length || 0) > 0);
});

test('builds a grounded fallback summary from catalog facts only', () => {
  const summary = buildCatalogSummary(catalog[0]);
  assert.match(summary, /Cold-cure foam/i);
  assert.match(summary, /4-way L-ADAPT lumbar/i);
  assert.match(summary, /CloudSwap 4D armrests/i);
  assert.match(summary, /5-year warranty/i);
  assert.doesNotMatch(summary, /leather|recline|weight capacity/i);
});
