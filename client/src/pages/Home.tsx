import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Shield, Truck, RotateCcw, Headphones, Zap, Gamepad2, Smartphone, Cpu, Monitor, HardDrive, Camera, Watch, Radio, Plug, Router } from 'lucide-react';
import { api } from '../lib/api';
import { getFallbackProducts, getFallbackCategories } from '../lib/fallbackData';
import ProductCard from '../components/product/ProductCard';
import type { Product, Category } from '../types';

const categoryIconMap: Record<string, any> = {
  'computer-components': Cpu,
  'peripherals': Monitor,
  'mobile-accessories': Smartphone,
  'audio': Radio,
  'storage': HardDrive,
  'networking': Router,
  'security-surveillance': Shield,
  'cameras-photography': Camera,
  'gaming': Gamepad2,
  'smart-home': Plug,
  'laptop-accessories': Monitor,
  'office-electronics': Monitor,
  'cables-adapters': Router,
  'power-solutions': Zap,
  'wearables': Watch,
  'software-digital': Monitor,
  'diy-electronics': Cpu,
  'tools-maintenance': Shield,
};

export default function Home() {
  const { data: featured, isError: featuredErr } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => api.get<{ products: Product[] }>('/products?featured=true&limit=8'),
    retry: false,
  });

  const { data: categories, isError: catErr } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<{ categories: Category[] }>('/categories'),
    retry: false,
  });

  const apiProducts = featured?.data?.products;
  const apiCategories = categories?.data?.categories;
  const featuredProducts = apiProducts?.length ? apiProducts : (featuredErr ? getFallbackProducts().filter(p => p.isFeatured).slice(0, 8) : []);
  const allCategories = apiCategories?.length ? apiCategories : (catErr ? getFallbackCategories() : []);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-primary text-white">
        <img
          src="/images/coreconnect-hero.webp"
          alt="Premium computer hardware setup with a desktop PC, monitor, keyboard, mouse, graphics card and headphones"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[66%_center] sm:object-[62%_center] lg:object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#071727] via-[#0c2138]/95 to-[#102a43]/25 sm:via-[#0c2138]/88 lg:via-[#0c2138]/72" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/95 via-transparent to-primary/25" />

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:pt-20 md:pb-10 md:pt-24 lg:pt-28">
          <div className="max-w-xl lg:max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-sm">
              <Zap size={14} className="text-blue-300" /> Hardware. Peripherals. More.
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Power your next
              <span className="block text-blue-300">great setup.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
              Discover trusted components, gaming gear and everyday technology with clear specifications, honest stock information and secure checkout.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/category/computer-components" className="btn-primary w-full shadow-lg shadow-blue-950/20 sm:w-auto">
                Shop Components <ArrowRight size={17} />
              </Link>
              <Link to="/category/gaming" className="btn-outline w-full border-white/35 bg-white/5 text-white backdrop-blur-sm hover:border-white hover:bg-white hover:text-primary sm:w-auto">
                Explore Gaming
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-2.5 sm:gap-3 md:mt-16 md:grid-cols-4 lg:max-w-5xl">
            {[
              { icon: Truck, label: 'Free Shipping over $75' },
              { icon: Shield, label: 'Secure Checkout' },
              { icon: RotateCcw, label: '14-Day Returns' },
              { icon: Headphones, label: 'Helpful Support' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-950/30 p-3 backdrop-blur-md sm:gap-3 sm:p-4">
                <item.icon size={19} className="shrink-0 text-blue-300" />
                <span className="text-xs font-medium text-slate-100 sm:text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Shop by Category</h2>
          <div className="ornament mx-auto my-3">✦</div>
          <p className="text-text-muted">Browse our {allCategories.length} categories of tech products</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {allCategories.map((cat) => {
            const Icon = categoryIconMap[cat.slug] || Zap;
            const count = cat._count?.products ?? 0;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="card text-center hover:border-accent hover:shadow-md transition-all group"
              >
                <Icon size={28} className="mx-auto mb-3 text-accent group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm leading-tight">{cat.name}</h3>
                <p className="text-xs text-text-muted mt-1">{count} products</p>
              </Link>
            );
          })}
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="bg-bg-card dark:bg-gray-900 py-12 border-y border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">Featured Products</h2>
                <div className="ornament justify-start my-3">✦</div>
                <p className="text-text-muted text-sm">Handpicked tech essentials</p>
              </div>
              <Link to="/category/computer-components" className="btn-outline text-sm">
                View All <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="bg-primary rounded-hero p-10 md:p-16 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, #6FA4D1 0, transparent 45%), radial-gradient(circle at 70% 60%, #3B6F9F 0, transparent 45%)',
          }} />
          <div className="relative">
            <div className="ornament mx-auto mb-4 text-accent">✦</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to Upgrade Your Tech?</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto italic">
              Join thousands of satisfied customers. Create an account to start shopping with exclusive deals and fast checkout.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/register" className="btn-primary !bg-accent hover:!bg-accent-hover">Create Account</Link>
              <Link to="/category/mobile-accessories" className="btn-outline border-white/30 text-white hover:bg-white hover:text-primary">Browse Products</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
