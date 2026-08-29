export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'CUSTOMER' | 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  children?: Category[];
  _count?: { products: number };
  sortOrder: number;
  isActive: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  tags: string[];
  specs?: Record<string, string>;
  productType?: string;
  keyFeatures: string[];
  warranty?: string;
  compatibility: string[];
  useCases: string[];
  colors: string[];
  dimensions?: string;
  weight?: number;
  category: Category;
  brand?: Brand;
  images: ProductImage[];
  variants?: ProductVariant[];
  reviews?: Review[];
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQty: number;
  isActive: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: any;
  trackingNumber?: string;
  carrier?: string;
  items: OrderItem[];
  payment?: PaymentTransaction[];
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface PaymentTransaction {
  id: string;
  method: string;
  amount: number;
  currency: string;
  status: string;
  referenceCode?: string;
}

export interface Review {
  id: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  productId: string;
  rating: number;
  title?: string;
  comment: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
