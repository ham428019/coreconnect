import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { optionalAuth } from '../../middleware/requireAuth';
import { AuthPayload } from '../../middleware/requireAuth';
import { apiResponse } from '../../utils/helpers';
import { chatWithHF } from './ai.service';
import { UserRole } from '@prisma/client';
import { buildCatalogSummary, CatalogProduct, resolveCatalogIntent } from './catalog-intelligence';

const router = Router();

const storeKnowledge = {
  name: 'CoreConnect',
  tagline: 'Your Core Destination for Tech',
  paymentMethods: ['Cash on Delivery', 'Bank Transfer'],
  shipping: {
    standard: '3-5 business days',
    express: '1-2 business days (where available)',
    freeThreshold: 75,
  },
  cod: { fee: 5, maxAmount: 500 },
  returnPolicy: { window: '14 days', condition: 'Unopened and in original packaging' },
  warranty: 'Manufacturer warranty applies. CoreConnect provides purchase verification.',
  contact: 'support@coreconnect.store, Monday-Friday 9AM-6PM EST, replies within 24 hours',
};

const features = [
  { title: 'Smart Search', description: 'Find products instantly with intelligent search' },
  { title: 'Compare', description: 'Compare up to 4 products side-by-side' },
  { title: 'Wishlist', description: 'Save products and track them later' },
  { title: 'Order Tracking', description: 'Live timeline from confirmation to delivery' },
  { title: 'Reviews', description: 'Read and write product reviews' },
  { title: 'Coupons', description: 'Apply promo codes at checkout' },
  { title: 'COD & Bank Transfer', description: 'Flexible payment options' },
  { title: 'AI Assistant', description: 'That is me!' },
];

const faqDatabase = [
  { keywords: ['shipping', 'delivery', 'how long', 'when arrive', 'arrive'], answer: `Standard shipping takes ${storeKnowledge.shipping.standard}. Express shipping (${storeKnowledge.shipping.express}) is available in select areas. Orders over $${storeKnowledge.shipping.freeThreshold} qualify for free standard shipping!` },
  { keywords: ['return', 'refund', 'exchange', 'money back'], answer: `You can return items within ${storeKnowledge.returnPolicy.window} of delivery. Products must be ${storeKnowledge.returnPolicy.condition}. Contact our support team to initiate a return.` },
  { keywords: ['payment', 'pay', 'cod', 'cash', 'bank transfer'], answer: `We accept ${storeKnowledge.paymentMethods.join(' and ')}. COD has a $${storeKnowledge.cod.fee} fee and is available for orders under $${storeKnowledge.cod.maxAmount}. Bank transfers are free but require manual verification.` },
  { keywords: ['warranty', 'guarantee', 'defective', 'broken'], answer: `All products come with manufacturer warranty. ${storeKnowledge.warranty} Contact us within 14 days if you receive a defective item.` },
  { keywords: ['track', 'where is my order', 'order status'], answer: 'Go to My Orders and click Track Shipment on any active order. You will see a live timeline from confirmation to delivery.' },
  { keywords: ['discount', 'coupon', 'promo', 'sale', 'deal'], answer: 'Check our homepage for current promotions! You can also apply coupon codes at checkout. Sign up for our newsletter to get exclusive deals.' },
  { keywords: ['contact', 'support', 'email', 'phone'], answer: `Reach us at ${storeKnowledge.contact}.` },
  { keywords: ['account', 'register', 'login', 'sign up', 'password'], answer: 'Click Sign Up in the top right to create an account. Registered users can track orders, save addresses, and write reviews.' },
  { keywords: ['stock', 'available', 'in stock', 'out of stock'], answer: 'Stock status is shown on every product page: Green = In Stock, Orange = Low Stock, Red = Out of Stock. You can also click Notify Me to get alerts when items are restocked.' },
  { keywords: ['compare', 'comparison', 'vs', 'difference'], answer: 'Use the Compare button on product pages to add items to your comparison list. You can compare up to 4 products side-by-side with specs, prices, and ratings.' },
];

const categoryAssociations: Record<string, { related: string[]; msg: string }> = {
  'processors': { related: ['motherboards', 'memory', 'ssd', 'cpu-coolers', 'power-supplies'], msg: 'Building a PC? You will need these compatible parts:' },
  'graphics-cards': { related: ['power-supplies', 'processors', 'memory', 'monitors', 'cpu-coolers'], msg: 'Powerful graphics need powerful companions:' },
  'motherboards': { related: ['processors', 'memory', 'ssd', 'cpu-coolers', 'pc-cases'], msg: 'Complete your build with these compatible components:' },
  'keyboards': { related: ['mice', 'mouse-pads', 'headsets', 'monitors'], msg: 'Complete your desk setup:' },
  'mice': { related: ['mouse-pads', 'keyboards', 'headsets'], msg: 'Pro gamers pair these with their mice:' },
};

interface ChatReply {
  reply: string;
  suggestions?: string[];
  features?: { title: string; description: string }[];
  categories?: string[];
  links?: { label: string; slug: string }[];
  stats?: { label: string; value: string }[];
  action?: { type: string; label: string; path: string };
}

interface ConversationContext {
  lastTypes: { words: string[]; tags: string[]; label: string }[];
  lastBrand: string | null;
  lastProducts: CatalogItem[];
  lastProduct: CatalogItem | null;
  history: { role: 'user' | 'bot'; text: string }[];
}

const emptyContext = (): ConversationContext => ({
  lastTypes: [],
  lastBrand: null,
  lastProducts: [],
  lastProduct: null,
  history: [],
});

const sessionStore = new Map<string, ConversationContext>();
const SESSION_LIMIT = 500;

function getContext(key: string): ConversationContext {
  let ctx = sessionStore.get(key);
  if (!ctx) {
    ctx = emptyContext();
    if (sessionStore.size >= SESSION_LIMIT) {
      const first = sessionStore.keys().next().value;
      if (first) sessionStore.delete(first);
    }
    sessionStore.set(key, ctx);
  }
  return ctx;
}

const DEICTIC = /\b(this|that|these|those|it|its|them|they|their)\b/i;

const isStaff = (role?: UserRole): boolean =>
  role === UserRole.EMPLOYEE || role === UserRole.MANAGER || role === UserRole.ADMIN;

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

function hasAny(message: string, keywords: string[]): boolean {
  return keywords.some(k => message.includes(k));
}

