interface DashboardTitleBarProps {
  title: string;
}

export default function DashboardTitleBar({ title }: DashboardTitleBarProps) {
  return (
    <div className="-mx-6 -mt-6 mb-6 bg-bg-card dark:bg-gray-900 border-b border-border dark:border-gray-700 px-6 py-3.5 shadow-card">
      <h1 className="font-display text-lg md:text-xl font-bold text-text dark:text-white tracking-wide truncate">
        {title}
      </h1>
    </div>
  );
}