import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Order, OrderStatus, ShippingZone } from '../types/ecommerce';
import { toast } from 'sonner';

interface EcommerceContextType {
  customers: Customer[];
  orders: Order[];
  shippingZones: ShippingZone[];
  defaultShippingRate: number;
  isLoading: boolean;
  
  // Customers
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'orderCount'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  
  // Orders
  createOrder: (
    customer: { firstName: string; lastName: string; email: string; phone?: string; address: any },
    items: any[],
    totalAmount: number,
    stripeSessionId?: string
  ) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderTracking: (orderId: string, trackingNumber: string) => Promise<void>;
  getOrdersByCustomer: (customerId: string) => Order[];
  addOrderLog: (orderId: string, log: { type: 'status_change' | 'comment' | 'system'; message: string; author?: string }) => Promise<void>;
  
  // Shipping Zones
  addShippingZone: (zone: Omit<ShippingZone, 'id' | 'createdAt'>) => Promise<void>;
  updateShippingZone: (id: string, zone: Partial<ShippingZone>) => Promise<void>;
  deleteShippingZone: (id: string) => Promise<void>;
  updateDefaultShippingRate: (rate: number) => void;
}

const EcommerceContext = createContext<EcommerceContextType | undefined>(undefined);

export const EcommerceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json() as Promise<Customer[]>;
    },
  });

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json() as Promise<Order[]>;
    },
  });

  // Fetch shipping zones
  const { data: shippingZones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ['shipping-zones'],
    queryFn: async () => {
      const response = await fetch('/api/shipping-zones');
      if (!response.ok) throw new Error('Failed to fetch shipping zones');
      return response.json() as Promise<ShippingZone[]>;
    },
  });

  // Fetch default shipping rate
  const { data: defaultShippingData } = useQuery({
    queryKey: ['settings', 'defaultShippingRate'],
    queryFn: async () => {
      const response = await fetch('/api/settings/defaultShippingRate');
      if (response.status === 404) return { value: 5.99 };
      if (!response.ok) throw new Error('Failed to fetch default shipping rate');
      return response.json();
    },
  });

  const defaultShippingRate = defaultShippingData?.value || 5.99;
  const isLoading = customersLoading || ordersLoading || zonesLoading;

  // Mutations
  const addCustomerMutation = useMutation({
    mutationFn: async (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'orderCount'>) => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          ...customer,
        }),
      });
      if (!response.ok) throw new Error('Failed to add customer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client ajouté');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update customer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Client mis à jour');
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (order: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Commande créée');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Order> }) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const addShippingZoneMutation = useMutation({
    mutationFn: async (zone: Omit<ShippingZone, 'id' | 'createdAt'>) => {
      const response = await fetch('/api/shipping-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `zone-${Date.now()}`,
          ...zone,
        }),
      });
      if (!response.ok) throw new Error('Failed to add shipping zone');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast.success('Zone d\'expédition ajoutée');
    },
  });

  const updateShippingZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShippingZone> }) => {
      const response = await fetch(`/api/shipping-zones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update shipping zone');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast.success('Zone d\'expédition mise à jour');
    },
  });

  const deleteShippingZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/shipping-zones/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete shipping zone');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      toast.success('Zone d\'expédition supprimée');
    },
  });

  // Context methods
  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'orderCount'>) => {
    await addCustomerMutation.mutateAsync(customer);
  };

  const updateCustomer = async (id: string, customer: Partial<Customer>) => {
    await updateCustomerMutation.mutateAsync({ id, data: customer });
  };

  const createOrder = async (
    customer: { firstName: string; lastName: string; email: string; phone?: string; address: any },
    items: any[],
    totalAmount: number,
    stripeSessionId?: string
  ): Promise<string> => {
    const generateOrderId = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = '';
      for (let i = 0; i < 9; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const orderId = generateOrderId();
    
    // Find or create customer
    let existingCustomer = customers.find(c => c.email === customer.email);
    let customerId: string;
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update customer totals
      await updateCustomer(customerId, {
        totalSpent: Number(existingCustomer.totalSpent) + totalAmount,
        orderCount: existingCustomer.orderCount + 1,
      });
    } else {
      const newCustomer = await addCustomerMutation.mutateAsync({
        ...customer,
      });
      customerId = newCustomer.id;
      // Update customer totals after creation
      await updateCustomer(customerId, {
        totalSpent: totalAmount,
        orderCount: 1,
      });
    }

    const order: any = {
      id: orderId,
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      status: 'pending' as OrderStatus,
      paymentStatus: 'pending',
      items,
      totalAmount: totalAmount.toString(),
      shippingAddress: customer.address,
      logs: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          type: 'system' as const,
          message: 'Commande créée',
          author: 'Système',
        },
      ],
    };

    if (stripeSessionId) {
      order.stripeSessionId = stripeSessionId;
    }

    await createOrderMutation.mutateAsync(order);
    return orderId;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type: 'status_change' as const,
      message: `Statut changé: ${status}`,
      author: 'Admin',
    };

    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        status,
        logs: [...(order.logs || []), newLog],
      },
    });
  };

  const updateOrderTracking = async (orderId: string, trackingNumber: string) => {
    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: { trackingNumber },
    });
  };

  const getOrdersByCustomer = (customerId: string) => {
    return orders.filter(o => o.customerId === customerId);
  };

  const addOrderLog = async (orderId: string, log: { type: 'status_change' | 'comment' | 'system'; message: string; author?: string }) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const newLog = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...log,
    };

    await updateOrderMutation.mutateAsync({
      id: orderId,
      data: {
        logs: [...(order.logs || []), newLog],
      },
    });
  };

  const addShippingZone = async (zone: Omit<ShippingZone, 'id' | 'createdAt'>) => {
    await addShippingZoneMutation.mutateAsync(zone);
  };

  const updateShippingZone = async (id: string, zone: Partial<ShippingZone>) => {
    await updateShippingZoneMutation.mutateAsync({ id, data: zone });
  };

  const deleteShippingZone = async (id: string) => {
    await deleteShippingZoneMutation.mutateAsync(id);
  };

  const updateDefaultShippingRate = async (rate: number) => {
    await fetch('/api/settings/defaultShippingRate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: rate }),
    });
    queryClient.invalidateQueries({ queryKey: ['settings', 'defaultShippingRate'] });
  };

  return (
    <EcommerceContext.Provider
      value={{
        customers,
        orders,
        shippingZones,
        defaultShippingRate,
        isLoading,
        addCustomer,
        updateCustomer,
        createOrder,
        updateOrderStatus,
        updateOrderTracking,
        getOrdersByCustomer,
        addOrderLog,
        addShippingZone,
        updateShippingZone,
        deleteShippingZone,
        updateDefaultShippingRate,
      }}
    >
      {children}
    </EcommerceContext.Provider>
  );
};

export const useEcommerce = () => {
  const context = useContext(EcommerceContext);
  if (context === undefined) {
    throw new Error('useEcommerce must be used within an EcommerceProvider');
  }
  return context;
};