function findFAQ(message: string): string | null {
  const lower = message.toLowerCase();
  for (const faq of faqDatabase) {
    if (faq.keywords.some(k => lower.includes(k))) return faq.answer;
  }
  return null;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

function getGreeting(role?: UserRole): ChatReply {
  const tod = getTimeOfDay();
  if (isStaff(role)) {
    return {
      reply: `Good ${tod}! I'm Core, your ${role?.toLowerCase()} assistant. I can pull live store KPIs, low stock alerts, recent orders, and explain how to manage products, orders, coupons, and users. What do you need?`,
      suggestions: ['Low Stock', 'KPIs', 'Recent Orders', 'Add Product'],
    };
  }
  return {
    reply: `Good ${tod}! I'm Core, your AI shopping assistant. I can help you find products, compare them, check specs and stock, or track your orders. What would you like to do?`,
    suggestions: ['Website Features', 'Recommendations', 'How to Order', 'Track Order'],
  };
}

function getFallback(role?: UserRole): ChatReply {
  if (isStaff(role)) {
    return {
      reply: "I'm not sure about that, but I can help with customer questions (shipping, returns, payments) or pull live store data. Try asking me about KPIs, low stock, recent orders, or how to manage products and coupons!",
      suggestions: ['KPIs', 'Low Stock', 'Recent Orders', 'Shipping Info'],
    };
  }
  return {
    reply: "I'm not sure about that, but I can help with products, orders, shipping, returns, and more. Try asking me about those topics!",
    suggestions: ['Shipping Info', 'Return Policy', 'Payment Methods', 'Contact Support'],
  };
}

/* ------------------------------------------------------------------ */
/*  Real product catalog + retrieval engine (DB-backed, no guessing)   */
/* ------------------------------------------------------------------ */

type CatalogItem = CatalogProduct;

const PRODUCT_TYPES: { words: string[]; tags: string[]; label: string }[] = [
  { words: ['keyboard', 'keyboards'], tags: ['keyboard'], label: 'keyboards' },
  { words: ['mouse', 'mice'], tags: ['mouse'], label: 'mice' },
  { words: ['headset', 'headsets', 'headphone', 'headphones', 'earbud', 'earbuds', 'earphone', 'earphones'], tags: ['headphones', 'headset', 'earbuds', 'earphones'], label: 'headsets' },
  { words: ['speaker', 'speakers', 'soundbar', 'sound bars'], tags: ['speaker', 'speakers', 'soundbar'], label: 'speakers' },
  { words: ['monitor', 'monitors', 'display', 'displays', 'screen', 'screens'], tags: ['monitor', 'display'], label: 'monitors' },
  { words: ['gpu', 'graphics card', 'graphics cards', 'video card', 'video cards', 'graphic card'], tags: ['gpu', 'graphics-card', 'graphics'], label: 'graphics cards' },
  { words: ['ssd', 'solid state', 'solid-state', 'nvme', 'hard drive', 'hdd', 'storage drive'], tags: ['ssd', 'storage', 'hdd', 'nvme'], label: 'storage drives' },
  { words: ['ram', 'memory', 'dram'], tags: ['ram', 'memory'], label: 'RAM kits' },
  { words: ['cpu', 'processor', 'processors', 'chip'], tags: ['cpu', 'processor'], label: 'processors' },
  { words: ['motherboard', 'motherboards', 'mobo'], tags: ['motherboard'], label: 'motherboards' },
  { words: ['power supply', 'power supplies', 'psu'], tags: ['psu', 'power-supply'], label: 'power supplies' },
  { words: ['cooler', 'cooling', 'aio', 'cpu fan', 'case fan', 'liquid cooler'], tags: ['cooler', 'aio', 'cooling'], label: 'coolers' },
  { words: ['pc case', 'pc cases', 'computer case', 'computer cases', 'desktop case', 'tower', 'chassis'], tags: ['case', 'pc-case'], label: 'PC cases' },
  { words: ['controller', 'controllers', 'gamepad', 'game pad'], tags: ['controller'], label: 'controllers' },
  { words: ['chair', 'chairs', 'gaming chair', 'office chair'], tags: ['chair'], label: 'chairs' },
  { words: ['camera', 'cameras', 'webcam', 'web cam'], tags: ['camera', 'webcam'], label: 'cameras' },
  { words: ['microphone', 'microphones', 'mic'], tags: ['microphone', 'mic'], label: 'microphones' },
  { words: ['power bank', 'powerbanks', 'power bank', 'charger', 'charging pad', 'wireless charger'], tags: ['power-bank', 'charger'], label: 'power banks' },
  { words: ['smartwatch', 'smart watch', 'fitness tracker', 'activity tracker'], tags: ['watch', 'wearable'], label: 'wearables' },
  { words: ['tablet', 'tablets', 'ipad'], tags: ['tablet'], label: 'tablets' },
  { words: ['laptop', 'laptops', 'notebook', 'notebooks'], tags: ['laptop'], label: 'laptops' },
  { words: ['router', 'routers', 'mesh network', 'access point', 'wifi 6', 'wi-fi 6'], tags: ['router', 'networking'], label: 'routers' },
  { words: ['printer', 'printers'], tags: ['printer'], label: 'printers' },
  { words: ['projector', 'projectors'], tags: ['projector'], label: 'projectors' },
  { words: ['smart speaker', 'smart home', 'smart bulb', 'smart plug'], tags: ['smart-home', 'smart-speaker', 'smart-bulb'], label: 'smart home products' },
  { words: ['security camera', 'security system', 'surveillance', 'doorbell', 'alarm system'], tags: ['security', 'surveillance', 'doorbell'], label: 'security cameras' },
  { words: ['cable', 'cables', 'hdmi cable', 'usb cable', 'adapter', 'adapters', 'dongle'], tags: ['cable', 'adapter', 'hdmi'], label: 'cables' },
  { words: ['external drive', 'external storage', 'usb drive', 'flash drive', 'memory card', 'microsd', 'sd card'], tags: ['storage', 'usb-drive', 'memory-card'], label: 'storage' },
];

const FEATURE_MAP: { words: string[]; terms: string[] }[] = [
  { words: ['rgb', 'chroma', 'backlit', 'backlight', 'lighting', 'lighted'], terms: ['rgb', 'chroma', 'backlit', 'backlight', 'lighting', 'lighted'] },
  { words: ['mechanical', 'mech'], terms: ['mechanical', 'mech', 'hot-swap', 'hotswap', 'hot swappable'] },
  { words: ['wireless', 'bluetooth', '2.4ghz', '2.4 ghz', 'cordless'], terms: ['wireless', 'bluetooth', '2.4ghz', '2.4 ghz', 'cordless'] },
  { words: ['wired', 'usb-c', 'usb c'], terms: ['wired', 'usb-c', 'usb c'] },
  { words: ['tkl', 'tenkeyless', 'compact'], terms: ['tkl', 'tenkeyless', '75%', 'compact'] },
  { words: ['esports', 'e-sports', 'competitive', 'pro gaming'], terms: ['esports', 'e-sports', 'competitive'] },
  { words: ['gaming', 'game', 'gamer'], terms: ['gaming', 'gamer', 'esports'] },
  { words: ['noise cancelling', 'noise canceling', 'anc', 'active noise'], terms: ['noise cancelling', 'noise canceling', 'anc', 'active noise'] },
  { words: ['portable', 'travel friendly'], terms: ['portable'] },
  { words: ['ergonomic'], terms: ['ergonomic'] },
  { words: ['waterproof', 'water resistant', 'water-resistant'], terms: ['waterproof', 'water resistant', 'water-resistant', 'ipx'] },
  { words: ['4k', 'uhd', 'ultra hd'], terms: ['4k', 'uhd', 'ultra hd'] },
  { words: ['1440p', 'qhd', '2k'], terms: ['1440p', 'qhd', '2k'] },
  { words: ['curved'], terms: ['curved'] },
  { words: ['hot-swap', 'hotswap', 'hot swappable'], terms: ['hot-swap', 'hotswap', 'hot swappable'] },
  { words: ['quiet', 'silent'], terms: ['quiet', 'silent'] },
];

const SEARCH_CUES = [
  'find', 'search', 'looking for', 'show me', 'do you have', 'is there', 'need a', 'need an',
  'buy', 'recommend', 'product', 'products', 'looking', 'under', 'over', 'available', 'sell',
  'in stock', 'out of stock', 'low stock', 'best', 'cheap', 'cheapest', 'top', 'popular',
];

async function loadCatalog(): Promise<CatalogItem[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      brand: true,
      variants: { where: { isActive: true }, select: { name: true } },
      _count: { select: { orderItems: true } },
      reviews: { select: { rating: true } },
    },
  });
  return products.map(p => {
    const specs = Object.fromEntries(
      Object.entries((p.specs || {}) as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
    );
    const ratings = p.reviews.map(r => r.rating);
    return {
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      tags: p.tags || [],
      specs,
      description: p.description || '',
      shortDescription: p.shortDescription || '',
      brand: p.brand?.name || null,
      category: p.category?.name || '',
      productType: p.productType || null,
      keyFeatures: p.keyFeatures || [],
      warranty: p.warranty || null,
      compatibility: p.compatibility || [],
      useCases: p.useCases || [],
      colors: p.colors || [],
      dimensions: p.dimensions || null,
      weight: p.weight ?? null,
      variants: p.variants.map(variant => variant.name),
      rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      reviewCount: ratings.length,
      orderCount: p._count.orderItems,
    };
  });
}

