import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Facebook, Instagram, Twitter, Youtube, Mail, MapPin, Phone, CreditCard, Send } from 'lucide-react';

const socials = [
  { icon: Facebook, label: 'Facebook' },
  { icon: Instagram, label: 'Instagram' },
  { icon: Twitter, label: 'Twitter' },
  { icon: Youtube, label: 'YouTube' },
];

export default function Footer() {
  const [email, setEmail] = useState('');

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Subscribed! Stay tuned for deals.');
    setEmail('');
  };

  return (
    <footer className="bg-primary text-white mt-auto border-t-4 border-accent">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2">
            <img src="/cc-logo.png" alt="CoreConnect" className="h-12 w-12 object-contain" />
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-blue-200">CoreConnect</h3>
          </div>
          <div className="ornament mx-auto my-3 text-accent">✦</div>
          <p className="text-sm text-white/60">Your Core Destination for Tech Accessories. Quality products at great prices.</p>
        </div>

        <div className="max-w-xl mx-auto mb-12">
          <h4 className="font-semibold text-center mb-1">Join our newsletter</h4>
          <p className="text-sm text-white/60 text-center mb-4">Get exclusive deals and early access to new arrivals.</p>
          <form onSubmit={subscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 bg-white/10 border border-white/20 rounded-btn px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent"
            />
            <button type="submit" className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Send size={16} /> Subscribe
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <h4 className="font-semibold mb-3 uppercase tracking-wider">About CoreConnect</h4>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              We're a small team obsessed with genuine tech accessories — tested specs, honest prices, and
              every order tracked from our warehouse to your door.
            </p>
            <div className="flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href="#" onClick={(e) => e.preventDefault()} title={s.label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-accent hover:text-white flex items-center justify-center transition-colors">
                  <s.icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Shop</h4>
            <div className="space-y-2 text-sm text-white/60">
              <Link to="/category/computer-components" className="block hover:text-accent transition-colors">Computer Components</Link>
              <Link to="/category/peripherals" className="block hover:text-accent transition-colors">Peripherals</Link>
              <Link to="/category/gaming" className="block hover:text-accent transition-colors">Gaming</Link>
              <Link to="/category/audio" className="block hover:text-accent transition-colors">Audio</Link>
              <Link to="/category/mobile-accessories" className="block hover:text-accent transition-colors">Mobile Accessories</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Company</h4>
            <div className="space-y-2 text-sm text-white/60">
              <Link to="/about" className="block hover:text-accent transition-colors">About Us</Link>
              <Link to="/" className="block hover:text-accent transition-colors">Home</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Support</h4>
            <div className="space-y-2 text-sm text-white/60">
              <a href="mailto:support@coreconnect.store" className="flex items-center gap-2 hover:text-accent transition-colors">
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><Mail size={14} /></span>
                <span className="truncate">support@coreconnect.store</span>
              </a>
              <p className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><Phone size={14} /></span>
                Mon-Fri 9AM-6PM EST
              </p>
              <p className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"><MapPin size={14} /></span>
                123 Tech Avenue, NY 10001
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Payment Methods</h4>
            <div className="space-y-2 text-sm text-white/60">
              <p className="flex items-center gap-2"><CreditCard size={14} /> Cash on Delivery</p>
              <p className="flex items-center gap-2"><CreditCard size={14} /> Bank Transfer</p>
              <p className="flex items-center gap-2"><CreditCard size={14} /> Secure Transactions</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/40">
          <p>&copy; {new Date().getFullYear()} CoreConnect. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-accent transition-colors">Terms of Service</a>
            <Link to="/about" className="hover:text-accent transition-colors">About Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
