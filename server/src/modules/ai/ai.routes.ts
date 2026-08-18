import { Router, Request, Response } from 'express';
import { apiResponse } from '../../utils/helpers';

const router = Router();

const storeKnowledge = {
  name: 'CoreConnect',
  tagline: 'Your Core Destination for Tech',
  categories: 18,
  subcategories: 100,
  brands: 30,
  paymentMethods: ['Cash on Delivery', 'Bank Transfer'],
  shipping: {
    standard: '3-5 business days',
    express: '1-2 business days (where available)',
    freeThreshold: 75,
  },
  returnPolicy: {
    window: '14 days',
    condition: 'Unopened and in original packaging',
  },
  warranty: 'Manufacturer warranty applies. CoreConnect provides purchase verification.',
};

const faqDatabase = [
  { keywords: ['shipping', 'delivery', 'how long', 'when arrive'], answer: 'Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available in select areas. Orders over $75 qualify for free standard shipping!' },
  { keywords: ['return', 'refund', 'exchange', 'money back'], answer: 'You can return items within 14 days of delivery. Products must be unopened and in original packaging. Contact our support team to initiate a return.' },
  { keywords: ['payment', 'pay', 'cod', 'cash', 'bank transfer'], answer: 'We accept Cash on Delivery (COD) and Bank Transfer. COD has a $5 fee and is available for orders under $500. Bank transfers are free but require manual verification.' },
  { keywords: ['warranty', 'guarantee', 'defective', 'broken'], answer: 'All products come with manufacturer warranty. CoreConnect provides purchase verification for warranty claims. Contact us within 14 days if you receive a defective item.' },
  { keywords: ['track', 'where', 'status', 'order location'], answer: 'Go to My Orders and click Track Shipment on any active order. You will see a live timeline from confirmation to delivery.' },
  { keywords: ['discount', 'coupon', 'promo', 'sale', 'deal'], answer: 'Check our homepage for current promotions! You can also apply coupon codes at checkout. Sign up for our newsletter to get exclusive deals.' },
  { keywords: ['contact', 'support', 'help', 'email'], answer: 'Reach us at support@coreconnect.store. Our team responds within 24 hours, Monday through Friday, 9AM-6PM EST.' },
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

function findFAQ(message: string): string | null {
  const lower = message.toLowerCase();
  for (const faq of faqDatabase) {
    if (faq.keywords.some(k => lower.includes(k))) {
      return faq.answer;
    }
  }
  return null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${timeOfDay}! I'm Core, your AI shopping assistant. I can help you find products, explain features, or track your orders. What would you like to do?`;
}

router.post('/chat', (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || message.trim() === '') {
    apiResponse(res, {
      reply: getGreeting(),
      suggestions: ['Website Features', 'Recommendations', 'How to Order', 'Track Order'],
    });
    return;
  }

  const faqAnswer = findFAQ(message);
  if (faqAnswer) {
    apiResponse(res, { reply: faqAnswer });
    return;
  }

  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('recommend') || lowerMsg.includes('suggestion') || lowerMsg.includes('what should')) {
    apiResponse(res, {
      reply: 'Based on popular categories, here are some items you might like:',
      recommendations: true,
      categories: ['keyboards', 'mice', 'headsets', 'monitors'],
    });
    return;
  }

  if (lowerMsg.includes('feature') || lowerMsg.includes('what can you do') || lowerMsg.includes('help')) {
    apiResponse(res, {
      reply: 'CoreConnect is packed with powerful features! Here is what makes us special:',
      features: [
        { title: 'Smart Search', description: 'Find products instantly with our intelligent search' },
        { title: 'Secure Checkout', description: 'Multiple payment options with secure processing' },
        { title: 'Order Tracking', description: 'Real-time updates from purchase to delivery' },
        { title: 'AI Assistant', description: 'Get help finding the right products for your needs' },
        { title: 'COD & Bank Transfer', description: 'Flexible payment methods for everyone' },
        { title: 'Order History', description: 'Track all your orders in one place' },
      ],
    });
    return;
  }

  if (lowerMsg.includes('order') || lowerMsg.includes('track')) {
    apiResponse(res, {
      reply: 'To track your order, visit My Orders from your account menu. You will see a detailed timeline for each order.',
      action: { type: 'navigate', label: 'Go to Orders', path: '/orders' },
    });
    return;
  }

  apiResponse(res, {
    reply: 'I\'m not sure about that, but I can help with products, orders, shipping, returns, and more. Try asking me about those topics!',
    suggestions: ['Shipping Info', 'Return Policy', 'Payment Methods', 'Contact Support'],
  });
});

router.get('/faq', (_req: Request, res: Response) => {
  const faqs = faqDatabase.map(f => ({
    question: f.keywords[0],
    answer: f.answer,
  }));
  apiResponse(res, { faqs });
});

router.get('/recommendations', (req: Request, res: Response) => {
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
