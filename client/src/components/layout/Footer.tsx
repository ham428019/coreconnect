import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-primary text-white mt-auto border-t-4 border-accent">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2">
            <img src="/cc-logo.png" alt="CoreConnect" className="h-12 w-12 object-contain" />
            <h3 className="font-cursive text-3xl text-accent">CoreConnect</h3>
          </div>
          <div className="ornament mx-auto my-3 text-accent">✦</div>
          <p className="text-sm text-white/60">Your Core Destination for Tech Accessories. Quality products at great prices.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Support</h4>
            <div className="space-y-2 text-sm text-white/60">
              <p>support@coreconnect.store</p>
              <p>Mon-Fri 9AM-6PM EST</p>
              <p>Free shipping over $75</p>
              <p>14-day returns</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Payment Methods</h4>
            <div className="space-y-2 text-sm text-white/60">
              <p>Cash on Delivery</p>
              <p>Bank Transfer</p>
              <p>Secure Transactions</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 uppercase tracking-wider">Visit Us</h4>
            <div className="space-y-2 text-sm text-white/60">
              <p>123 Tech Avenue</p>
              <p>New York, NY 10001</p>
              <p>Crafted with care</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} CoreConnect. All rights reserved.
        </div>
      </div>
    </footer>
  );
}