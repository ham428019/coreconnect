import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CreditCard, Building2, Wallet, ChevronRight, ChevronLeft, ShieldCheck } from 'lucide-react';
import { api, formatCurrency } from '../lib/api';
import type { CartItem, Address } from '../types';

const addressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zipCode: z.string().min(1),
});

const CARD_ID = 'CARD';
const CARD_BRANDS = ['VISA', 'MASTERCARD', 'UNIONPAY'];

function detectCardBrand(num: string): string {
  const clean = num.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'VISA';
  if (/^5[1-5]/.test(clean)) return 'MASTERCARD';
  if (/^62/.test(clean)) return 'UNIONPAY';
  return '';
}

function CardBrandMark({ brand }: { brand: string }) {
  if (brand === 'VISA') {
    return <span className="inline-flex items-center justify-center h-8 px-2 rounded bg-[#1A1F71] text-white font-bold italic text-sm tracking-tight">VISA</span>;
  }
  if (brand === 'MASTERCARD') {
    return (
      <span className="inline-flex items-center justify-center h-8 w-10 rounded bg-white border border-border">
        <span className="relative flex">
          <span className="w-4 h-4 rounded-full bg-[#EB001B] opacity-90" />
          <span className="w-4 h-4 rounded-full bg-[#F79E1B] opacity-90 -ml-1.5" />
        </span>
      </span>
    );
  }
  if (brand === 'UNIONPAY') {
    return (
      <span className="inline-flex flex-col items-center justify-center h-8 px-2 rounded bg-white border border-border overflow-hidden gap-[3px]">
        <span className="block w-7 h-[4px] rounded-full bg-[#E21836]" />
        <span className="block w-7 h-[4px] rounded-full bg-[#00447C]" />
        <span className="block w-7 h-[4px] rounded-full bg-[#007B84]" />
      </span>
    );
  }
  return <CreditCard size={24} className="text-text-muted" />;
}

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
  });

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<{ items: CartItem[]; summary: any }>('/cart'),
  });

  const { data: addrData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: Address[] }>('/users/me/addresses'),
  });

  const placeOrder = useMutation({
    mutationFn: (data: { addressId: string; paymentMethod: string; couponCode?: string }) =>
      api.post('/orders', data),
    onSuccess: (res: any) => { navigate(`/order-success/${res.data.order.id}`); },
    onError: (err: Error) => toast.error(err.message),
  });

  const validateCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await api.get<{ coupon: any }>(`/coupons/validate?code=${couponCode}`);
      setDiscount(Number(res.data.coupon.discountValue) || 0);
      toast.success('Coupon applied!');
    } catch {
      toast.error('Invalid coupon');
    }
  };

  const items = cartData?.data?.items || [];
  const summary = cartData?.data?.summary || { subtotal: 0, itemCount: 0 };
  const addresses = addrData?.data?.addresses || [];
  const shipping = paymentMethod === 'COD' ? 5 : 0;
  const tax = summary.subtotal * 0.08;
  const total = summary.subtotal + shipping + tax - discount;
  const isCard = paymentMethod === CARD_ID;
  const detectedBrand = isCard ? detectCardBrand(cardNumber) : '';

  const formatCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const validateCard = (): boolean => {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 15) { toast.error('Please enter a valid card number'); return false; }
    if (!cardName.trim()) { toast.error('Please enter the name on the card'); return false; }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) { toast.error('Please enter a valid expiry (MM/YY)'); return false; }
    if (!/^\d{3,4}$/.test(cardCvv)) { toast.error('Please enter a valid CVV'); return false; }
    return true;
  };

  const onSubmit = async (formData: any) => {
    let addressId = formData.addressId;
    if (!addressId && addresses.length > 0) addressId = addresses[0].id;
    if (!addressId) {
      toast.error('Please add a shipping address');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (isCard && !validateCard()) return;
    placeOrder.mutate({ addressId, paymentMethod, couponCode: couponCode || undefined });
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Checkout</h1>

      <div className="flex items-center gap-2 mb-8 text-sm">
        {['Shipping', 'Review', 'Confirmation'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
              step >= i + 1 ? 'bg-accent text-white' : 'bg-gray-200 text-text-muted'
            }`}>{i + 1}</div>
            <span className={step >= i + 1 ? 'text-text font-medium' : 'text-text-muted'}>{s}</span>
            {i < 2 && <ChevronRight size={14} className="text-text-muted" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="font-semibold text-lg mb-4">Shipping Address</h2>
          {addresses.map((addr) => (
            <label key={addr.id} className="card flex gap-3 mb-3 cursor-pointer hover:border-accent transition-colors">
              <input type="radio" {...register('addressId')} value={addr.id} className="mt-1" />
              <div>
                <p className="font-semibold">{addr.label}</p>
                <p className="text-sm text-text-muted">{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</p>
              </div>
            </label>
          ))}
          <div className="card mb-4">
            <h3 className="font-semibold text-sm mb-3">New Address</h3>
            <div className="space-y-3">
              <input {...register('label')} placeholder="Label (e.g. Home)" className="input !py-2 text-sm" />
              <input {...register('street')} placeholder="Street Address" className="input !py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input {...register('city')} placeholder="City" className="input !py-2 text-sm" />
                <input {...register('state')} placeholder="State" className="input !py-2 text-sm" />
              </div>
              <input {...register('zipCode')} placeholder="ZIP Code" className="input !py-2 text-sm" />
            </div>
          </div>
          <button onClick={() => setStep(2)} className="btn-primary">
            Continue <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-semibold text-lg mb-4">Payment Method</h2>
            <div className="space-y-3">
              {[
                { id: CARD_ID, icon: CreditCard, name: 'Credit / Debit Card', desc: 'Pay by card', fee: 'No additional fee', marks: true },
                { id: 'COD', icon: Wallet, name: 'Cash on Delivery', desc: 'Pay when your order arrives', fee: '$5.00 fee' },
                { id: 'BANK_TRANSFER', icon: Building2, name: 'Bank Transfer', desc: 'Transfer to our bank account', fee: 'No additional fee' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`card w-full text-left flex items-center gap-4 ${
                    paymentMethod === method.id ? 'border-accent ring-2 ring-accent/20' : ''
                  }`}
                >
                  {method.marks ? (
                    <span className="flex items-center gap-1.5">
                      {CARD_BRANDS.map((b) => <CardBrandMark key={b} brand={b} />)}
                    </span>
                  ) : (
                    <method.icon size={24} className={paymentMethod === method.id ? 'text-accent' : 'text-text-muted'} />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{method.name}</p>
                    <p className="text-sm text-text-muted">{method.marks ? 'Visa, Mastercard, UnionPay' : method.desc}</p>
                  </div>
                  <span className="text-xs text-text-muted">{method.fee}</span>
                </button>
              ))}
            </div>

            {isCard && (
              <div className="card mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-success" />
                  <p className="text-xs text-text-muted">Simulated payment — no real card is charged.</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <CreditCard size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="Card number (e.g. 4242 4242 4242 4242)"
                      inputMode="numeric"
                      className="input !pl-10 font-mono text-sm"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {detectedBrand ? <CardBrandMark brand={detectedBrand} /> : null}
                    </span>
                  </div>
                  <input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Name on card"
                    className="input text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="Expiry (MM/YY)"
                      inputMode="numeric"
                      className="input text-sm font-mono"
                    />
                    <input
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="CVV"
                      type="password"
                      inputMode="numeric"
                      className="input text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Coupon Code</h3>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code"
                  className="input !py-2 text-sm flex-1"
                />
                <button onClick={validateCoupon} className="btn-outline !px-4 !py-2 text-sm">Apply</button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <span className="font-medium flex-1">{item.product.name}</span>
                  <span className="text-text-muted">x{item.quantity}</span>
                  <span>{formatCurrency(Number(item.product.price) * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(1)} className="btn-ghost"><ChevronLeft size={18} /> Back</button>
              <button onClick={handleSubmit(onSubmit)} disabled={placeOrder.isPending} className="btn-primary">
                {placeOrder.isPending ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>

          <div className="card h-fit">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>{shipping > 0 ? formatCurrency(shipping) : 'Free'}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Tax (8%)</span><span>{formatCurrency(tax)}</span></div>
              {discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}