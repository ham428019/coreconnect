export interface CatalogProduct {
  name: string;
  slug: string;
  price: number;
  stockQty: number;
  lowStockThreshold: number;
  tags: string[];
  specs: Record<string, string>;
  description: string;
  shortDescription: string;
  brand: string | null;
  category: string;
  productType: string | null;
  keyFeatures: string[];
  warranty: string | null;
  compatibility: string[];
  useCases: string[];
  colors: string[];
  dimensions: string | null;
  weight: number | null;
  variants: string[];
  rating: number;
  reviewCount: number;
  orderCount: number;
}

export interface CatalogContext {
  lastProduct: CatalogProduct | null;
  lastProducts: CatalogProduct[];
}

export interface CatalogResolution {
  reply: string;
  links?: { label: string; slug: string }[];
  stats?: { label: string; value: string }[];
  lastProduct?: CatalogProduct | null;
  lastProducts?: CatalogProduct[];
}

export function buildCatalogSummary(product: {
  name: string;
  specs: unknown;
  keyFeatures: string[];
  shortDescription: string | null;
  description: string;
  warranty: string | null;
}): string {
  const specs = Object.entries((product.specs || {}) as Record<string, unknown>);
  const featureSpecs = specs
    .filter(([key]) => !/warranty|guarantee/i.test(key))
    .slice(0, 4)
    .map(([key, value]) => `${value} ${key.replace(/[-_]/g, ' ')}`);
  const features = featureSpecs.length ? featureSpecs : product.keyFeatures.slice(0, 4);
  const base = features.length
    ? `${product.name} features ${features.join(', ')}.`
    : `${product.name}: ${product.shortDescription || product.description.split(/(?<=[.!?])\s/)[0]}`;
  const warranty = product.warranty || specs.find(([key]) => /warranty|guarantee/i.test(key))?.[1];
  if (!warranty) return base;
  const warrantyLabel = String(warranty).replace(/^(\d+)\s+years?$/i, '$1-year');
  return `${base} It includes a ${warrantyLabel} warranty.`;
}

interface TermGroup {
  words: string[];
  terms: string[];
  label: string;
}

const PRODUCT_TYPES: TermGroup[] = [
  { words: ['keyboard', 'keyboards'], terms: ['keyboard'], label: 'keyboards' },
  { words: ['mouse', 'mice'], terms: ['mouse'], label: 'mice' },
  { words: ['headset', 'headsets', 'headphone', 'headphones', 'earbud', 'earbuds'], terms: ['headset', 'headphones', 'earbuds'], label: 'headsets' },
  { words: ['speaker', 'speakers', 'soundbar', 'soundbars'], terms: ['speaker', 'soundbar'], label: 'speakers' },
  { words: ['monitor', 'monitors', 'display', 'displays'], terms: ['monitor', 'display'], label: 'monitors' },
  { words: ['graphics card', 'graphics cards', 'gpu', 'gpus', 'video card'], terms: ['gpu', 'graphics card'], label: 'graphics cards' },
  { words: ['ssd', 'ssds', 'nvme', 'hard drive', 'hard drives', 'hdd'], terms: ['ssd', 'nvme', 'hdd'], label: 'storage drives' },
  { words: ['ram', 'memory kit', 'memory kits'], terms: ['ram', 'memory'], label: 'memory kits' },
  { words: ['cpu', 'cpus', 'processor', 'processors'], terms: ['cpu', 'processor'], label: 'processors' },
  { words: ['motherboard', 'motherboards', 'mobo'], terms: ['motherboard'], label: 'motherboards' },
  { words: ['power supply', 'power supplies', 'psu', 'psus'], terms: ['psu', 'power supply'], label: 'power supplies' },
  { words: ['cooler', 'coolers', 'cpu fan', 'case fan', 'aio'], terms: ['cooler', 'aio'], label: 'coolers' },
  { words: ['pc case', 'pc cases', 'computer case', 'computer cases', 'chassis'], terms: ['case', 'pc case'], label: 'PC cases' },
  { words: ['controller', 'controllers', 'gamepad', 'gamepads'], terms: ['controller'], label: 'controllers' },
  { words: ['chair', 'chairs', 'gaming chair', 'office chair'], terms: ['chair'], label: 'chairs' },
  { words: ['camera', 'cameras', 'webcam', 'webcams'], terms: ['camera', 'webcam'], label: 'cameras' },
  { words: ['microphone', 'microphones', 'mic', 'mics'], terms: ['microphone', 'mic'], label: 'microphones' },
  { words: ['power bank', 'power banks', 'powerbank', 'charger', 'chargers'], terms: ['power bank', 'charger'], label: 'chargers and power banks' },
  { words: ['smartwatch', 'smartwatches', 'smart watch', 'fitness tracker'], terms: ['smartwatch', 'wearable'], label: 'wearables' },
  { words: ['tablet', 'tablets', 'ipad'], terms: ['tablet'], label: 'tablets' },
  { words: ['laptop', 'laptops', 'notebook', 'notebooks'], terms: ['laptop'], label: 'laptops' },
  { words: ['router', 'routers', 'mesh network', 'access point'], terms: ['router', 'networking'], label: 'routers' },
  { words: ['printer', 'printers'], terms: ['printer'], label: 'printers' },
  { words: ['projector', 'projectors'], terms: ['projector'], label: 'projectors' },
  { words: ['cable', 'cables', 'adapter', 'adapters', 'dongle'], terms: ['cable', 'adapter'], label: 'cables and adapters' },
];

