import { Customer, Order, ShippingZone } from '../types/ecommerce';

export const MOCK_CUSTOMERS: Customer[] = [
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

export const MOCK_ORDERS: Order[] = [
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
    ],
    logs: [
      { id: 'l1', date: '2023-11-15T10:35:00Z', type: 'system', message: 'Commande créée', author: 'Système' },
      { id: 'l2', date: '2023-11-15T10:36:00Z', type: 'status_change', message: 'Statut passé à En attente', author: 'Système' },
      { id: 'l3', date: '2023-11-16T09:00:00Z', type: 'status_change', message: 'Statut passé à Livrée', author: 'Admin' }
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

export const MOCK_SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'zone-fr',
    name: 'France Métropolitaine',
    countries: ['France'],
    methods: [
      { id: 'm1', name: 'Livraison Standard', price: 4.90, estimatedDelay: '3-5 jours' },
      { id: 'm2', name: 'Livraison Express', price: 12.90, estimatedDelay: '24-48h' }
    ]
  },
  {
    id: 'zone-eu',
    name: 'Union Européenne',
    countries: ['Belgique', 'Allemagne', 'Italie', 'Espagne'],
    methods: [
      { id: 'm3', name: 'Standard International', price: 14.90, estimatedDelay: '5-7 jours' }
    ]
  }
];
