import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Shield, Truck, RotateCcw, Headphones, Zap, Gamepad2, Smartphone, Cpu, Monitor, Wifi, HardDrive, Camera, Watch, Radio, Plug, Keyboard, Mouse, Router } from 'lucide-react';
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
      <section className="bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #A67C3D 0, transparent 40%), radial-gradient(circle at 80% 70%, #A67C3D 0, transparent 40%)',
        }} />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative">
          <div className="max-w-2xl">
            <div className="ornament justify-start mb-4 text-accent">
              <span className="text-sm uppercase tracking-[0.3em] text-accent">Est. 1987</span>
            </div>
            <h1 className="font-mono text-4xl md:text-6xl font-bold leading-tight mb-4">
              Your Core Destination<br className="hidden md:block" />{' '}
              <span className="text-accent italic whitespace-nowrap">for Tech</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 font-serif italic">
              Premium tech accessories and components. From gaming gear to mobile essentials — everything you need, delivered to your door.
            </p>
            <div className="flex gap-3">
              <Link to="/category/peripherals" className="btn-primary">Shop Now</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            {[
              { icon: Truck, label: 'Free Shipping over $75' },
              { icon: Shield, label: 'Secure Checkout' },
              { icon: RotateCcw, label: '14-Day Returns' },
              { icon: Headphones, label: '24/7 Support' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                <item.icon size={20} className="text-accent flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
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
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 30% 40%, #A67C3D 0, transparent 45%), radial-gradient(circle at 70% 60%, #A67C3D 0, transparent 45%)',
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