const FEATURES: TermGroup[] = [
  { words: ['wireless', 'bluetooth', 'cordless'], terms: ['wireless', 'bluetooth', '2.4ghz'], label: 'wireless' },
  { words: ['mechanical', 'mechanical switches'], terms: ['mechanical', 'hot-swappable', 'switches'], label: 'mechanical' },
  { words: ['rgb', 'backlit', 'backlight', 'lighting'], terms: ['rgb', 'backlit', 'backlight', 'lighting'], label: 'RGB/backlighting' },
  { words: ['noise cancelling', 'noise canceling', 'anc'], terms: ['noise cancellation', 'noise cancelling', 'noise canceling', 'anc'], label: 'noise cancellation' },
  { words: ['4k', 'uhd', 'ultra hd'], terms: ['4k', 'uhd', '2160'], label: '4K' },
  { words: ['1440p', 'qhd', '2k'], terms: ['1440p', 'qhd', '2560x1440'], label: '1440p' },
  { words: ['waterproof', 'water resistant', 'water-resistant'], terms: ['waterproof', 'water resistant', 'ipx', 'ip55', 'ip67', 'ip68'], label: 'water resistance' },
  { words: ['ergonomic', 'ergonomics'], terms: ['ergonomic', 'lumbar'], label: 'ergonomic' },
];

const USE_CASES: TermGroup[] = [
  { words: ['gaming', 'gamer'], terms: ['gaming', 'gamer', 'esports'], label: 'gaming' },
  { words: ['office', 'work', 'productivity'], terms: ['office', 'productivity', 'professional'], label: 'office/productivity' },
  { words: ['programming', 'coding', 'developer'], terms: ['programming', 'coding', 'productivity', 'qmk', 'via programmable'], label: 'programming' },
  { words: ['travel', 'portable', 'on the go'], terms: ['travel', 'portable', 'compact'], label: 'travel' },
  { words: ['creator', 'content creation', 'video editing'], terms: ['creator', 'creation', 'video editing'], label: 'content creation' },
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'available', 'availability', 'be', 'better', 'between',
  'can', 'category', 'cheapest', 'compare', 'comparison', 'cost', 'count', 'currently',
  'description', 'details', 'does', 'for', 'feature', 'features', 'find', 'give', 'has',
  'have', 'how', 'in', 'information', 'is', 'it', 'its', 'key', 'kind', 'long', 'many',
  'me', 'much', 'of', 'one', 'period', 'please', 'price', 'product', 'products', 'recommend',
  'recommendation', 'recommendations', 'show', 'spec', 'specification', 'specifications',
  'stock', 'suitable', 'tell', 'than', 'that', 'the', 'their', 'them', 'these', 'they',
  'this', 'those', 'to', 'type', 'under', 'versus', 'vs', 'warranty', 'what', 'which',
  'with', 'years', 'you', 'your',
]);

const GENERIC_NAME_WORDS = new Set([
  ...PRODUCT_TYPES.flatMap(type => type.words.flatMap(word => word.split(' '))),
  'gaming', 'wireless', 'pro', 'ultra', 'plus', 'black', 'edition', 'series', 'gen',
]);

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

