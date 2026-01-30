import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import { BooksProvider } from '../context/BooksContext';
import { MenuProvider } from '../context/MenuContext';
import { CartProvider } from '../context/CartContext';
import { EcommerceProvider } from '../context/EcommerceContext';
import { HomepageProvider } from '../context/HomepageContext';
import { Toaster } from 'sonner';

const AdminApp: React.FC = () => {
  return (
    <BooksProvider>
      <HomepageProvider>
        <MenuProvider>
          <CartProvider>
            <EcommerceProvider>
              <div className="font-sans text-slate-900 bg-stone-100 min-h-screen">
                <AdminDashboard onBack={() => {
                  window.location.href = '/';
                }} />
                <Toaster position="bottom-right" richColors />
              </div>
            </EcommerceProvider>
          </CartProvider>
        </MenuProvider>
      </HomepageProvider>
    </BooksProvider>
  );
};

export default AdminApp;
