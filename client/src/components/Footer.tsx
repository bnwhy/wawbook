import React from 'react';
import { Cloud, Heart } from 'lucide-react';
import { Link } from 'wouter';
import PaymentBadges from './PaymentBadges';

interface FooterProps {
  // No props needed
}

const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-cloud-dark text-cloud-lightest py-20 px-6 mt-auto w-full z-10 relative">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-1">
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
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Aide</h4>
          <ul className="space-y-4 font-medium text-cloud-light/60">
            <li><Link href="/help/FAQ" className="hover:text-white transition-colors block">FAQ</Link></li>
            <li><Link href="/help/Contact" className="hover:text-white transition-colors block">Contact</Link></li>
            <li><Link href="/help/Service client" className="hover:text-white transition-colors block">Service client</Link></li>
            <li><Link href="/help/Mentions légales" className="hover:text-white transition-colors block">Mentions légales</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Légal</h4>
          <ul className="space-y-4 font-medium text-cloud-light/60">
            <li><Link href="/privacy" className="hover:text-white transition-colors block">Confidentialité</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors block">CGU</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10">
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-cloud-light/60 text-sm font-medium mb-4">Paiements sécurisés</p>
            <PaymentBadges size="small" />
          </div>
          <div className="text-center text-cloud-light/40 font-bold text-sm">
            © 2024 NuageBook. Fait avec <Heart size={14} className="inline mx-1 text-accent-melon" fill="currentColor" /> pour les rêveurs.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
