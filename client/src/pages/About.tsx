import { Link } from 'react-router-dom';
import { Shield, Truck, RotateCcw, Package, Users, Award, Cpu, ArrowRight } from 'lucide-react';

const stats = [
  { icon: Package, value: '125+', label: 'Products' },
  { icon: Users, value: '54+', label: 'Happy Customers' },
  { icon: Award, value: '900+', label: 'Orders Delivered' },
  { icon: Shield, value: '100%', label: 'Secure Checkout' },
];

const values = [
  { icon: Cpu, title: 'Genuine Tech', text: 'Every product is sourced from official distributors and covered by the full manufacturer warranty.' },
  { icon: Truck, title: 'Fast Delivery', text: 'Free shipping on orders over $75, with real-time tracking from our warehouse to your door.' },
  { icon: RotateCcw, title: '14-Day Returns', text: 'Changed your mind? Return any unopened product within 14 days for a full refund.' },
  { icon: Shield, title: 'Safe Payments', text: 'Pay your way — cash on delivery, bank transfer, or secure online transactions.' },
];

export default function About() {
  return (
    <div>
      <section className="text-center py-12">
        <div className="ornament mx-auto my-4 text-accent">✦</div>
        <h1 className="font-display text-4xl font-bold mb-4">About CoreConnect</h1>
        <p className="text-text-muted max-w-2xl mx-auto text-lg">
          Your core destination for tech accessories — quality products, honest prices, and support that actually supports you.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <s.icon size={24} className="mx-auto text-accent mb-2" />
            <p className="font-display text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-text-muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="card p-8 mb-10">
        <h2 className="font-display text-2xl font-bold mb-4">Our Story</h2>
        <div className="space-y-4 text-text-muted leading-relaxed">
          <p>
            CoreConnect started with a simple frustration: buying tech accessories online meant gambling on
            knockoffs, vague specs, and shipping that took weeks. We believed shopping for your setup should feel
            as good as using it.
          </p>
          <p>
            Today we stock everything from mechanical keyboards and high-performance GPUs to wireless audio and
            everyday mobile accessories — every item tested, every spec verified, and every order tracked from
            our warehouse to your door.
          </p>
          <p>
            We're not a faceless marketplace. We're a small team that reads every review, answers every question,
            and treats your setup like our own.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-6 text-center">Why Shop With Us</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {values.map((v) => (
            <div key={v.title} className="card">
              <v.icon size={24} className="text-accent mb-3" />
              <h3 className="font-semibold mb-1">{v.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-8">
        <h2 className="font-display text-2xl font-bold mb-3">Ready to build your setup?</h2>
        <p className="text-text-muted mb-6">Browse our catalog and find your next favorite piece of tech.</p>
        <Link to="/" className="btn-primary"><Package size={18} /> Start Shopping <ArrowRight size={18} /></Link>
      </section>
    </div>
  );
}