function normalize(value: string): string {
  return value.toLowerCase().replace(/[-_/]+/g, ' ').replace(/[^a-z0-9.%+ ]/g, ' ').replace(/\.(?!\d)/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokens(value: string): string[] {
  return normalize(value).split(' ').map(token => token.replace(/^\.+|\.+$/g, '')).filter(Boolean);
}

function includesPhrase(message: string, phrase: string): boolean {
  const normalizedPhrase = normalize(phrase);
  return ` ${normalize(message)} `.includes(` ${normalizedPhrase} `);
}

function productText(product: CatalogProduct): string {
  return normalize([
    product.name,
    product.brand || '',
    product.category,
    product.productType || '',
    product.tags.join(' '),
    product.useCases.join(' '),
    product.keyFeatures.join(' '),
    product.compatibility.join(' '),
    product.colors.join(' '),
    product.description,
    Object.entries(product.specs).map(([key, value]) => `${key} ${value}`).join(' '),
  ].join(' '));
}

function stockText(product: CatalogProduct): string {
  if (product.stockQty <= 0) return 'out of stock';
  if (product.stockQty <= product.lowStockThreshold) return `low in stock (${product.stockQty} units available)`;
  return `in stock (${product.stockQty} units available)`;
}

function detectGroups(message: string, groups: TermGroup[]): TermGroup[] {
  return groups.filter(group => group.words.some(word => includesPhrase(message, word)));
}

function productMatchScore(product: CatalogProduct, message: string): number {
  const msg = normalize(message);
  const productName = normalize(product.name);
  if (msg.includes(productName)) return 100;

  const queryTokens = new Set(tokens(message).filter(token => !STOP_WORDS.has(token)));
  const nameTokens = [...new Set(tokens(product.name))];
  const matched = nameTokens.filter(token => queryTokens.has(token));
  let score = matched.length * 3;
  if (product.brand && includesPhrase(message, product.brand)) score += 3;
  score += matched.filter(token => token.length >= 5 && !GENERIC_NAME_WORDS.has(token)).length * 2;
  return score;
}

function findNamedProducts(catalog: CatalogProduct[], message: string): CatalogProduct[] {
  const scored = catalog
    .map(product => ({ product, score: productMatchScore(product, message) }))
    .filter(item => item.score >= 5)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return [];
  return scored.map(item => item.product);
}

function resolveProduct(catalog: CatalogProduct[], message: string, context: CatalogContext): CatalogProduct | null {
  const named = findNamedProducts(catalog, message);
  if (named.length === 1 || (named.length > 1 && productMatchScore(named[0], message) > productMatchScore(named[1], message))) {
    return named[0];
  }

  if (/\b(it|its|this|that|the product|this product|that product)\b/i.test(message)) {
    return context.lastProduct || context.lastProducts[0] || null;
  }
  return null;
}

function specValue(product: CatalogProduct, keys: string[]): { key: string; value: string } | null {
  const wanted = keys.map(normalize);
  for (const [key, value] of Object.entries(product.specs)) {
    const normalizedKey = normalize(key);
    if (wanted.some(item => normalizedKey === item || normalizedKey.includes(item) || item.includes(normalizedKey))) {
      return { key, value: String(value) };
    }
  }
  return null;
}

function queriedSpec(product: CatalogProduct, message: string): { key: string; value: string } | null {
  const msg = normalize(message);
  const aliases: Record<string, string[]> = {
    'max clock': ['clock speed', 'frequency', 'speed'],
    refresh: ['refresh rate', 'hz'],
    connection: ['connectivity', 'connection type'],
    compatibility: ['compatible', 'works with', 'support'],
    foam: ['foam', 'foam type'],
    warranty: ['warranty', 'guarantee'],
  };

  for (const [key, value] of Object.entries(product.specs)) {
    const keyText = normalize(key);
    if (includesPhrase(msg, keyText) || (aliases[keyText] || []).some(alias => includesPhrase(msg, alias))) {
      return { key, value: String(value) };
    }
  }
  return null;
}

function productFacts(product: CatalogProduct, message: string): CatalogResolution | null {
  const lower = normalize(message);
  const link = [{ label: product.name, slug: product.slug }];
  const contextual = { lastProduct: product, lastProducts: [product] };
  const result = (reply: string): CatalogResolution => ({ reply, links: link, ...contextual });

  if (/\b(warranty|guarantee)\b/.test(lower)) {
    const warranty = product.warranty || specValue(product, ['warranty', 'guarantee'])?.value;
    const warrantyLabel = warranty?.replace(/^(\d+)\s+years?$/i, '$1-year');
    return result(warranty
      ? `The ${product.name} has a ${warrantyLabel} warranty.`
      : `The warranty information for ${product.name} is not available.`);
  }
  if (/\b(price|cost|how much)\b/.test(lower)) {
    return result(`The ${product.name} costs ${money.format(product.price)}.`);
  }
  if (/\b(in stock|out of stock|stock status|availability|available|how many units)\b/.test(lower)) {
    return result(`The ${product.name} is ${stockText(product)}.`);
  }
  if (/\b(compatible|compatibility|works with|work with|supported platforms?)\b/.test(lower)) {
    const compatibility = product.compatibility.length
      ? product.compatibility.join(', ')
      : specValue(product, ['compatibility', 'compatible with'])?.value;
    return result(compatibility
      ? `The listed compatibility for ${product.name} is: ${compatibility}.`
      : `Compatibility information for ${product.name} is not available.`);
  }

  const attribute = queriedSpec(product, message);
  if (attribute && /\b(what|which|how|does|is|has|use|uses|support|tell)\b/.test(lower)) {
    const label = attribute.key.replace(/[-_]/g, ' ');
    return result(`${product.name} — ${label}: ${attribute.value}.`);
  }

  if (/\b(spec|specs|specification|specifications|technical details)\b/.test(lower)) {
    const specs = Object.entries(product.specs);
    return result(specs.length
      ? `${product.name} specifications: ${specs.map(([key, value]) => `${key.replace(/[-_]/g, ' ')}: ${value}`).join('; ')}.`
      : `Specifications for ${product.name} are not available.`);
  }
  if (/\b(key features|features|what does .* (have|offer)|what .* comes with)\b/.test(lower)) {
    const features = product.keyFeatures.length
      ? product.keyFeatures
      : Object.entries(product.specs).map(([key, value]) => `${key.replace(/[-_]/g, ' ')}: ${value}`);
    return result(features.length
      ? `${product.name} features ${features.slice(0, 8).join(', ')}.`
      : `Feature information for ${product.name} is not available.`);
  }
  if (/\b(category|product type|kind of product)\b/.test(lower)) {
    return result(`${product.name} is listed in ${product.category}${product.productType ? ` as a ${product.productType}` : ''}.`);
  }
  if (/\b(colou?r|colou?rs)\b/.test(lower)) {
    const colors = product.colors.length ? product.colors : specValue(product, ['color', 'colors', 'colour', 'colours'])?.value?.split(',') || [];
    return result(colors.length
      ? `${product.name} is listed in ${colors.join(', ')}.`
      : `Color information for ${product.name} is not available.`);
  }
  if (/\b(dimension|dimensions|measurements?|size)\b/.test(lower)) {
    const dimensions = product.dimensions || specValue(product, ['dimensions', 'size', 'height', 'width'])?.value;
    return result(dimensions
      ? `The listed dimensions/size for ${product.name} are ${dimensions}.`
      : `Dimensions for ${product.name} are not available.`);
  }
  if (/\b(weight|weigh|heavy)\b/.test(lower)) {
    const weight = product.weight != null ? `${product.weight} kg` : specValue(product, ['weight'])?.value;
    return result(weight
      ? `The listed weight for ${product.name} is ${weight}.`
      : `Weight information for ${product.name} is not available.`);
  }
  if (/\b(variant|variants|options|models)\b/.test(lower)) {
    return result(product.variants.length
      ? `${product.name} is available in these variants: ${product.variants.join(', ')}.`
      : `No product variants are listed for ${product.name}.`);
  }
  if (/\b(tell me about|describe|overview|details about|what is)\b/.test(lower)) {
    return result(`${product.name}: ${product.shortDescription || product.description}`);
  }
  return null;
}

function comparison(catalog: CatalogProduct[], message: string, context: CatalogContext): CatalogResolution | null {
  if (!/\b(compare|comparison|versus|vs|difference|which (one )?is better|better value|value for money|better specifications)\b/i.test(message)) return null;

  const explicit = findNamedProducts(catalog, message);
  const products: CatalogProduct[] = [];
  for (const product of [...explicit, ...context.lastProducts]) {
    if (!products.some(item => item.slug === product.slug)) products.push(product);
    if (products.length === 2) break;
  }

  if (products.length < 2) {
    return { reply: 'Please tell me which two catalog products you would like to compare.', lastProducts: products };
  }

  const lines = products.map(product => {
    const specs = Object.entries(product.specs).slice(0, 5).map(([key, value]) => `${key.replace(/[-_]/g, ' ')}: ${value}`).join(', ');
    const rating = product.reviewCount ? `, ${product.rating.toFixed(1)}/5 from ${product.reviewCount} review(s)` : '';
    return `• ${product.name}: ${money.format(product.price)}, ${stockText(product)}${rating}${specs ? `. ${specs}` : ''}`;
  });

  let verdict = '';
  if (/\b(value for money|better value|worth it)\b/i.test(message)) {
    const [a, b] = products;
    const cheaper = a.price <= b.price ? a : b;
    const other = cheaper === a ? b : a;
    verdict = cheaper.reviewCount > 0 && other.reviewCount > 0 && cheaper.rating >= other.rating
      ? ` Based on catalog price and customer ratings, ${cheaper.name} offers the stronger measured value.`
      : ` ${cheaper.name} is cheaper by ${money.format(Math.abs(a.price - b.price))}, but the catalog does not provide enough comparable evidence to declare an overall value winner.`;
  } else if (/\b(better specifications|better specs|which (one )?is better)\b/i.test(message)) {
    verdict = ' The specifications describe different attributes, so there is no objective overall winner without knowing which features matter most to you.';
  }

  return {
    reply: `Here is a factual catalog comparison:\n${lines.join('\n')}${verdict}`,
    links: products.map(product => ({ label: product.name, slug: product.slug })),
    lastProduct: products[0],
    lastProducts: products,
  };
}

function extractPrice(message: string): { min?: number; max?: number } {
  const lower = normalize(message);
  const between = lower.match(/(?:between|from)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (between) return { min: Math.min(Number(between[1]), Number(between[2])), max: Math.max(Number(between[1]), Number(between[2])) };
  const under = lower.match(/(?:under|below|less than|at most|up to|budget(?: of)?|within)\s*\$?\s*(\d+(?:\.\d+)?)/);
  const over = lower.match(/(?:over|above|more than|at least|starting at)\s*\$?\s*(\d+(?:\.\d+)?)/);
  return { max: under ? Number(under[1]) : undefined, min: over ? Number(over[1]) : undefined };
}

function meaningfulKeywords(
  message: string,
  brands: string[],
  categories: string[],
  groups: TermGroup[],
): string[] {
  const removed = new Set([
    ...brands.flatMap(tokens),
    ...categories.flatMap(tokens),
    ...groups.flatMap(group => [...group.words, ...group.terms].flatMap(tokens)),
  ]);
  return [...new Set(tokens(message).filter(token =>
    token.length > 2 &&
    !STOP_WORDS.has(token) &&
    !removed.has(token) &&
    !/^\d+(?:\.\d+)?$/.test(token),
  ))];
}

function catalogSearch(catalog: CatalogProduct[], message: string): CatalogResolution | null {
  const lower = normalize(message);
  const isCount = /\b(how many|number of|count)\b/.test(lower);
  const isRecommendation = /\b(recommend|recommendation|recommendations|suggest|suitable|best for|what should i buy)\b/.test(lower);
  const hasSearchCue = /\b(show me|find|search|looking for|do you have|which|products?|buy|cheapest|best|in stock|out of stock|available|under|below|over|above)\b/.test(lower);
  const types = detectGroups(message, PRODUCT_TYPES);
  const featureGroups = detectGroups(message, FEATURES);
  const useCaseGroups = detectGroups(message, USE_CASES);
  const price = extractPrice(message);

  const brands = [...new Set(catalog.map(product => product.brand).filter((brand): brand is string => Boolean(brand)))];
  const brand = brands.sort((a, b) => b.length - a.length).find(item => includesPhrase(message, item)) || null;
  const categoryNames = [...new Set(catalog.map(product => product.category).filter(Boolean))];
  const category = categoryNames
    .sort((a, b) => b.length - a.length)
    .find(item => includesPhrase(message, item) && !useCaseGroups.some(group => group.words.some(word => normalize(word) === normalize(item)))) || null;
  const availability = /\b(out of stock|sold out|unavailable)\b/.test(lower)
    ? 'out'
    : /\b(low stock|running low)\b/.test(lower)
      ? 'low'
      : /\b(in stock|available|availability)\b/.test(lower)
        ? 'in'
        : null;

  const allGroups = [...types, ...featureGroups, ...useCaseGroups];
  const keywords = meaningfulKeywords(message, brand ? [brand] : [], category ? [category] : [], allGroups);
  const hasFilters = Boolean(types.length || featureGroups.length || useCaseGroups.length || brand || category || availability || price.min !== undefined || price.max !== undefined || keywords.length);
  if (!isCount && !isRecommendation && !hasSearchCue && !hasFilters) return null;

  let matches = catalog.filter(product => {
    const text = productText(product);
    if (brand && normalize(product.brand || '') !== normalize(brand)) return false;
    if (category && normalize(product.category) !== normalize(category)) return false;
    if (types.length && !types.every(type => type.terms.some(term => includesPhrase(text, term)))) return false;
    if (featureGroups.length && !featureGroups.every(group => group.terms.some(term => includesPhrase(text, term)))) return false;
    if (useCaseGroups.length && !useCaseGroups.every(group => group.terms.some(term => includesPhrase(text, term)))) return false;
    if (price.min !== undefined && product.price < price.min) return false;
    if (price.max !== undefined && product.price > price.max) return false;
    if (availability === 'in' && product.stockQty <= 0) return false;
    if (availability === 'out' && product.stockQty > 0) return false;
    if (availability === 'low' && (product.stockQty <= 0 || product.stockQty > product.lowStockThreshold)) return false;
    if (keywords.length && !keywords.every(keyword => includesPhrase(text, keyword))) return false;
    return true;
  });

  const labels = [
    category,
    ...types.map(type => type.label),
    ...useCaseGroups.map(group => group.label),
    ...featureGroups.map(group => group.label),
    brand,
    price.max !== undefined ? `under ${money.format(price.max)}` : null,
    price.min !== undefined ? `over ${money.format(price.min)}` : null,
    availability === 'in' ? 'in stock' : availability === 'out' ? 'out of stock' : availability === 'low' ? 'low stock' : null,
  ].filter((value): value is string => Boolean(value));

  if (isCount) {
    const criteria = labels.length ? ` matching ${labels.join(' and ')}` : '';
    return {
      reply: matches.length
        ? `There ${matches.length === 1 ? 'is' : 'are'} ${matches.length} ${matches.length === 1 ? 'product' : 'products'} in the CoreConnect catalog${criteria}.`
        : `There are 0 products in the CoreConnect catalog${criteria}.`,
      stats: [{ label: 'Exact catalog count', value: String(matches.length) }],
      lastProduct: matches[0] || null,
      lastProducts: matches.slice(0, 5),
    };
  }

  if (!matches.length) {
    return { reply: "I couldn't find any products matching those criteria.", lastProduct: null, lastProducts: [] };
  }

  const wantsCheapest = /\b(cheapest|lowest price|most affordable|budget)\b/.test(lower);
  const wantsExpensive = /\b(most expensive|highest price|premium)\b/.test(lower);
  matches = [...matches].sort((a, b) => {
    if (wantsCheapest) return a.price - b.price;
    if (wantsExpensive) return b.price - a.price;
    if (isRecommendation && (a.stockQty > 0) !== (b.stockQty > 0)) return a.stockQty > 0 ? -1 : 1;
    return b.rating - a.rating || b.reviewCount - a.reviewCount || b.orderCount - a.orderCount || a.price - b.price;
  });

  const top = matches.slice(0, 5);
  const lines = top.map(product => `• ${product.name} — ${money.format(product.price)}, ${stockText(product)}`).join('\n');
  return {
    reply: `${isRecommendation ? 'Based on the current CoreConnect catalog, I recommend:' : 'I found these matching products:'}\n${lines}`,
    links: top.map(product => ({ label: product.name, slug: product.slug })),
    stats: matches.length > top.length ? [{ label: 'Additional matches', value: String(matches.length - top.length) }] : undefined,
    lastProduct: top[0],
    lastProducts: top,
  };
}

export function resolveCatalogIntent(
  catalog: CatalogProduct[],
  message: string,
  context: CatalogContext,
): CatalogResolution | null {
  const compared = comparison(catalog, message, context);
  if (compared) return compared;

  const product = resolveProduct(catalog, message, context);
  if (product) {
    const facts = productFacts(product, message);
    if (facts) return facts;
  }

  return catalogSearch(catalog, message);
}