function normText(p: CatalogItem): string {
  const specText = Object.values(p.specs).join(' ');
  return `${p.name} ${p.brand || ''} ${p.category} ${p.tags.join(' ')} ${p.description} ${specText}`.toLowerCase().replace(/-/g, ' ');
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function hasWord(msg: string, word: string): boolean {
  return new RegExp(`\\b${esc(word)}\\b`, 'i').test(msg);
}

function normHas(norm: string, term: string): boolean {
  if (/^[a-z0-9 .,%+\-/]*$/.test(term) && term.replace(/[^a-z]/g, '').length >= 3) {
    return hasWord(norm, term);
  }
  return norm.includes(term);
}

function extractTypes(msg: string): { words: string[]; tags: string[]; label: string }[] {
  const m = msg.toLowerCase();
  const out: { words: string[]; tags: string[]; label: string }[] = [];
  const seen = new Set<string>();
  for (const t of PRODUCT_TYPES) {
    if (t.words.some(w => hasWord(m, w)) && !seen.has(t.label)) {
      seen.add(t.label);
      out.push(t);
    }
  }
  return out;
}

function extractType(msg: string): { tags: string[]; label: string } | null {
  return extractTypes(msg)[0] || null;
}

function extractBrand(msg: string, brands: string[]): string | null {
  const m = msg.toLowerCase();
  let best: string | null = null;
  let bestLen = 0;
  for (const b of brands) {
    const bl = b.toLowerCase();
    if (hasWord(m, bl) && bl.length > bestLen) {
      best = b;
      bestLen = bl.length;
    }
  }
  return best;
}

function extractPrice(msg: string): { max?: number; min?: number } {
  const m = msg.toLowerCase();
  const res: { max?: number; min?: number } = {};
  const between = m.match(/(?:between|from)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (between) {
    const lo = parseFloat(between[1]);
    const hi = parseFloat(between[2]);
    res.min = Math.min(lo, hi);
    res.max = Math.max(lo, hi);
    return res;
  }
  const under = m.match(/(?:under|below|less than|cheaper than|no more than|max(?:imum)?(?: budget)? of?|within|at most|budget of?|around)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (under) res.max = parseFloat(under[1]);
  const over = m.match(/(?:over|above|more than|at least|minimum of?|starting at)\s*\$?\s*(\d+(?:\.\d+)?)/);
  if (over) res.min = parseFloat(over[1]);
  if (!under && !over) {
    const bare = m.match(/\$\s*(\d+(?:\.\d+)?)/);
    if (bare && (extractType(m) || /product|budget|price|cost/.test(m))) res.max = parseFloat(bare[1]);
  }
  return res;
}

function extractAvailability(msg: string): 'in' | 'out' | 'low' | null {
  const m = msg.toLowerCase();
  if (/(out of stock|not in stock|unavailable|sold out|out-of-stock)/.test(m)) return 'out';
  if (/(low stock|running low|almost gone|low on stock|only \d+ left)/.test(m)) return 'low';
  if (/(in stock|in-stock|is it available|is this available|is this product available|do you have it|available|have it in stock)/.test(m)) return 'in';
  return null;
}

function extractFeatures(msg: string): string[][] {
  const m = msg.toLowerCase();
  const groups: string[][] = [];
  for (const f of FEATURE_MAP) {
    if (f.words.some(w => m.includes(w))) groups.push(f.terms);
  }
  return groups;
}

function extractSort(msg: string): 'best' | 'cheap' | 'expensive' | 'popular' | null {
  const m = msg.toLowerCase();
  if (/(best selling|best seller|most ordered|most bought|most popular|popular)/.test(m)) return 'popular';
  if (/(top rated|highest rated|top reviewed|best rated|top quality|best|top)/.test(m)) return 'best';
  if (/(cheapest|cheap|budget|affordable|lowest price|least expensive|less expensive)/.test(m)) return 'cheap';
  if (/(expensive|premium|most expensive|high end|highest price|best quality)/.test(m)) return 'expensive';
  return null;
}

function stockLabel(p: CatalogItem): string {
  if (p.stockQty <= 0) return 'Out of Stock';
  if (p.stockQty <= p.lowStockThreshold) return `Low Stock (${p.stockQty} left)`;
  return 'In Stock';
}

function ratingLabel(p: CatalogItem): string {
  return p.reviewCount > 0 ? `★${p.rating.toFixed(1)} (${p.reviewCount} reviews)` : '';
}

const MSG_STOP = new Set([
  'compare', 'comparison', 'versus', 'between', 'and', 'the', 'with', 'these', 'two', 'what',
  'which', 'show', 'me', 'how', 'do', 'they', 'vs', 'a', 'an', 'for', 'is', 'are', 'products',
  'product', 'under', 'over', 'any', 'does', 'have', 'has', 'it', 'this', 'that', 'about',
  'like', 'some', 'can', 'you', 'your', 'want', 'get', 'need', 'tell', 'looking', 'find',
  'search', 'recommend', 'best', 'good', 'great', 'available', 'cheap', 'price', 'please',
  'only', 'instead', 'others', 'other', 'also', 'then', 'maybe', 'perhaps', 'else', 'first',
  'second', 'one', 'anyway', 'would', 'should', 'could', 'where', 'when', 'why', 'there',
  'cheaper', 'expensive', 'worth', 'more', 'less', 'stock', 'low', 'restock', 'inventory',
]);

function extractMsgTerms(msg: string): string[] {
  return msg
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !MSG_STOP.has(t) && !/^\d+$/.test(t));
}

function nameMatchScore(p: CatalogItem, msgTerms: string[], m: string): number {
  const nameWords = new Set(p.name.toLowerCase().split(/\s+/));
  let score = msgTerms.filter(t => nameWords.has(t)).length;
  if (m.includes(p.name.toLowerCase())) score += 2;
  return score;
}

function findNamedProduct(catalog: CatalogItem[], msg: string): CatalogItem | null {
  const m = msg.toLowerCase();
  const terms = extractMsgTerms(msg);
  if (terms.length === 0) return null;
  let best: CatalogItem | null = null;
  let bestScore = 0;
  for (const p of catalog) {
    const score = nameMatchScore(p, terms, m);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 2 ? best : null;
}

function resolveReferent(catalog: CatalogItem[], msg: string, ctx: ConversationContext): CatalogItem | null {
  const named = findNamedProduct(catalog, msg);
  if (named) return named;
  const m = msg.toLowerCase();
  if (!DEICTIC.test(m)) return null;
  const type = extractType(m);
  const candidates = ctx.lastProducts.length ? ctx.lastProducts : ctx.lastProduct ? [ctx.lastProduct] : [];
  if (candidates.length === 0) return null;
  if (type) {
    const typed = candidates.filter(p => type.tags.some(t => p.tags.includes(t) || normText(p).includes(t)));
    if (typed.length) return typed[0];
  }
  return candidates[0];
}

function findCompareCandidates(catalog: CatalogItem[], msg: string, ctx: ConversationContext): CatalogItem[] {
  const m = msg.toLowerCase();
  const terms = extractMsgTerms(msg);
  const scored = catalog
    .map(p => ({ p, score: nameMatchScore(p, terms, m) }))
    .filter(x => x.score >= 1)
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: CatalogItem[] = [];
  for (const x of scored) {
    if (out.length >= 2) break;
    if (!seen.has(x.p.slug)) {
      seen.add(x.p.slug);
      out.push(x.p);
    }
  }
  if (out.length >= 2) return out;
  const contextual = DEICTIC.test(m) || /(which (is|one)|better|cheaper|worth it|difference)/.test(m);
  if (out.length === 1 && contextual) {
    const others = (ctx.lastProducts.length ? ctx.lastProducts : ctx.lastProduct ? [ctx.lastProduct] : [])
      .filter(p => p.slug !== out[0].slug);
    if (others.length) {
      out.push(others[0]);
      return out;
    }
  }
  if (out.length === 0 && contextual && ctx.lastProducts.length >= 2) {
    return ctx.lastProducts.slice(0, 2);
  }
  return out;
}

function buildConstraint(
  types: { tags: string[]; label: string }[],
  brand: string | null,
  price: { max?: number; min?: number },
  availability: 'in' | 'out' | 'low' | null,
  featureGroups: string[][],
  terms: string[],
): string {
  const parts: string[] = [];
  if (types.length) parts.push(types.map(t => t.label).join(' or '));
  if (brand) parts.push(brand);
  if (price.max !== undefined) parts.push(`under ${fmt.format(price.max)}`);
  if (price.min !== undefined) parts.push(`over ${fmt.format(price.min)}`);
  if (availability === 'in') parts.push('in stock');
  if (availability === 'out') parts.push('out of stock');
  if (availability === 'low') parts.push('low on stock');
  if (featureGroups.length) parts.push(`with ${featureGroups.map(g => g[0]).join(', ')}`);
  if (terms.length) parts.push(`matching "${terms.join(' ')}"`);
  return parts.join(', ');
}

function buildFiltersConstraint(
  price: { max?: number; min?: number },
  availability: 'in' | 'out' | 'low' | null,
  featureGroups: string[][],
  terms: string[],
): string {
  return buildConstraint([], null, price, availability, featureGroups, terms);
}

function productLine(p: CatalogItem): string {
  const rating = ratingLabel(p);
  return `${p.name} (${fmt.format(p.price)}, ${p.brand || 'no brand'}${rating ? ', ' + rating : ''}, ${stockLabel(p)})`;
}

async function resolveProductQuestion(catalog: CatalogItem[], msg: string, ctx: ConversationContext): Promise<ChatReply | null> {
  const m = msg.toLowerCase();

  const isFeatureQuestion = /(does|is|has|supports|have|got)\b.*\b(have|has|support|supporting|wireless|wired|mechanical|rgb|bluetooth|backlit|backlight|usb|usb-c|4k|curved|hot-swap|hotswap|tkl|anc|noise|cancelling|waterproof|portable|ergonomic|quiet|gaming)/.test(m);
  const isStockQuestion = /(in stock|out of stock|available|stock status|have (any|it|this)|is it (in|out))/.test(m);
  const isCompareQuestion = /(compare|comparison|vs\.?|versus|difference between|which is better|which one is better|how do .* compare|which (one )?is (cheaper|more expensive|better|best)|more (expensive|affordable|powerful) than)/.test(m);
  const isDeictic = DEICTIC.test(m);

  if (isCompareQuestion) {
    const candidates = findCompareCandidates(catalog, msg, ctx);
    if (candidates.length >= 2) {
      const lines = candidates.map(p => {
        const spec = Object.entries(p.specs).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join(', ');
        return `• ${productLine(p)}${spec ? `\n  ${spec}` : ''}`;
      });
      ctx.lastProducts = candidates;
      ctx.lastProduct = candidates[0];
      const cheaper = /(cheaper|cheapest|less expensive|more affordable)/.test(m);
      const pricier = /(more expensive|most expensive|premium)/.test(m);
      let verdict = '';
      if (cheaper || pricier) {
        const sorted = [...candidates].sort((a, b) => a.price - b.price);
        verdict = pricier
          ? `\n\n${sorted[sorted.length - 1].name} is the more expensive one (${fmt.format(sorted[sorted.length - 1].price)}).`
          : `\n\n${sorted[0].name} is the cheaper one (${fmt.format(sorted[0].price)}).`;
      }
      return {
        reply: `Here's how they compare:\n${lines.join('\n')}${verdict}\n\nTip: use the Compare button on a product page to see them side-by-side.`,
        links: candidates.map(p => ({ label: p.name, slug: p.slug })),
      };
    }
    if (candidates.length === 1) {
      ctx.lastProducts = candidates;
      ctx.lastProduct = candidates[0];
      return {
        reply: `I found one of them: ${productLine(candidates[0])}. Which product would you like to compare it with?`,
        links: candidates.map(p => ({ label: p.name, slug: p.slug })),
      };
    }
    if (isDeictic) {
      return { reply: 'I need more context — tell me which two products to compare, or ask me to show a category first.' };
    }
  }

  if ((isStockQuestion || isFeatureQuestion) && (isDeictic || findNamedProduct(catalog, msg))) {
    const product = resolveReferent(catalog, msg, ctx);
    if (product) {
      ctx.lastProduct = product;
      if (isStockQuestion) {
        return { reply: `${product.name} — ${stockLabel(product)} (${product.stockQty} units in inventory).`, links: [{ label: product.name, slug: product.slug }] };
      }
      const featureGroups = extractFeatures(msg);
      if (featureGroups.length > 0) {
        const evidence = featureGroups
          .map(group => {
            const matched = group.filter(t => normHas(normText(product), t));
            return { wanted: group, matched };
          });
        const allMatched = evidence.every(e => e.matched.length > 0);
        const matchedText = evidence.map(e => e.matched.join(', ')).filter(Boolean).join(', ');
        const wantedText = [...new Set(evidence.flatMap(e => e.wanted))].join(', ');
        return {
          reply: allMatched
            ? `Yes — ${product.name} does have ${wantedText} (${matchedText}).`
            : `No — ${product.name} does not have ${wantedText}. Based on our catalog it has: ${Object.entries(product.specs).slice(0, 5).map(([k, v]) => `${k}: ${v}`).join(', ') || 'no listed specs'}.`,
          links: [{ label: product.name, slug: product.slug }],
        };
      }
    }
    if (isDeictic) {
      const type = extractType(m);
      return { reply: type ? `Which ${type.label} are you asking about? I can check its stock and specs.` : 'Which product are you asking about? I can check its stock and specs.' };
    }
  }

  return null;
}

const FAQ_TOPIC_RE = /(shipping|delivery|arrive|return|refund|exchange|payment|pay|cod|cash|bank transfer|warranty|guarantee|defective|broken|coupon|discount|promo|sale|deal|contact|support|account|register|login|password)/;

async function resolveProductQuery(catalog: CatalogItem[], brands: string[], msg: string, ctx: ConversationContext): Promise<ChatReply | null> {
  const m = msg.toLowerCase();

  const msgTypes = extractTypes(m);
  const msgBrand = extractBrand(m, brands);
  const price = extractPrice(m);
  const availability = extractAvailability(m);
  const featureGroups = extractFeatures(m);
  const sort = extractSort(m);

  const freshCue = /(show me|do you have|find|need|looking|search|is there|buy|recommend|suggest|i want|products|get a|get an|any\b)/.test(m);
  const refinement = /(what about|how about|\band\b|also|what else|anything else|cheaper|more|others|instead|only|maybe)/.test(m);

  let types = msgTypes;
  let brand = msgBrand;

  const hasFilters = price.max !== undefined || price.min !== undefined || availability || featureGroups.length > 0;
  if (!freshCue) {
    if (msgTypes.length === 0 && !msgBrand) {
      if (refinement || hasFilters || DEICTIC.test(m)) {
        types = ctx.lastTypes;
        brand = ctx.lastBrand;
      }
    } else if (msgTypes.length === 0 && msgBrand && refinement) {
      types = ctx.lastTypes;
    } else if (msgTypes.length === 0 && msgBrand && hasFilters && !refinement) {
      types = ctx.lastTypes;
    } else if (msgTypes.length > 0 && !msgBrand && refinement) {
      brand = ctx.lastBrand;
    }
  }

  const typeWords = new Set(msgTypes.flatMap(t => t.words));
  const featureWords = new Set(featureGroups.flat());
  const terms = extractMsgTerms(m)
    .filter(t => t !== (brand ? brand.toLowerCase() : null) && !typeWords.has(t) && !featureWords.has(t));

  const hasHardFilters = types.length > 0 || !!brand || price.max !== undefined || price.min !== undefined || availability || featureGroups.length > 0;
  const hasKeyword = terms.length > 0;
  const hasCue = freshCue || SEARCH_CUES.some(c => m.includes(c));
  if (!hasHardFilters && !hasKeyword && !hasCue) return null;
  if (!hasHardFilters && hasKeyword && FAQ_TOPIC_RE.test(m)) return null;

  const matchType = (p: CatalogItem) => types.length === 0 || types.some(t => t.tags.some(tag => p.tags.includes(tag) || normText(p).includes(tag)));
  const matchBrand = (p: CatalogItem) => !brand || (!!p.brand && p.brand.toLowerCase() === brand.toLowerCase());

  const base = catalog.filter(p => matchType(p) && matchBrand(p));
  let filtered = base.filter(p => {
    if (price.max !== undefined && p.price > price.max) return false;
    if (price.min !== undefined && p.price < price.min) return false;
    if (availability === 'in' && p.stockQty <= 0) return false;
    if (availability === 'out' && p.stockQty > 0) return false;
    if (availability === 'low' && p.stockQty > p.lowStockThreshold) return false;
    if (featureGroups.length > 0 && !featureGroups.every(g => g.some(t => normHas(normText(p), t)))) return false;
    if (terms.length > 0 && !terms.every(t => normHas(normText(p), t))) return false;
    return true;
  });

  const constraint = buildConstraint(types, brand, price, availability, featureGroups, terms);

  if (filtered.length === 0) {
    ctx.lastProducts = [];
    ctx.lastProduct = null;
    if (hasKeyword || hasHardFilters) {
      return { reply: `No matching products found${constraint ? ` for ${constraint}` : ''}. Try different keywords or relax your filters.` };
    }
    return null;
  }

  if (sort === 'popular') filtered = [...filtered].sort((a, b) => b.orderCount - a.orderCount);
  else if (sort === 'cheap') filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sort === 'expensive') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else filtered = [...filtered].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);

  const top = filtered.slice(0, 5);
  const list = top.map(p => productLine(p)).join('\n');
  const label = types.length ? types.map(t => t.label).join(' or ') : brand || 'products';
  const filtersOnly = buildFiltersConstraint(price, availability, featureGroups, terms);
  const prefix = top.length === 1
    ? `Here is your best match${filtersOnly ? ` (${filtersOnly})` : ''}:\n`
    : `Here are the ${sort === 'best' ? 'top-rated ' : ''}${label} I found${filtersOnly ? ` (${filtersOnly})` : ''}:\n`;

  ctx.lastTypes = types.length ? types : ctx.lastTypes;
  ctx.lastBrand = brand ?? ctx.lastBrand;
  ctx.lastProducts = top;
  ctx.lastProduct = top[0];

  return {
    reply: prefix + list,
    links: top.map(p => ({ label: p.name, slug: p.slug })),
    stats: filtered.length > top.length ? [{ label: 'More available', value: String(filtered.length - top.length) }] : undefined,
  };
}

async function searchCatalog(msg: string): Promise<CatalogItem[]> {
  const catalog = await loadCatalog();
  const brands = (await prisma.brand.findMany({ select: { name: true } })).map(b => b.name);
  const types = extractTypes(msg);
  const typeTags = types.length ? types.flatMap(t => t.tags) : null;
  const brand = extractBrand(msg, brands);
  const price = extractPrice(msg);
  const availability = extractAvailability(msg);
  const featureGroups = extractFeatures(msg);
  return catalog
    .filter(p => {
      if (typeTags && !typeTags.some(t => p.tags.includes(t) || normText(p).includes(t))) return false;
      if (brand && (!p.brand || p.brand.toLowerCase() !== brand.toLowerCase())) return false;
      if (price.max !== undefined && p.price > price.max) return false;
      if (price.min !== undefined && p.price < price.min) return false;
      if (availability === 'in' && p.stockQty <= 0) return false;
      if (availability === 'out' && p.stockQty > 0) return false;
      if (featureGroups.length > 0 && !featureGroups.every(g => g.some(t => normHas(normText(p), t)))) return false;
      return true;
    })
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 5);
}

