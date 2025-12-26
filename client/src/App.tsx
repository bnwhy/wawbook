import React, { useState, useEffect } from 'react';
import Hero from './components/Hero';
import Wizard from './components/Wizard';
import BookPreview from './components/BookPreview';
import LoadingScreen from './components/LoadingScreen';
import AdminDashboard from './components/AdminDashboard';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import { AppState, BookConfig, Story, Theme, Activity } from './types';
import { generateStoryText } from './services/geminiService';
import { Switch, Route, useLocation } from 'wouter';
import StaticPage from './pages/StaticPage';
import CategoryPage from './pages/CategoryPage';
import NotFound from './pages/NotFound';
import { BooksProvider } from './context/BooksContext';
import { MenuProvider } from './context/MenuContext';
import { CartProvider } from './context/CartContext';
import { EcommerceProvider } from './context/EcommerceContext';
import ScrollToTop from './components/ScrollToTop';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialTheme, setInitialTheme] = useState<Theme | undefined>(undefined);
  const [initialActivity, setInitialActivity] = useState<Activity | undefined>(undefined);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string | undefined>(undefined);
  const [initialSelections, setInitialSelections] = useState<Record<string, Record<string, any>> | undefined>(undefined);
  const [editingCartItemId, setEditingCartItemId] = useState<string | undefined>(undefined);
  const [location, setLocation] = useLocation(); // Add useLocation hook

  // Scroll to top when appState changes
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
    // editingCartItemId is reset above if it was set
  };

  const handleConfigComplete = async (finalConfig: BookConfig, context?: { theme?: Theme, productId?: string }) => {
    setConfig(finalConfig);
    setAppState('GENERATING');
    
    try {
      // 1. Get Template Story (Instantaneous now)
      // Pass the theme from context if available, as it's not in config anymore
      const generatedStory = await generateStoryText(finalConfig, selectedBookTitle, context?.theme);
      
      // 2. Set Story directly
      setStory(generatedStory);
      setAppState('READING');

    } catch (err) {
      console.error("Story generation failed", err);
      setError("Une erreur est survenue lors de la création du livre.");
      setAppState('HOME');
    }
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
          {/* Main Application Flow (SPA-like at root) */}
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

            {appState === 'GENERATING' && <LoadingScreen />}

            {appState === 'READING' && story && config && (
              <BookPreview 
                story={story} 
                config={config} 
                onReset={handleReset}
                onStart={() => startCreation(config.theme, undefined, story.title, config.characters)}
                editingCartItemId={editingCartItemId}
              />
            )}
          </Route>

          {/* Admin Route - Isolated */}
          <Route path="/admin">
            <AdminDashboard onBack={() => setLocation('/')} />
          </Route>

          {/* Ecommerce Routes */}
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

          {/* Content Pages */}
        <Route path="/products/:category">
          {(params) => (
            <CategoryPage 
              onSelectBook={(title) => {
                startCreation(undefined, undefined, title);
                setLocation('/');
              }} 
            />
          )}
        </Route>
        <Route path="/occasion/:occasion">
          {(params) => (
            <CategoryPage 
              onSelectBook={(title) => {
                startCreation(undefined, undefined, title);
                setLocation('/');
              }} 
            />
          )}
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

        {/* 404 */}
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

export default App;
