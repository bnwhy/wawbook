
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  totalSpent: number;
  orderCount: number;
  notes?: string;
  hasAccount?: boolean; // Indicates if customer has an authenticated account
}

export interface OrderItem {
  id: string;
  bookId: string;
  bookTitle: string; // Snapshot of the title at time of order
  quantity: number;
  price: number;
  configuration: any; // JSON object of the customization
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string; // Snapshot for easy display
  customerEmail: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  logs?: OrderLog[];
}

export interface OrderLog {
  id: string;
  date: string;
  type: 'status_change' | 'comment' | 'system';
  message: string;
  author?: string; // "System" or "Admin"
}

export interface ShippingMethod {
  id: string;
  name: string;
  price: number;        // Prix de base (toujours)
  offerPrice?: number;  // Prix quand la condition Offre est remplie
  description?: string;
  estimatedDelay?: string;
  condition?: {
    type: 'weight' | 'price' | 'quantity' | 'none';
    operator: 'greater_than' | 'less_than' | 'between';
    value: number;
    maxValue?: number;
  };
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[]; // ISO codes or country names
  methods: ShippingMethod[];
}
