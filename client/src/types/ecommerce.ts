
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
}