/* ------------------------------------------------------------------ */
/*  Intent resolution                                                  */
/* ------------------------------------------------------------------ */

async function resolveCustomerIntent(message: string, ctx: ConversationContext, user?: AuthPayload): Promise<ChatReply | null> {
  const msg = message.toLowerCase();

  const catalog = await loadCatalog();
  const brands = (await prisma.brand.findMany({ select: { name: true } })).map(b => b.name);

  const catalogReply = resolveCatalogIntent(catalog, message, {
    lastProduct: ctx.lastProduct,
    lastProducts: ctx.lastProducts,
  });
  if (catalogReply) {
    if (catalogReply.lastProduct !== undefined) ctx.lastProduct = catalogReply.lastProduct;
    if (catalogReply.lastProducts !== undefined) ctx.lastProducts = catalogReply.lastProducts;
    const { lastProduct: _lastProduct, lastProducts: _lastProducts, ...reply } = catalogReply;
    return reply;
  }

  const productQuestion = await resolveProductQuestion(catalog, msg, ctx);
  if (productQuestion) return productQuestion;

  const tracking = /(track my order|track order|track my package|track shipment|where is my order|order status|order tracking|how (do|can) i track|my order)/.test(msg);
  if (tracking) {
    return user
      ? {
          reply: 'Go to My Orders and click Track Order on any active order. You will see a live timeline (Placed, Confirmed, Processing, Shipped, Delivered) plus the carrier and tracking number.',
          action: { type: 'link', label: 'My Orders', path: '/orders' },
        }
      : {
          reply: 'You can track orders after signing in. Log in, open My Orders, and click Track Order to see the live timeline and tracking number.',
          action: { type: 'link', label: 'Login to track', path: '/login' },
        };
  }

  const howToOrder = /(how (do|can|to) (i )?order|how to (place|make) an order|how do i buy|place an order|how to buy)/.test(msg);
  if (howToOrder) {
    return {
      reply: 'To order: browse our catalog, add items to your cart, go to Checkout, enter your address, choose Cash on Delivery or Bank Transfer, and confirm. The order appears in My Orders where you can track it.',
    };
  }

  const listing = await resolveProductQuery(catalog, brands, message, ctx);
  if (listing) return listing;

  const faq = findFAQ(message);
  if (faq) return { reply: faq };

  if (hasAny(msg, ['feature', 'what can you do', 'help', 'what makes'])) {
    return { reply: 'CoreConnect is packed with powerful features! Here is what makes us special:', features };
  }

  if (hasAny(msg, ['categories', 'category', 'browse', 'shop by', 'what do you sell'])) {
    const cats = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { name: true, slug: true },
    });
    if (cats.length === 0) return null;
    return {
      reply: `We have ${cats.length} categories: ${cats.map(c => c.name).join(', ')}.`,
      categories: cats.slice(0, 8).map(c => c.slug),
    };
  }

  const recommendWithFilter = hasAny(msg, ['recommend', 'suggestion', 'what should', 'popular']);
  if (recommendWithFilter && !extractType(msg) && !extractBrand(msg, brands)) {
    const res = await resolveProductQuery(catalog, brands, message, ctx);
    if (res) return res;
    return {
      reply: 'Based on popular categories, here are some items you might like:',
      categories: ['keyboards', 'mice', 'headsets', 'monitors'],
    };
  }

  const res = await resolveProductQuery(catalog, brands, message, ctx);
  if (res) return res;

  return null;
}

