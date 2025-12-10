import React from 'react';
import { Cloud, Heart, Settings } from 'lucide-react';

interface FooterProps {
  // No props needed
}

const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-cloud-dark text-cloud-lightest py-20 px-6 mt-auto w-full z-10 relative">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-6 text-white">
            <Cloud fill="currentColor" /> <span className="font-display font-black text-2xl">NuageBook</span>
          </div>
          <p className="text-cloud-light/60 font-medium text-lg max-w-sm mb-8">
            Nous créons des moments magiques de lecture pour les enfants du monde entier.
          </p>
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 cursor-pointer"><span className="font-black">I</span></div>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 cursor-pointer"><span className="font-black">F</span></div>
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Explorer</h4>
          <ul className="space-y-4 font-medium text-cloud-light/60">
            <li className="hover:text-white cursor-pointer transition-colors">Accueil</li>
            <li className="hover:text-white cursor-pointer transition-colors">Histoires</li>
            <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
            <li className="hover:text-white cursor-pointer transition-colors">À propos</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Légal</h4>
          <ul className="space-y-4 font-medium text-cloud-light/60">
            <li className="hover:text-white cursor-pointer transition-colors">Confidentialité</li>
            <li className="hover:text-white cursor-pointer transition-colors">CGU</li>
            <li className="hover:text-white cursor-pointer transition-colors">Mentions Légales</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-center text-cloud-light/40 font-bold text-sm">
        © 2024 NuageBook. Fait avec <Heart size={14} className="inline mx-1 text-accent-melon" fill="currentColor" /> pour les rêveurs.
      </div>
    </footer>
  );
};

export default Footer;
