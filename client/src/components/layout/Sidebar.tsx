import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, Tags, BarChart3, Home, Truck, Ticket } from 'lucide-react';
import { useAuthStore } from '../../stores';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/categories', icon: Tags, label: 'Categories' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

const managerLinks = [
  { to: '/manager', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/manager/products', icon: Package, label: 'Products' },
  { to: '/manager/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/manager/inventory', icon: Truck, label: 'Inventory' },
  { to: '/manager/categories', icon: Tags, label: 'Categories' },
  { to: '/manager/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/manager/analytics', icon: BarChart3, label: 'Analytics' },
];

const employeeLinks = [
  { to: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employee/products', icon: Package, label: 'Products' },
  { to: '/employee/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/employee/inventory', icon: Truck, label: 'Inventory' },
];

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const isManager = user?.role === 'MANAGER';
  const isEmployee = user?.role === 'EMPLOYEE';
  const links = isManager ? managerLinks : isEmployee ? employeeLinks : adminLinks;

  return (
    <aside
      className={`w-64 bg-primary min-h-screen text-white flex flex-col fixed left-0 top-16 bottom-0 z-40 overflow-y-auto transition-transform duration-300 ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-colors ${
                active ? 'bg-accent text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <Link to="/" className="flex items-center justify-center gap-2 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-btn px-4 py-2.5 transition-colors" title="Back to Home Page">
          <Home size={16} /> Back to Home Page
        </Link>
      </div>
    </aside>
  );
}
