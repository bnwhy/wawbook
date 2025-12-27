import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Customer, Order, OrderStatus, ShippingZone } from '../types/ecommerce';
import { MOCK_CUSTOMERS, MOCK_ORDERS, MOCK_SHIPPING_ZONES } from '../data/mockEcommerceData';

interface EcommerceContextType {
  customers: Customer[];
  orders: Order[];
  shippingZones: ShippingZone[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderTracking: (orderId: string, trackingNumber: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getOrdersByCustomer: (customerId: string) => Order[];
  createOrder: (customerData: any, cartItems: any[], totalAmount: number) => void;
  updateCustomer: (customerId: string, data: Partial<Customer>) => void;
  addCustomer: (customer: Customer) => void;
  addOrderLog: (orderId: string, message: string, type?: 'comment' | 'status_change' | 'system') => void;
  addShippingZone: (zone: ShippingZone) => void;
  updateShippingZone: (id: string, zone: Partial<ShippingZone>) => void;
  deleteShippingZone: (id: string) => void;
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

  const [shippingZones, setShippingZones] = useState<ShippingZone[]>(() => {
    try {
      const saved = localStorage.getItem('ecommerce_shipping_zones');
      return saved ? JSON.parse(saved) : MOCK_SHIPPING_ZONES;
    } catch (e) {
      console.error('Error parsing shipping zones data', e);
      return MOCK_SHIPPING_ZONES;
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

  React.useEffect(() => {
    try {
      localStorage.setItem('ecommerce_shipping_zones', JSON.stringify(shippingZones));
    } catch (e) {
      console.error('Error saving shipping zones data', e);
    }
  }, [shippingZones]);

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newLog = {
            id: `log-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'status_change',
            message: `Statut modifié vers ${status === 'pending' ? 'En attente' : status === 'processing' ? 'En cours' : status === 'shipped' ? 'Expédiée' : status === 'delivered' ? 'Livrée' : 'Annulée'}`,
            author: 'Admin'
        };
        return { 
            ...o, 
            status,
            logs: [...(o.logs || []), newLog] as any[]
        };
      }
      return o;
    }));
  };

  const updateOrderTracking = (orderId: string, trackingNumber: string) => {
    setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
            const newLog = {
                id: `log-${Date.now()}`,
                date: new Date().toISOString(),
                type: 'system',
                message: `Numéro de suivi ajouté: ${trackingNumber}`,
                author: 'Système'
            };
            const statusLog = {
                id: `log-${Date.now()}-status`,
                date: new Date().toISOString(),
                type: 'status_change',
                message: 'Statut modifié vers Expédiée',
                author: 'Système'
            };
            return { 
                ...o, 
                trackingNumber, 
                status: 'shipped',
                logs: [...(o.logs || []), newLog, statusLog] as any[]
            };
        }
        return o;
    }));
  };

  const addOrderLog = (orderId: string, message: string, type: 'comment' | 'status_change' | 'system' = 'comment') => {
      setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
              const newLog = {
                  id: `log-${Date.now()}`,
                  date: new Date().toISOString(),
                  type,
                  message,
                  author: 'Admin'
              };
              return {
                  ...o,
                  logs: [...(o.logs || []), newLog] as any[]
              };
          }
          return o;
      }));
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
      })),
      logs: [
        {
            id: `log-${Date.now()}`,
            date: new Date().toISOString(),
            type: 'system',
            message: 'Commande créée',
            author: 'Système'
        }
      ]
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

  const updateCustomer = (customerId: string, data: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...data } : c));
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const getCustomerById = (id: string) => customers.find(c => c.id === id);
  
  const getOrdersByCustomer = (customerId: string) => orders.filter(o => o.customerId === customerId);

  const addShippingZone = (zone: ShippingZone) => {
    setShippingZones(prev => [...prev, zone]);
  };

  const updateShippingZone = (id: string, zone: Partial<ShippingZone>) => {
    setShippingZones(prev => prev.map(z => z.id === id ? { ...z, ...zone } : z));
  };

  const deleteShippingZone = (id: string) => {
    setShippingZones(prev => prev.filter(z => z.id !== id));
  };

  return (
    <EcommerceContext.Provider value={{ 
      customers, 
      orders, 
      shippingZones,
      updateOrderStatus, 
      updateOrderTracking,
      getCustomerById,
      getOrdersByCustomer,
      createOrder,
      updateCustomer,
      addCustomer,
      addOrderLog,
      addShippingZone,
      updateShippingZone,
      deleteShippingZone
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