async function resolveManagementIntent(message: string): Promise<ChatReply | null> {
  const msg = message.toLowerCase();

  if (hasAny(msg, ['revenue', 'how much money', 'total sales', 'kpi', 'earned', 'sales performance', 'performance'])) {
    const revenue = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } },
    });
    const [totalOrders, totalUsers, totalProducts, lowStock] = await Promise.all([
      prisma.order.count({ where: { status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } } }),
      prisma.user.count(),
      prisma.product.count(),
      prisma.product.count({ where: { stockQty: { lte: prisma.product.fields.lowStockThreshold } } }),
    ]);
    return {
      reply: 'Here is how CoreConnect is doing right now:',
      stats: [
        { label: 'Total Revenue', value: fmtCompact.format(Number(revenue._sum.totalAmount || 0)) },
        { label: 'Total Orders', value: String(totalOrders) },
        { label: 'Total Users', value: String(totalUsers) },
        { label: 'Products', value: String(totalProducts) },
        { label: 'Low Stock', value: String(lowStock) },
      ],
    };
  }

  if (hasAny(msg, ['low stock', 'restock', 'inventory', 'stock alert', 'out of stock', 'low on stock'])) {
    const items = await prisma.product.findMany({
      where: { stockQty: { lte: prisma.product.fields.lowStockThreshold } },
      orderBy: { stockQty: 'asc' },
      take: 5,
      select: { name: true, slug: true, stockQty: true },
    });
    const total = await prisma.product.count({ where: { stockQty: { lte: prisma.product.fields.lowStockThreshold } } });
    if (items.length === 0) {
      return { reply: 'Great news: no products are currently low on stock.' };
    }
    const list = items.map(i => `${i.name} (${i.stockQty} left)`).join(', ');
    return {
      reply: `${total} product(s) are low on stock right now. Lowest first: ${list}.`,
      links: items.map(i => ({ label: i.name, slug: i.slug })),
    };
  }

  if (hasAny(msg, ['recent orders', 'latest orders', 'new orders', 'last orders'])) {
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (orders.length === 0) return { reply: 'No orders yet.' };
    const list = orders.map(o => `#${o.orderNumber} - ${o.user?.firstName || ''} ${o.user?.lastName || ''} - ${fmt.format(Number(o.totalAmount))} (${o.status})`).join('; ');
    return { reply: `Here are the 5 most recent orders: ${list}.` };
  }

  if (hasAny(msg, ['top products', 'best seller', 'best selling', 'popular products', 'most ordered'])) {
    const products = await prisma.product.findMany({
      include: { _count: { select: { orderItems: true } } },
      where: { isActive: true },
    });
    const top = products
      .map(p => ({ name: p.name, slug: p.slug, orders: p._count.orderItems }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
    if (top.length === 0) return { reply: 'No products have been ordered yet.' };
    const list = top.map(p => `${p.name} (${p.orders} orders)`).join(', ');
    return {
      reply: `Your best sellers: ${list}.`,
      links: top.map(p => ({ label: p.name, slug: p.slug })),
    };
  }

  if (hasAny(msg, ['how many orders', 'order status', 'statuses', 'pending orders', 'order count', 'manage order', 'fulfil', ' orders'])) {
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const counts = await Promise.all(statuses.map(s => prisma.order.count({ where: { status: s as any } })));
    return {
      reply: 'Here are the current order counts by status:',
      stats: statuses.map((s, i) => ({ label: s, value: String(counts[i]) })),
    };
  }

  if (hasAny(msg, ['how many users', 'total users', 'number of customers', 'user count', 'how many customers'])) {
    const grouped = await prisma.user.groupBy({ by: ['role'], _count: true });
    return {
      reply: 'Current user totals by role:',
      stats: grouped.map(g => ({ label: g.role, value: String(g._count) })),
    };
  }

  if (hasAny(msg, ['total orders', 'number of orders', 'orders placed'])) {
    const total = await prisma.order.count();
    return { reply: `There are ${total} orders in total.` };
  }

  if (hasAny(msg, ['add product', 'add a product', 'create product', 'edit product', 'delete product', 'manage product', 'new product'])) {
    return {
      reply: 'To manage products: go to Products in the sidebar. Use "Add Product" to create one (name, price, stock, category, tags, images). Each row has Edit and Delete buttons. You can also update stock from the Inventory page.',
    };
  }

  if (hasAny(msg, ['manage category', 'add category', 'create category', 'edit category'])) {
    return {
      reply: 'To manage categories: go to Categories in the sidebar. Use "Add Category" for a new one, and Edit/Trash buttons on each card to update or deactivate them.',
    };
  }

  if (hasAny(msg, ['coupon', 'discount code', 'create promo', 'manage coupon', 'promo code'])) {
    const coupons = await prisma.coupon.count();
    return {
      reply: `Coupons are managed under Coupons in the manager sidebar (${coupons} coupon(s) currently). Create a code with a discount type and amount, then customers apply it at checkout.`,
    };
  }

  if (hasAny(msg, ['manage user', 'add employee', 'add manager', 'user role', 'new staff', 'manage staff'])) {
    return {
      reply: 'To manage users: go to Users in the admin sidebar. Each user row has a role dropdown (Customer, Employee, Manager, Admin) - changes apply immediately.',
    };
  }

  if (hasAny(msg, ['upload', 'product image', 'add image', 'picture'])) {
    return {
      reply: 'Images are uploaded through the product form: click the dashed "Add product images" box in Add/Edit Product and select JPG, PNG, WEBP, GIF, or AVIF files (up to 5, max 5MB each).',
    };
  }

  return null;
}

function buildSystemPrompt(role?: UserRole): string {
  const staff = isStaff(role);
  const facts =
    `${storeKnowledge.name} - ${storeKnowledge.tagline}. Standard shipping: ${storeKnowledge.shipping.standard} ` +
    `(free over $${storeKnowledge.shipping.freeThreshold}). Express: ${storeKnowledge.shipping.express}. ` +
    `Payments: ${storeKnowledge.paymentMethods.join(', ')} (COD has a $${storeKnowledge.cod.fee} fee, max $${storeKnowledge.cod.maxAmount}). ` +
    `Returns: ${storeKnowledge.returnPolicy.window}, ${storeKnowledge.returnPolicy.condition}. ` +
    `Warranty: ${storeKnowledge.warranty} Contact: ${storeKnowledge.contact}. ` +
    `Features: ${features.map(f => f.title).join(', ')}.`;

  const persona = staff
    ? `You are Core, the AI assistant for ${storeKnowledge.name} staff (role: ${role}). You help staff manage products, orders, inventory, categories, coupons, and users, and you also answer customer questions. Be concise and practical. Never invent specific store numbers; if staff need live figures, tell them to ask for "KPIs", "low stock", or "recent orders".`
    : `You are Core, a friendly AI shopping assistant for ${storeKnowledge.name}, an online tech store. Help customers find products, compare them, check specs and stock, and explain shipping/returns/payments. You may ONLY talk about products, prices, brands, specs, ratings, and stock status that are explicitly provided to you in the user message's product context. NEVER invent a product, name, price, spec, brand, rating, or stock count. If the product context is empty, say you could not find matching products in the catalog and suggest the customer try different keywords. Never reveal internal store data (revenue, order counts, low stock totals, staff instructions). Keep replies to 2-3 sentences, warm and concise.`;

  return `${persona}\n\nStore facts:\n${facts}\n\nRespond as Core. Do not use markdown headings.`;
}

router.post('/chat', optionalAuth, async (req: Request, res: Response) => {
  const { message, sessionId } = req.body;
  const role = req.user?.role;

  const key = typeof sessionId === 'string' && sessionId
    ? `s:${sessionId}`
    : req.user?.userId
      ? `u:${req.user.userId}`
      : `ip:${req.ip || 'anon'}`;
  const ctx = getContext(key);

  const respond = (reply: ChatReply) => {
    if (reply.reply) ctx.history.push({ role: 'bot', text: reply.reply });
    if (ctx.history.length > 12) ctx.history = ctx.history.slice(-12);
    apiResponse(res, reply);
  };

  if (!message || message.trim() === '') {
    respond(getGreeting(role));
    return;
  }

  const msg = message.trim();

  if (/\b(hi|hello|hey|yo|good morning|good afternoon|good evening|sup|hola|greetings)\b/i.test(msg)) {
    respond(getGreeting(role));
    return;
  }

  ctx.history.push({ role: 'user', text: msg });
  if (ctx.history.length > 12) ctx.history = ctx.history.slice(-12);

  if (isStaff(role)) {
    const staffReply = await resolveManagementIntent(msg);
    if (staffReply) {
      respond(staffReply);
      return;
    }
  }

  const customerReply = await resolveCustomerIntent(msg, ctx, req.user);
  if (customerReply) {
    respond(customerReply);
    return;
  }

  let context: CatalogItem[] = [];
  if (!isStaff(role) && (hasAny(msg.toLowerCase(), SEARCH_CUES) || extractType(msg))) {
    context = await searchCatalog(msg);
  }
  if (!context.length && (DEICTIC.test(msg) || /(what about|how about|\band\b|also|cheaper|more|others|instead)/.test(msg))) {
    context = ctx.lastProducts.slice(0, 5);
  }

  const historyLines = ctx.history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'Core'}: ${h.text}`).join('\n');

  const userPrompt = context.length > 0
    ? `Conversation so far:\n${historyLines}\n\nUser: ${msg}\n\nReal catalog data (use ONLY these products; do not invent others):\n${context.map(p => `- ${p.name} | brand: ${p.brand || 'n/a'} | $${p.price} | stock: ${p.stockQty} | rating: ${p.rating.toFixed(1)}/5 (${p.reviewCount} reviews) | tags: ${p.tags.join(', ')} | specs: ${Object.entries(p.specs).map(([k, v]) => `${k}=${v}`).join('; ')}`).join('\n')}`
    : `Conversation so far:\n${historyLines}\n\nUser: ${msg}\n\nNote: no matching products were found in the catalog. Be honest about this and do not invent products.`;

  const llmReply = await chatWithHF(buildSystemPrompt(role), userPrompt, { provider: 'groq', model: 'mixtral-8x7b-32768', maxTokens: 500, temperature: 0.4 });
  if (llmReply.ok) {
    respond(context.length > 0 ? { reply: llmReply.content, links: context.map(p => ({ label: p.name, slug: p.slug })) } : { reply: llmReply.content });
    return;
  }

  respond({
    reply: `${llmReply.message} I can still answer catalog questions about price, stock, warranty, specifications, filters, counts, comparisons and recommendations.`,
    suggestions: ['Show me gaming products', 'How many keyboards are in stock?', 'Recommendations'],
  });
});

const summaryCache = new Map<string, { summary: string; at: number }>();
const SUMMARY_TTL = 60 * 60 * 1000;

router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const { slug } = req.body;
    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ success: false, message: 'Product slug is required' });
      return;
    }

    const cached = summaryCache.get(slug);
    if (cached && Date.now() - cached.at < SUMMARY_TTL) {
      apiResponse(res, { summary: cached.summary });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: { category: true, brand: true, variants: { where: { isActive: true } } },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const specs = (product.specs || {}) as Record<string, unknown>;
    const topSpecs = Object.entries(specs)
      .slice(0, 6)
      .map(([k, v]) => `${k}: ${v}`);

    const sourceFacts: string[] = [
      `Name: ${product.name}`,
      `Type: ${product.productType || product.category?.name || 'Product'}`,
      `Brand: ${product.brand?.name || 'Generic'}`,
      product.description ? `Description: ${product.description}` : null,
      (product.keyFeatures || []).length ? `Key features: ${product.keyFeatures.join('; ')}` : null,
      topSpecs.length ? `Top specs: ${topSpecs.join('; ')}` : null,
      (product.useCases || []).length ? `Use cases: ${product.useCases.join('; ')}` : null,
      (product.compatibility || []).length ? `Compatibility: ${product.compatibility.join('; ')}` : null,
      (product.variants || []).length ? `Available variants: ${product.variants.map(v => v.name).join(', ')}` : null,
    ].filter(Boolean) as string[];

    const systemPrompt = `You are Core, a friendly and knowledgeable shopping assistant.

Your task: Write a short, natural product overview (2–4 sentences) that helps a shopper quickly understand what the product is, who it's for, and why they might want it.

Guidelines:
- Start by naming the product category or general use case (e.g., "This mechanical keyboard is designed for..." or "Built for gamers, this headset delivers...")
- Connect key features or specs to real-world benefits when the data supports it
- Mentioning a few top specs is fine, but DO NOT list every specification
- Do NOT mention price, stock, SKU, warranty period, weight, dimensions, brand reputation, or review counts
- Do NOT invent information not supported by the facts below
- If the facts are sparse, write a simple, honest overview anyway
- Write in plain, customer-friendly language — not marketing speak
- Do NOT use markdown, bullet points, or numbered lists
- Do NOT repeat the product name more than once`;

    const summaryResult = await chatWithHF(systemPrompt, `Facts about this product:\n${sourceFacts.join('\n')}`, { provider: 'groq', model: 'llama-3.1-8b-instant', maxTokens: 200, temperature: 0.4 });

    if (!summaryResult.ok) {
      apiResponse(res, {
        summary: buildCatalogSummary(product),
        source: 'catalog',
        warning: summaryResult.message,
      });
      return;
    }

    const content = summaryResult.content;

    // Reject clearly hallucinated content: if the response contains warranty/stock/price
    // claims that are absent from the source facts.
    const warrantyInResponse = /\b(\d[\d.]*\s*year)/i.test(content);
    const stockClaim = /\b(in stock|out of stock|only \d+ left|\d+ units? remain)/i.test(content);
    const priceClaim = /\$\d+/i.test(content);
    if ((warrantyInResponse || stockClaim || priceClaim) && !sourceFacts.some(f => /\byear\b/i.test(f) || /\$/.test(f) || /stock/i.test(f))) {
      console.error(`[ai] Rejected potentially hallucinated summary for ${slug}: ${content.slice(0, 80)}`);
      apiResponse(res, {
        summary: buildCatalogSummary(product),
        source: 'catalog',
        warning: 'The AI response could not be verified, so a catalog-grounded summary is shown instead.',
      });
      return;
    }

    summaryCache.set(slug, { summary: content, at: Date.now() });
    apiResponse(res, { summary: content, source: 'ai' });
  } catch (error) {
    console.error('[ai] Product summary failed:', error);
    res.status(500).json({ success: false, message: 'The product summary could not be generated right now. Please try again.' });
  }
});

router.get('/faq', (_req: Request, res: Response) => {
  const faqs = faqDatabase.map(f => ({ question: f.keywords[0], answer: f.answer }));
  apiResponse(res, { faqs });
});

router.get('/recommendations', async (req: Request, res: Response) => {
  const category = (req.query.category as string) || '';
  const related = categoryAssociations[category];

  if (related) {
    apiResponse(res, { related, message: related.msg });
  } else {
    apiResponse(res, {
      related: ['keyboards', 'mice', 'headsets', 'power-banks'],
      message: 'Check out these popular categories:',
    });
  }
});

export default router;
