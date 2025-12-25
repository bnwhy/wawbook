import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Customer, Order, OrderStatus } from '../types/ecommerce';

// Mock Data Generation
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@example.com',
    phone: '06 12 34 56 78',
    createdAt: '2023-11-15T10:30:00Z',
    address: {
      street: '12 Rue des Lilas',
      city: 'Lyon',
      zipCode: '69003',
      country: 'France'
    },
    totalSpent: 89.70,
    orderCount: 2
  },
  {
    id: 'c2',
    firstName: 'Thomas',
    lastName: 'Dubois',
    email: 'thomas.dubois@test.com',
    createdAt: '2023-12-01T14:20:00Z',
    address: {
      street: '45 Avenue Jean Jaurès',
      city: 'Paris',
      zipCode: '75019',
      country: 'France'
    },
    totalSpent: 29.90,
    orderCount: 1
  },
  {
    id: 'c3',
    firstName: 'Marie',
    lastName: 'Lefebvre',
    email: 'marie.l@domain.fr',
    phone: '07 89 12 34 56',
    createdAt: '2024-01-10T09:15:00Z',
    address: {
      street: '8 Place du Marché',
      city: 'Bordeaux',
      zipCode: '33000',
      country: 'France'
    },
    totalSpent: 59.80,
    orderCount: 1
  }
];

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2024-001',
    customerId: 'c1',
    customerName: 'Sophie Martin',
    customerEmail: 'sophie.martin@example.com',
    status: 'delivered',
    createdAt: '2023-11-15T10:35:00Z',
    totalAmount: 29.90,
    shippingAddress: {
      street: '12 Rue des Lilas',
      city: 'Lyon',
      zipCode: '69003',
      country: 'France'
    },
    items: [
      {
        id: 'item1',
        bookId: 'explorer',
        bookTitle: "L'Aventurier du Monde",
        quantity: 1,
        price: 29.90,
        configuration: { name: 'Léo', gender: 'boy' }
      }
    ]
  },
  {
    id: 'ORD-2024-002',
    customerId: 'c1',
    customerName: 'Sophie Martin',
    customerEmail: 'sophie.martin@example.com',
    status: 'shipped',
    createdAt: '2023-12-20T16:45:00Z',
    totalAmount: 59.80,
    trackingNumber: 'FR123456789',
    shippingAddress: {
      street: '12 Rue des Lilas',
      city: 'Lyon',
      zipCode: '69003',
      country: 'France'
    },
    items: [
      {
        id: 'item2',
        bookId: 'magician',
        bookTitle: "L'École des Sorciers",
        quantity: 1,
        price: 29.90,
        configuration: { name: 'Léo', gender: 'boy' }
      },
      {
        id: 'item3',
        bookId: 'space',
        bookTitle: "Mission Espace",
        quantity: 1,
        price: 29.90,
        configuration: { name: 'Lucas', gender: 'boy' }
      }
    ]
  },
  {
    id: 'ORD-2024-003',
    customerId: 'c2',
    customerName: 'Thomas Dubois',
    customerEmail: 'thomas.dubois@test.com',
    status: 'processing',
    createdAt: '2023-12-01T14:25:00Z',
    totalAmount: 29.90,
    shippingAddress: {
      street: '45 Avenue Jean Jaurès',
      city: 'Paris',
      zipCode: '75019',
      country: 'France'
    },
    items: [
      {
        id: 'item4',
        bookId: 'animals',
        bookTitle: "Les Amis de la Forêt",
        quantity: 1,
        price: 29.90,
        configuration: { name: 'Emma', gender: 'girl' }
      }
    ]
  },
  {
    id: 'ORD-2024-004',
    customerId: 'c3',
    customerName: 'Marie Lefebvre',
    customerEmail: 'marie.l@domain.fr',
    status: 'pending',
    createdAt: '2024-01-10T09:20:00Z',
    totalAmount: 59.80,
    shippingAddress: {
      street: '8 Place du Marché',
      city: 'Bordeaux',
      zipCode: '33000',
      country: 'France'
    },
    items: [
      {
        id: 'item5',
        bookId: 'dad',
        bookTitle: "Mon Papa & Moi",
        quantity: 2,
        price: 29.90,
        configuration: { childName: 'Chloé', adultName: 'Papa' }
      }
    ]
  }
];

