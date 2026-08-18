import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const iconBtn =
  'shrink-0 flex items-center justify-center w-9 h-9 rounded-btn border border-border dark:border-gray-700 bg-white dark:bg-gray-800 text-text dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-4 mb-6 rounded-card border border-border dark:border-gray-700 bg-bg-card dark:bg-gray-800 px-5 py-4 shadow-card">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          className={iconBtn}
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <Link to="/" className={iconBtn} title="Back to Home Page">
          <Home size={18} />
        </Link>
        <div className="min-w-0">
          {title && (
            <h1 className="font-display text-xl md:text-2xl font-bold text-text dark:text-white leading-tight truncate">
              {title}
            </h1>
          )}
          {subtitle && <p className="text-xs text-text-muted dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}