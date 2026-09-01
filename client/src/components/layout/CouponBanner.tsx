import { useState, useEffect, useRef } from 'react';
import { Tag, X, Copy, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Coupon } from '../../types';

const DISMISS_KEY = 'coupon-banner-dismissed';

function formatOffer(coupon: Coupon): string {
  if (coupon.discountType === 'PERCENTAGE') {
    const cap = coupon.maxDiscount ? ` (up to $${coupon.maxDiscount})` : '';
    return `${coupon.discountValue}% OFF${cap}`;
  }
  if (coupon.discountType === 'FIXED_AMOUNT') {
    return `$${coupon.discountValue} OFF`;
  }
  if (coupon.discountType === 'FREE_SHIPPING') {
    return 'FREE SHIPPING';
  }
  return `${coupon.discountValue}`;
}

export default function CouponBanner() {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data } = useQuery({
    queryKey: ['coupons', 'active'],
    queryFn: () => api.get<{ coupons: Coupon[] }>('/coupons/active'),
    staleTime: 5 * 60 * 1000,
  });

  const coupons: Coupon[] = data?.data?.coupons || [];

  useEffect(() => {
    const saved = localStorage.getItem(DISMISS_KEY);
    if (saved) setDismissed(true);
  }, []);

  useEffect(() => {
    if (coupons.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % coupons.length);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [coupons.length]);

  if (coupons.length === 0 || dismissed) return null;

  const coupon = coupons[index];

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  return (
    <div className="bg-primary dark:bg-gray-800 border-b border-primary/20 relative">
      <div className="max-w-7xl mx-auto px-4 h-8 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Tag size={13} className="text-yellow-300 flex-shrink-0" />
          <span className="font-semibold text-white">{formatOffer(coupon)}</span>
          <span className="text-white/70">·</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 font-mono font-bold text-white hover:text-yellow-300 transition-colors"
            title="Click to copy code"
          >
            {copied ? (
              <span className="text-yellow-300 text-xs font-sans">Copied!</span>
            ) : (
              <>
                <Copy size={11} />
                {coupon.code}
              </>
            )}
          </button>
          {coupon.description && (
            <>
              <span className="text-white/50 hidden sm:inline">·</span>
              <span className="text-white/70 hidden sm:inline text-xs">{coupon.description}</span>
            </>
          )}
        </div>

        {coupons.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 absolute right-20">
            {coupons.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); if (timerRef.current) clearInterval(timerRef.current); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-yellow-300' : 'bg-white/40 hover:bg-white/60'}`}
                aria-label={`Coupon ${i + 1}`}
              />
            ))}
          </div>
        )}

        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
