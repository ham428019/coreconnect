import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Building2, Wallet, ChevronRight, ChevronLeft, ShieldCheck, MapPin, Package, Truck, RotateCcw } from 'lucide-react';
import { api, formatCurrency } from '../lib/api';
import type { CartItem, Address } from '../types';

const CARD_ID = 'CARD';
const CARD_BRANDS = ['VISA', 'MASTERCARD', 'UNIONPAY'];
const SHIPPING_METHODS = [
  { id: 'STANDARD', name: 'Standard Shipping', desc: '5-7 business days', price: 0 },
  { id: 'EXPRESS', name: 'Express Shipping', desc: '2-3 business days', price: 5 },
];
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

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

interface ShippingFormData {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  label: string;
}

export default function Checkout() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [sameBillingAsShipping, setSameBillingAsShipping] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveAddress, setSaveAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showCoupon, setShowCoupon] = useState(false);

  const [shippingForm, setShippingForm] = useState<ShippingFormData>({
    firstName: '', lastName: '', street: '', city: '', state: '', zipCode: '', country: 'US', phone: '', label: 'Home',
  });

  const [billingForm, setBillingForm] = useState<ShippingFormData>({
    firstName: '', lastName: '', street: '', city: '', state: '', zipCode: '', country: 'US', phone: '', label: 'Billing',
  });

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get<{ items: CartItem[]; summary: any }>('/cart'),
  });

  const { data: addrData, refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ addresses: Address[] }>('/users/me/addresses'),
  });

  useEffect(() => {
    if (!sameBillingAsShipping) {
      setBillingForm({ ...shippingForm, label: 'Billing' });
    }
  }, [sameBillingAsShipping]);

  useEffect(() => {
    if (!sameBillingAsShipping) {
      setBillingForm((prev) => ({ ...prev, ...shippingForm, label: 'Billing' }));
    }
  }, [shippingForm.firstName, shippingForm.lastName, shippingForm.street, shippingForm.city, shippingForm.state, shippingForm.zipCode, shippingForm.country, shippingForm.phone]);

  const placeOrder = useMutation({
    mutationFn: (data: any) => api.post('/orders', data),
    onSuccess: (res: any) => { navigate(`/order-success/${res.data.order.id}`); },
    onError: (err: Error) => toast.error(err.message),
  });

  const createAddress = useMutation({
    mutationFn: (data: any) => api.post('/users/me/addresses', data),
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

  const selectedShippingAddr = addresses.find((a) => a.id === selectedAddressId);

  const shippingCost = SHIPPING_METHODS.find((m) => m.id === shippingMethod)?.price || 0;
  const codFee = paymentMethod === 'COD' ? 5 : 0;
  const tax = summary.subtotal * 0.08;
  const total = summary.subtotal + shippingCost + codFee + tax - discount;
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

  const validateShippingForm = (): boolean => {
    const f = shippingForm;
    if (!f.firstName.trim() || !f.lastName.trim() || !f.street.trim() || !f.city.trim() || !f.state.trim() || !f.phone.trim()) {
      toast.error('Please fill in all required fields');
      return false;
    }
    return true;
  };

  const handleContinueToReview = async () => {
    if (!selectedAddressId) {
      if (!validateShippingForm()) return;
      if (saveAddress) {
        try {
          const res: any = await createAddress.mutateAsync({ ...shippingForm, isDefault: addresses.length === 0 });
          const newId = res.data?.address?.id;
          if (newId) {
            setSelectedAddressId(newId);
            await refetchAddresses();
          }
        } catch {
          toast.error('Could not save address. Continuing without saving.');
        }
      }
      setStep(2);
      return;
    }
    setStep(2);
  };

  const handlePlaceOrder = () => {
    if (!selectedAddressId) {
      toast.error('Please select or enter a shipping address');
      return;
    }
    if (!shippingMethod) {
      toast.error('Please select a shipping method');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (isCard && !validateCard()) return;
    placeOrder.mutate({
      addressId: selectedAddressId,
      paymentMethod,
      couponCode: couponCode || undefined,
      firstName: shippingForm.firstName,
      lastName: shippingForm.lastName,
      phone: shippingForm.phone,
    });
  };

  const setEditSection = (section: 'address' | 'shipping' | 'payment' | 'coupon') => {
    if (section === 'address') setStep(1);
  };

  const getShippingMethodName = () => SHIPPING_METHODS.find((m) => m.id === shippingMethod)?.name || 'Standard Shipping';

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6">Checkout</h1>

      <div className="flex items-center gap-2 mb-8 text-sm">
        {['Shipping', 'Review'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
              step >= i + 1 ? 'bg-accent text-white' : 'bg-gray-200 text-text-muted'
            }`}>{i + 1}</div>
            <span className={step >= i + 1 ? 'text-text font-medium' : 'text-text-muted'}>{s}</span>
            {i < 1 && <ChevronRight size={14} className="text-text-muted" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {!showAddressForm && addresses.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-sm mb-1">Shipping Address</h3>
                <p className="text-xs text-text-muted mb-3">This is your current shipping address</p>
                <div className="bg-surface-2 rounded-lg p-3 mb-3">
                  <p className="font-semibold text-sm">{selectedShippingAddr?.label || addresses[0].label}</p>
                  <p className="text-sm text-text-muted">
                    {selectedShippingAddr
                      ? `${selectedShippingAddr.street}, ${selectedShippingAddr.city}, ${selectedShippingAddr.state} ${selectedShippingAddr.zipCode}`
                      : `${addresses[0].street}, ${addresses[0].city}, ${addresses[0].state} ${addresses[0].zipCode}`}
                  </p>
                  <p className="text-sm text-text-muted">{addresses[0]?.country}</p>
                </div>
                <button onClick={() => setShowAddressForm(true)} className="text-sm text-accent font-medium hover:underline">
                  Change shipping address
                </button>
              </div>
            )}

            {showAddressForm && (
              <>
                {addresses.length > 0 && (
                  <div className="card">
                    <h3 className="font-semibold text-sm mb-3">Select a saved address</h3>
                    <div className="space-y-2 mb-4">
                      {addresses.map((addr) => (
                        <label key={addr.id} className="flex gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-accent transition-colors">
                          <input
                            type="radio"
                            name="savedAddr"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="font-semibold text-sm">{addr.label}</p>
                            <p className="text-xs text-text-muted">{addr.street}, {addr.city}, {addr.state} {addr.zipCode}</p>
                            <p className="text-xs text-text-muted">{addr.country}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card">
                  <h3 className="font-semibold text-sm mb-3">{selectedAddressId ? 'Or enter a new address' : 'Shipping Address'}</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={shippingForm.firstName}
                        onChange={(e) => setShippingForm({ ...shippingForm, firstName: e.target.value })}
                        placeholder="First Name *"
                        className="input !py-2 text-sm"
                      />
                      <input
                        value={shippingForm.lastName}
                        onChange={(e) => setShippingForm({ ...shippingForm, lastName: e.target.value })}
                        placeholder="Last Name *"
                        className="input !py-2 text-sm"
                      />
                    </div>
                    <input
                      value={shippingForm.street}
                      onChange={(e) => setShippingForm({ ...shippingForm, street: e.target.value })}
                      placeholder="Address *"
                      className="input !py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={shippingForm.city}
                        onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                        placeholder="City *"
                        className="input !py-2 text-sm"
                      />
                      <input
                        value={shippingForm.state}
                        onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                        placeholder="State / Region *"
                        className="input !py-2 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        value={shippingForm.zipCode}
                        onChange={(e) => setShippingForm({ ...shippingForm, zipCode: e.target.value })}
                        placeholder="Postal Code (Optional)"
                        className="input !py-2 text-sm"
                      />
                      <select
                        value={shippingForm.country}
                        onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}
                        className="input !py-2 text-sm"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={shippingForm.phone}
                      onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                      placeholder="Phone *"
                      className="input !py-2 text-sm"
                    />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAddress}
                        onChange={(e) => setSaveAddress(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-text-muted">Save this information for next time</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {addresses.length === 0 && !showAddressForm && (
              <div className="card text-center py-8">
                <MapPin size={32} className="mx-auto text-text-muted mb-3" />
                <p className="text-text-muted mb-3">No saved addresses found.</p>
                <button onClick={() => setShowAddressForm(true)} className="btn-primary">
                  Enter Shipping Address
                </button>
              </div>
            )}

            <div className="card">
              <h3 className="font-semibold text-sm mb-3">Billing Address</h3>
              <div className="space-y-2 mb-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-accent transition-colors">
                  <input
                    type="radio"
                    name="billing"
                    checked={sameBillingAsShipping}
                    onChange={() => setSameBillingAsShipping(true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">Same as shipping address</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-accent transition-colors">
                  <input
                    type="radio"
                    name="billing"
                    checked={!sameBillingAsShipping}
                    onChange={() => setSameBillingAsShipping(false)}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">Use a different billing address</span>
                </label>
              </div>

              {!sameBillingAsShipping && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={billingForm.firstName}
                      onChange={(e) => setBillingForm({ ...billingForm, firstName: e.target.value })}
                      placeholder="First Name *"
                      className="input !py-2 text-sm"
                    />
                    <input
                      value={billingForm.lastName}
                      onChange={(e) => setBillingForm({ ...billingForm, lastName: e.target.value })}
                      placeholder="Last Name *"
                      className="input !py-2 text-sm"
                    />
                  </div>
                  <input
                    value={billingForm.street}
                    onChange={(e) => setBillingForm({ ...billingForm, street: e.target.value })}
                    placeholder="Address *"
                    className="input !py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={billingForm.city}
                      onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
                      placeholder="City *"
                      className="input !py-2 text-sm"
                    />
                    <input
                      value={billingForm.state}
                      onChange={(e) => setBillingForm({ ...billingForm, state: e.target.value })}
                      placeholder="State / Region *"
                      className="input !py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={billingForm.zipCode}
                      onChange={(e) => setBillingForm({ ...billingForm, zipCode: e.target.value })}
                      placeholder="Postal Code (Optional)"
                      className="input !py-2 text-sm"
                    />
                    <input
                      value={billingForm.phone}
                      onChange={(e) => setBillingForm({ ...billingForm, phone: e.target.value })}
                      placeholder="Phone *"
                      className="input !py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Shipping Method</h3>
              </div>
              <div className="space-y-2">
                {SHIPPING_METHODS.map((method) => (
                  <label key={method.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${shippingMethod === method.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent'}`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        checked={shippingMethod === method.id}
                        onChange={() => setShippingMethod(method.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="font-semibold text-sm">{method.name}</p>
                        <p className="text-xs text-text-muted">{method.desc}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">{method.price === 0 ? 'Free' : formatCurrency(method.price)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <button
                onClick={() => setShowCoupon(!showCoupon)}
                className="flex items-center gap-2 text-sm font-medium text-accent hover:underline mb-3"
              >
                Have a coupon code?
              </button>
              {showCoupon && (
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter code"
                    className="input !py-2 text-sm flex-1"
                  />
                  <button onClick={validateCoupon} className="btn-outline !px-4 !py-2 text-sm">Apply</button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!showAddressForm && addresses.length > 0 && (
                <button onClick={() => { setShowAddressForm(true); setSelectedAddressId(''); }} className="btn-outline">
                  Change Address
                </button>
              )}
              <button
                onClick={handleContinueToReview}
                className="btn-primary"
              >
                Continue to Review <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="card h-fit">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm mb-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-text-muted">{item.product.name} x{item.quantity}</span>
                  <span>{formatCurrency(Number(item.product.price) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>{shippingCost > 0 ? formatCurrency(shippingCost) : 'Free'}</span></div>
              {codFee > 0 && <div className="flex justify-between"><span className="text-text-muted">COD Fee</span><span>{formatCurrency(codFee)}</span></div>}
              <div className="flex justify-between"><span className="text-text-muted">Tax (8%)</span><span>{formatCurrency(tax)}</span></div>
              {discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-{formatCurrency(discount)}</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Shipping Address</h3>
                <button onClick={() => setStep(1)} className="text-xs text-accent hover:underline">Edit</button>
              </div>
              {selectedAddressId && selectedShippingAddr ? (
                <div className="text-sm">
                  <p className="font-medium">{selectedShippingAddr.label}</p>
                  <p className="text-text-muted">{selectedShippingAddr.street}, {selectedShippingAddr.city}, {selectedShippingAddr.state} {selectedShippingAddr.zipCode}</p>
                  <p className="text-text-muted">{selectedShippingAddr.country}</p>
                  {shippingForm.firstName && <p className="text-text-muted mt-1">{shippingForm.firstName} {shippingForm.lastName} · {shippingForm.phone}</p>}
                </div>
              ) : (
                <div className="text-sm">
                  <p className="font-medium">{shippingForm.firstName} {shippingForm.lastName}</p>
                  <p className="text-text-muted">{shippingForm.street}, {shippingForm.city}, {shippingForm.state} {shippingForm.zipCode}</p>
                  <p className="text-text-muted">{COUNTRIES.find((c) => c.code === shippingForm.country)?.name}</p>
                  <p className="text-text-muted">{shippingForm.phone}</p>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Billing Address</h3>
                <button onClick={() => setStep(1)} className="text-xs text-accent hover:underline">Edit</button>
              </div>
              {sameBillingAsShipping ? (
                <p className="text-sm text-text-muted">Same as shipping address</p>
              ) : (
                <div className="text-sm">
                  <p className="font-medium">{billingForm.firstName} {billingForm.lastName}</p>
                  <p className="text-text-muted">{billingForm.street}, {billingForm.city}, {billingForm.state} {billingForm.zipCode}</p>
                  <p className="text-text-muted">{billingForm.phone}</p>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Shipping Method</h3>
                <button onClick={() => setStep(1)} className="text-xs text-accent hover:underline">Edit</button>
              </div>
              <p className="text-sm font-medium">{getShippingMethodName()}</p>
              <p className="text-xs text-text-muted">{SHIPPING_METHODS.find((m) => m.id === shippingMethod)?.desc}</p>
            </div>

            <div className="card">
              <h3 className="font-semibold text-sm mb-3">Payment Method</h3>
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
                        placeholder="Card number"
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
                        placeholder="MM/YY"
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
            </div>

            <div className="card">
              <h3 className="font-semibold text-sm mb-3">Order Items</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <span className="font-medium flex-1">{item.product.name}</span>
                    <span className="text-text-muted">x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(Number(item.product.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost"><ChevronLeft size={18} /> Back</button>
              <button onClick={handlePlaceOrder} disabled={placeOrder.isPending} className="btn-primary">
                {placeOrder.isPending ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>

          <div className="card h-fit">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Shipping</span><span>{shippingCost > 0 ? formatCurrency(shippingCost) : 'Free'}</span></div>
              {codFee > 0 && <div className="flex justify-between"><span className="text-text-muted">COD Fee</span><span>{formatCurrency(codFee)}</span></div>}
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
