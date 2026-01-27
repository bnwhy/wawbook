import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import Wizard from '../components/Wizard';
import BookPreview from '../components/BookPreview';
import CartPage from '../pages/CartPage';
import CheckoutPage from '../pages/CheckoutPage';
import CheckoutSuccessPage from '../pages/CheckoutSuccessPage';
import CheckoutCancelPage from '../pages/CheckoutCancelPage';
import { AppState, BookConfig, Story, Theme, Activity } from '../types';
import { Switch, Route, useLocation } from 'wouter';
import StaticPage from '../pages/StaticPage';
import CategoryPage from '../pages/CategoryPage';
import CataloguePage from '../pages/CataloguePage';
import NotFound from '../pages/NotFound';
import { BooksProvider } from '../context/BooksContext';
import { MenuProvider } from '../context/MenuContext';
import { CartProvider } from '../context/CartContext';
import { EcommerceProvider } from '../context/EcommerceContext';
import ScrollToTop from '../components/ScrollToTop';

const PublicApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialTheme, setInitialTheme] = useState<Theme | undefined>(undefined);
  const [initialActivity, setInitialActivity] = useState<Activity | undefined>(undefined);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string | undefined>(undefined);
  const [initialSelections, setInitialSelections] = useState<Record<string, Record<string, any>> | undefined>(undefined);
  const [editingCartItemId, setEditingCartItemId] = useState<string | undefined>(undefined);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [appState]);

  const startCreation = (theme?: Theme, activity?: Activity, bookTitle?: string, selections?: Record<string, Record<string, any>>, editingId?: string) => {
    setInitialTheme(theme);
    setInitialActivity(activity);
    setSelectedBookTitle(bookTitle);
    setInitialSelections(selections);
    setEditingCartItemId(editingId);
    setAppState('CREATE');
    setError(null);
  };

  const cancelCreation = () => {
    if (editingCartItemId) {
      setLocation('/cart');
      setEditingCartItemId(undefined);
    }
    setAppState('HOME');
    setConfig(null);
    setInitialTheme(undefined);
    setInitialActivity(undefined);
    setSelectedBookTitle(undefined);
    setInitialSelections(undefined);
  };

  /**
   * handleConfigComplete - Passe directement à READING
   * BookPreview gère toute la génération (texte + pages) avec animation intégrée
   */
  const handleConfigComplete = async (finalConfig: BookConfig, context?: { theme?: Theme, productId?: string }) => {
    setConfig(finalConfig);
    setAppState('READING');
  };

  const handleReset = () => {
    setAppState('HOME');
    setConfig(null);
    setStory(null);
    setInitialTheme(undefined);
    setInitialActivity(undefined);
  };

  return (
    <BooksProvider>
      <MenuProvider>
        <CartProvider>
          <EcommerceProvider>
            <div className="font-sans text-slate-900 bg-brand-cream min-h-screen">
              <ScrollToTop />
              <Switch>
                <Route path="/">
                  {appState === 'HOME' && <Hero onStart={startCreation} />}
                  
                  {appState === 'CREATE' && (
                    <Wizard 
                      onComplete={handleConfigComplete} 
                      onCancel={cancelCreation}
                      initialTheme={initialTheme}
                      initialActivity={initialActivity}
                      bookTitle={selectedBookTitle}
                      initialSelections={initialSelections}
                      isEditing={!!editingCartItemId}
                    />
                  )}

                  {appState === 'READING' && config && (
                    <BookPreview 
                      story={story}
                      config={config} 
                      onReset={handleReset}
                      onStart={() => startCreation(config.theme, undefined, story?.title || selectedBookTitle, config.characters)}
                      editingCartItemId={editingCartItemId}
                      bookTitle={selectedBookTitle}
                      initialTheme={initialTheme}
                    />
                  )}
                </Route>

                <Route path="/catalogue">
                  <CataloguePage 
                    onSelectBook={(title) => {
                      startCreation(undefined, undefined, title);
                      setLocation('/');
                    }} 
                  />
                </Route>

                <Route path="/cart">
                  <CartPage onEdit={(item) => {
                    startCreation(
                      item.config.theme, 
                      item.config.appearance?.activity, 
                      item.bookTitle, 
                      item.config.characters,
                      item.id
                    );
                    setLocation('/');
                  }} />
                </Route>
                <Route path="/checkout" component={CheckoutPage} />
                <Route path="/checkout/success" component={CheckoutSuccessPage} />
                <Route path="/checkout/cancel" component={CheckoutCancelPage} />

                <Route path="/products/:category">
                  <CataloguePage 
                    onSelectBook={(title) => {
                      startCreation(undefined, undefined, title);
                      setLocation('/');
                    }} 
                  />
                </Route>
                <Route path="/occasion/:occasion">
                  <CataloguePage 
                    onSelectBook={(title) => {
                      startCreation(undefined, undefined, title);
                      setLocation('/');
                    }} 
                  />
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

                <Route component={NotFound} />
              </Switch>

              {error && (
                <div className="fixed bottom-4 right-4 bg-white border-l-4 border-brand-coral text-slate-700 px-6 py-4 rounded shadow-card z-50">
                  <strong className="font-bold text-brand-coral block mb-1">Oups !</strong>
                  <span className="block text-sm">{error}</span>
                  <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={() => setError(null)}>
                    &times;
                  </button>
                </div>
              )}
            </div>
          </EcommerceProvider>
        </CartProvider>
      </MenuProvider>
    </BooksProvider>
  );
};

export default PublicApp;