interface EcommerceContextType {
  customers: Customer[];
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderTracking: (orderId: string, trackingNumber: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getOrdersByCustomer: (customerId: string) => Order[];
  createOrder: (customerData: any, cartItems: any[], totalAmount: number) => void;
}

const EcommerceContext = createContext<EcommerceContextType | undefined>(undefined);

export const EcommerceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial state from localStorage if available, otherwise use MOCK data
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('ecommerce_customers');
      return saved ? JSON.parse(saved) : MOCK_CUSTOMERS;
    } catch (e) {
      console.error('Error parsing customers data', e);
      return MOCK_CUSTOMERS;
    }
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('ecommerce_orders');
      return saved ? JSON.parse(saved) : MOCK_ORDERS;
    } catch (e) {
      console.error('Error parsing orders data', e);
      return MOCK_ORDERS;
    }
  });

  // Persist to localStorage whenever state changes
  React.useEffect(() => {
    try {
      localStorage.setItem('ecommerce_customers', JSON.stringify(customers));
    } catch (e) {
      console.error('Error saving customers data', e);
    }
  }, [customers]);

  React.useEffect(() => {
    try {
      localStorage.setItem('ecommerce_orders', JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders data', e);
    }
  }, [orders]);

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const updateOrderTracking = (orderId: string, trackingNumber: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, trackingNumber, status: 'shipped' } : o));
  };

  const createOrder = (customerData: any, cartItems: any[], totalAmount: number) => {
    // 1. Find or Create Customer
    let customer = customers.find(c => c.email === customerData.email);
    let customerId = customer?.id;

    if (!customer) {
      customerId = `c${Date.now()}`;
      customer = {
        id: customerId,
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        email: customerData.email,
        phone: customerData.phone,
        createdAt: new Date().toISOString(),
        address: customerData.address,
        totalSpent: 0,
        orderCount: 0
      };
      setCustomers(prev => [...prev, customer!]);
    } else {
       // Update existing customer stats logic is handled below, but we might want to update address
       setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, address: customerData.address } : c));
    }

    if (!customerId) return; // Should not happen

    // 2. Create Order
    const newOrder: Order = {
      id: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      customerId: customerId,
      customerName: `${customerData.firstName} ${customerData.lastName}`,
      customerEmail: customerData.email,
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalAmount: totalAmount,
      shippingAddress: customerData.address,
      items: cartItems.map(item => ({
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        bookId: item.productId || item.config.theme || 'unknown', 
        bookTitle: item.bookTitle,
        quantity: item.quantity,
        price: item.price,
        configuration: item.config // Store full config including characters and childName
      }))
    };

    setOrders(prev => [newOrder, ...prev]);

    // 3. Update Customer Stats
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          totalSpent: c.totalSpent + totalAmount,
          orderCount: c.orderCount + 1
        };
      }
      return c;
    }));
  };

  const getCustomerById = (id: string) => customers.find(c => c.id === id);
  
  const getOrdersByCustomer = (customerId: string) => orders.filter(o => o.customerId === customerId);

  return (
    <EcommerceContext.Provider value={{ 
      customers, 
      orders, 
      updateOrderStatus, 
      updateOrderTracking,
      getCustomerById,
      getOrdersByCustomer,
      createOrder
    }}>
      {children}
    </EcommerceContext.Provider>
  );
};

export const useEcommerce = () => {
  const context = useContext(EcommerceContext);
  if (context === undefined) {
    throw new Error('useEcommerce must be used within a EcommerceProvider');
  }
  return context;
};
