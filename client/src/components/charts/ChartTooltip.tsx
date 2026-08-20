import { formatCurrency } from '../../lib/api';

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  currency?: boolean;
}

export default function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-xs">
      {label != null && <p className="font-medium text-text-muted mb-1">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="font-semibold text-text dark:text-white">
          {currency ? formatCurrency(Number(entry.value)) : String(entry.value)}
        </p>
      ))}
    </div>
  );
}
