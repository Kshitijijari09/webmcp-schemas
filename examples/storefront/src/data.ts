export interface Product {
  productId: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  rating: number;
  inStock: boolean;
  availableQuantity: number;
}

export const PRODUCTS: Product[] = [
  {
    productId: 'sku_1',
    name: 'Trailrunner Low',
    category: 'footwear',
    brand: 'Northpeak',
    price: 89.99,
    currency: 'USD',
    rating: 4.5,
    inStock: true,
    availableQuantity: 12,
  },
  {
    productId: 'sku_2',
    name: 'Roadglide Pro',
    category: 'footwear',
    brand: 'Northpeak',
    price: 114.5,
    currency: 'USD',
    rating: 4.2,
    inStock: false,
    availableQuantity: 0,
  },
  {
    productId: 'sku_3',
    name: 'Summit Hiker',
    category: 'footwear',
    brand: 'Alpine Co',
    price: 129.0,
    currency: 'USD',
    rating: 4.8,
    inStock: true,
    availableQuantity: 5,
  },
  {
    productId: 'sku_4',
    name: 'Classic Tee',
    category: 'apparel',
    brand: 'Basiq',
    price: 24.0,
    currency: 'USD',
    rating: 4.0,
    inStock: true,
    availableQuantity: 40,
  },
  {
    productId: 'sku_5',
    name: 'Windbreaker Jacket',
    category: 'apparel',
    brand: 'Alpine Co',
    price: 79.0,
    currency: 'USD',
    rating: 4.6,
    inStock: true,
    availableQuantity: 8,
  },
  {
    productId: 'sku_6',
    name: 'Trail Shorts',
    category: 'apparel',
    brand: 'Northpeak',
    price: 34.5,
    currency: 'USD',
    rating: 3.9,
    inStock: true,
    availableQuantity: 20,
  },
];

export const PROMO_CODES: Record<string, number> = {
  WELCOME10: 0.1,
  SAVE20: 0.2,
};

export interface Order {
  orderId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  items: { productId: string; quantity: number }[];
  estimatedDelivery?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export const ORDERS: Order[] = [
  {
    orderId: 'order_1001',
    status: 'shipped',
    items: [{ productId: 'sku_1', quantity: 1 }],
    estimatedDelivery: '2026-09-05',
    trackingNumber: '1Z999AA10123456784',
    trackingUrl: 'https://example.com/track/1Z999AA10123456784',
  },
  {
    orderId: 'order_1002',
    status: 'delivered',
    items: [{ productId: 'sku_4', quantity: 2 }],
    estimatedDelivery: '2026-08-20',
  },
];
