import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, Moon, Sun, LogOut, Package, MessageCircle } from 'lucide-react';
import { useAuthStore, useCartStore, useUIStore } from '../../stores';
import { api } from '../../lib/api';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { theme, toggleTheme } = useUIStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-bg-card dark:bg-gray-900 text-text dark:text-white sticky top-0 z-50 border-b-2 border-accent">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors" aria-label="Menu">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src="/cc-logo.png" alt="CoreConnect" className="h-20 w-20 object-contain" />
              <span className="font-cursive text-2xl text-primary dark:text-white">CoreConnect</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="hidden sm:flex items-center bg-bg dark:bg-gray-800 rounded-btn border border-border px-3 py-1.5">
              <Search size={16} className="text-text-muted" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-text dark:text-white placeholder:text-text-muted px-2 text-sm w-40 focus:w-56 transition-all"
              />
            </form>

            <button onClick={toggleTheme} className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <>
                <Link to="/wishlist" className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors hidden sm:block">
                  <Heart size={20} />
                </Link>
                <Link to="/cart" className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors relative">
                  <ShoppingCart size={20} />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {itemCount}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors hidden sm:block">
                  <User size={20} />
                </Link>
                <button onClick={handleLogout} className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors hidden sm:block">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-text-muted dark:text-gray-300 hover:text-accent text-sm">Login</Link>
                <Link to="/register" className="btn-primary text-sm !px-4 !py-2">Sign Up</Link>
              </div>
            )}

            {user && ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role) && (
              <Link to={user.role === 'MANAGER' ? '/manager' : user.role === 'EMPLOYEE' ? '/employee' : '/admin'} className="p-2 hover:bg-bg dark:hover:bg-gray-800 rounded-btn transition-colors hidden sm:block" title="Dashboard">
                <Package size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="bg-bg-card dark:bg-gray-900 px-4 py-4 space-y-3 border-t border-border">
          <form onSubmit={handleSearch} className="flex items-center bg-bg dark:bg-gray-800 border border-border rounded-btn px-3 py-2 mb-3">
            <Search size={16} className="text-text-muted" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-text dark:text-white placeholder:text-text-muted px-2 text-sm w-full" />
          </form>
          <Link to="/category/computer-components" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold uppercase tracking-wider hover:text-accent">Components</Link>
          <Link to="/category/peripherals" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold uppercase tracking-wider hover:text-accent">Peripherals</Link>
          <Link to="/category/gaming" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold uppercase tracking-wider hover:text-accent">Gaming</Link>
          <Link to="/category/audio" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold uppercase tracking-wider hover:text-accent">Audio</Link>
          <Link to="/category/mobile-accessories" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold uppercase tracking-wider hover:text-accent">Mobile</Link>
          {!isAuthenticated && (
            <div className="pt-2 border-t border-border space-y-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-sm">Login</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm block text-center">Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}