import React from 'react';
import Hero from '../components/Hero';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import CheckoutSuccessPage from '../pages/CheckoutSuccessPage';
import CheckoutCancelPage from '../pages/CheckoutCancelPage';
import CreatePage from '../pages/CreatePage';
import PreviewPage from '../pages/PreviewPage';
import { Switch, Route, useLocation } from 'wouter';
import StaticPage from '../pages/StaticPage';
import CataloguePage from '../pages/CataloguePage';
import NotFound from '../pages/NotFound';
import { AuthProvider } from '../context/AuthContext';
import { BooksProvider } from '../context/BooksContext';
import { MenuProvider } from '../context/MenuContext';
import { CartProvider } from '../context/CartContext';
import { EcommerceProvider } from '../context/EcommerceContext';
import { HomepageProvider } from '../context/HomepageContext';
import ScrollToTop from '../components/ScrollToTop';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import AccountPage from '../pages/AccountPage';
import AccountProfilePage from '../pages/AccountProfilePage';
import AccountOrdersPage from '../pages/AccountOrdersPage';
import AccountOrderDetailPage from '../pages/AccountOrderDetailPage';
import TermsPage from '../pages/TermsPage';
import PrivacyPage from '../pages/PrivacyPage';
import ProductPage from '../pages/ProductPage';

const PublicApp: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <AuthProvider>
      <BooksProvider>
        <HomepageProvider>
          <MenuProvider>
            <CartProvider>
              <EcommerceProvider>
                <div className="font-sans text-slate-900 min-h-screen" style={{ background: 'linear-gradient(180deg, #E0F2FE 0%, #F0F9FF 100%)' }}>
                <ScrollToTop />
                <Switch>
                  {/* Auth routes */}
                  <Route path="/login" component={LoginPage} />
                  <Route path="/signup" component={SignupPage} />
                  <Route path="/forgot-password" component={ForgotPasswordPage} />
                  <Route path="/reset-password" component={ResetPasswordPage} />

                  {/* Account routes (protected) */}
                  <Route path="/account">
                    <ProtectedRoute>
                      <AccountPage />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/account/profile">
                    <ProtectedRoute>
                      <AccountProfilePage />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/account/orders">
                    <ProtectedRoute>
                      <AccountOrdersPage />
                    </ProtectedRoute>
                  </Route>
                  <Route path="/account/orders/:orderId">
                    <ProtectedRoute>
                      <AccountOrderDetailPage />
                    </ProtectedRoute>
                  </Route>

                  <Route path="/">
                    <Hero onStart={(theme, activity, bookTitle) => {
                      if (bookTitle) {
                        setLocation(`/book/${encodeURIComponent(bookTitle)}`);
                      } else {
                        const p = new URLSearchParams();
                        if (theme) p.set('theme', encodeURIComponent(theme));
                        if (activity) p.set('activity', encodeURIComponent(activity));
                        setLocation(`/create?${p.toString()}`);
                      }
                    }} />
                  </Route>

                  <Route path="/book/:bookTitle">
                    {(params) => <ProductPage bookTitle={params.bookTitle} />}
                  </Route>

                  <Route path="/create" component={CreatePage} />
                  <Route path="/preview" component={PreviewPage} />

                <Route path="/catalogue">
                  <CataloguePage />
                </Route>

                <Route path="/cart">
                  <CartPage />
                </Route>
                <Route path="/checkout" component={CheckoutPage} />
                <Route path="/checkout/success" component={CheckoutSuccessPage} />
                <Route path="/checkout/cancel" component={CheckoutCancelPage} />

                <Route path="/products/:category">
                  <CataloguePage />
                </Route>
                <Route path="/occasion/:occasion">
                  <CataloguePage />
                </Route>
                
                <Route path="/for/:audience">
                  {(params) => <StaticPage title={decodeURIComponent(params.audience)} category="Pour qui ?" />}
                </Route>
                
                <Route path="/about/:topic">
                  {(params) => <StaticPage title={decodeURIComponent(params.topic)} category="À propos" />}
                </Route>
                
                <Route path="/help/:topic">
                  {(params) => <StaticPage title={decodeURIComponent(params.topic)} category="Aide" />}
                </Route>

                <Route path="/terms" component={TermsPage} />
                <Route path="/privacy" component={PrivacyPage} />

                <Route component={NotFound} />
              </Switch>

                </div>
              </EcommerceProvider>
            </CartProvider>
          </MenuProvider>
        </HomepageProvider>
      </BooksProvider>
    </AuthProvider>
  );
};

export default PublicApp;
