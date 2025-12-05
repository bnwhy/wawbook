import React, { useState } from 'react';
import Hero from './components/Hero';
import Wizard from './components/Wizard';
import BookPreview from './components/BookPreview';
import LoadingScreen from './components/LoadingScreen';
import AdminDashboard from './components/AdminDashboard';
import { AppState, BookConfig, Story, Theme, Activity } from './types';
import { generateStoryText } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('HOME');
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initialTheme, setInitialTheme] = useState<Theme | undefined>(undefined);
  const [initialActivity, setInitialActivity] = useState<Activity | undefined>(undefined);

  const startCreation = (theme?: Theme, activity?: Activity) => {
    setInitialTheme(theme);
    setInitialActivity(activity);
    setAppState('CREATE');
    setError(null);
  };

  const cancelCreation = () => {
    setAppState('HOME');
    setConfig(null);
    setInitialTheme(undefined);
    setInitialActivity(undefined);
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
      {appState === 'HOME' && <Hero onStart={startCreation} onAdminClick={() => setAppState('ADMIN')} />}
      
      {appState === 'CREATE' && (
        <Wizard 
          onComplete={handleConfigComplete} 
          onCancel={cancelCreation}
          initialTheme={initialTheme}
          initialActivity={initialActivity}
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
