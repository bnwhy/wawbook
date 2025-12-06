import React, { useState } from 'react';
import Hero from './components/Hero';
import Wizard from './components/Wizard';
import BookPreview from './components/BookPreview';
import LoadingScreen from './components/LoadingScreen';
import AdminDashboard from './components/AdminDashboard';
import { AppState, BookConfig, Story, Theme, Activity } from './types';
import { generateStoryText } from './services/geminiService';
import { Switch, Route, useLocation } from 'wouter';
import StaticPage from './pages/StaticPage';
import CategoryPage from './pages/CategoryPage';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialTheme, setInitialTheme] = useState<Theme | undefined>(undefined);
  const [initialActivity, setInitialActivity] = useState<Activity | undefined>(undefined);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string | undefined>(undefined);
  const [location, setLocation] = useLocation(); // Add useLocation hook

  const startCreation = (theme?: Theme, activity?: Activity, bookTitle?: string) => {
    setInitialTheme(theme);
    setInitialActivity(activity);
    setSelectedBookTitle(bookTitle);
    setAppState('CREATE');
    setError(null);
  };

  const cancelCreation = () => {
    setAppState('HOME');
    setConfig(null);
    setInitialTheme(undefined);
    setInitialActivity(undefined);
    setSelectedBookTitle(undefined);
  };

  const handleConfigComplete = async (finalConfig: BookConfig) => {
    setConfig(finalConfig);
    setAppState('GENERATING');
    
    try {
      // 1. Get Template Story (Instantaneous now)
      const generatedStory = await generateStoryText(finalConfig);
      
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
    <div className="font-sans text-slate-900 bg-brand-cream min-h-screen">
      <Switch>
        {/* Main Application Flow (SPA-like at root) */}
        <Route path="/">
          {appState === 'HOME' && <Hero onStart={startCreation} onAdminClick={() => setAppState('ADMIN')} />}
          
          {appState === 'CREATE' && (
            <Wizard 
              onComplete={handleConfigComplete} 
              onCancel={cancelCreation}
              initialTheme={initialTheme}
              initialActivity={initialActivity}
              bookTitle={selectedBookTitle}
            />
          )}

          {appState === 'GENERATING' && <LoadingScreen />}

          {appState === 'READING' && story && config && (
            <BookPreview 
              story={story} 
              config={config} 
              onReset={handleReset} 
            />
          )}
          
          {appState === 'ADMIN' && (
            <AdminDashboard onBack={() => setAppState('HOME')} />
          )}
        </Route>

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
  );
};

export default App;
