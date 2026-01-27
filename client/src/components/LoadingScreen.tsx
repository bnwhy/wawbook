import React, { useEffect, useState } from 'react';
import { Loader2, PenTool, Image as ImageIcon, Book, Sparkles } from 'lucide-react';

const MESSAGES = [
  { text: "On ouvre le grimoire...", icon: <Book className="w-8 h-8" />, cssColor: "var(--color-fun-blue)", progressRange: [0, 20] },
  { text: "Personnalisation de l'histoire...", icon: <PenTool className="w-8 h-8" />, cssColor: "var(--color-fun-pink)", progressRange: [20, 40] },
  { text: "Assemblage des pages...", icon: <ImageIcon className="w-8 h-8" />, cssColor: "var(--color-fun-purple)", progressRange: [40, 90] },
  { text: "Presque prêt !", icon: <Sparkles className="w-8 h-8 animate-spin" />, cssColor: "var(--color-fun-yellow)", progressRange: [90, 100] },
];

interface LoadingScreenProps {
  progress?: number;
  currentStep?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, currentStep }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  // Système interval pour rétrocompatibilité (si pas de progress fourni)
  useEffect(() => {
    if (progress === undefined) {
      const interval = setInterval(() => {
        setMsgIndex(prev => (prev + 1) % MESSAGES.length);
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [progress]);

  // Déterminer le message basé sur progress si fourni
  const getCurrentMessage = () => {
    if (progress !== undefined) {
      // Trouver le message correspondant à la progression
      const msg = MESSAGES.find(m => progress >= m.progressRange[0] && progress < m.progressRange[1]);
      return msg || MESSAGES[MESSAGES.length - 1]; // Dernier message si 100%
    }
    return MESSAGES[msgIndex];
  };

  const currentMsg = getCurrentMessage();
  const displayText = currentStep || currentMsg.text;
  const actualProgress = progress !== undefined ? progress : ((msgIndex + 1) / MESSAGES.length) * 100;

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white p-10 rounded-[3rem] shadow-2xl border-8 border-white relative overflow-hidden text-center">
         
         {/* Animated Background Blobs */}
         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fun-blue via-fun-pink to-fun-yellow"></div>
         <div className="absolute -top-20 -left-20 w-60 h-60 bg-fun-blue/20 rounded-full mix-blend-multiply filter blur-2xl animate-float"></div>
         <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-fun-pink/20 rounded-full mix-blend-multiply filter blur-2xl animate-float-delayed"></div>

         <div className="relative z-10 flex flex-col items-center">
            <div 
              className="w-24 h-24 bg-white rounded-3xl mb-8 flex items-center justify-center shadow-lg border-4 border-slate-50 transform rotate-6 transition-colors duration-500"
              style={{ color: currentMsg.cssColor }}
            >
              <div className="animate-bounce">
                {currentMsg.icon}
              </div>
            </div>

            <h3 className="text-3xl font-black text-slate-800 mb-3 font-display min-h-[80px] transition-all duration-500 flex items-center justify-center">
              {displayText}
            </h3>
            
            {/* Progress Bar */}
            <div className="w-full h-6 bg-slate-100 rounded-full border-2 border-slate-200 overflow-hidden relative mt-4">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIiBmaWxsLXJVsZT0iZXZlbm9kZCI+PGcgc3Ryb2tlPSJub25lIiBmaWxsPSIjZmZmZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiI+PHBhdGggZD0iTTAgNDBMNDAgMEgwTDQwIDQwVjBIMFY0MHoiLz48L2c+PC9zdmc+')] z-10 opacity-50"></div>
              {progress !== undefined ? (
                <div 
                  className="h-full bg-gradient-to-r from-fun-blue via-fun-pink to-fun-yellow rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, actualProgress))}%` }}
                ></div>
              ) : (
                <div className="h-full bg-gradient-to-r from-fun-blue via-fun-pink to-fun-yellow animate-[loading_2s_ease-in-out_infinite] w-[50%] rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)]"></div>
              )}
            </div>
            
            <p className="text-slate-400 mt-6 font-hand text-xl font-bold">Un instant, la magie opère !</p>
         </div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
