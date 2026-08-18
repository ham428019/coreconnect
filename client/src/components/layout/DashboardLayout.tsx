import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen pt-16">
      {sidebarOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed top-[4.5rem] left-4 z-40 lg:hidden flex items-center justify-center w-10 h-10 rounded-btn border border-border dark:border-gray-700 bg-bg-card dark:bg-gray-800 text-text dark:text-gray-300 shadow-card"
          title="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <main className="p-6 bg-bg dark:bg-primary lg:ml-64">
        <Outlet />
      </main>
    </div>
  );
}