import React from "react";
import { Facebook, Instagram, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import PaymentBadges from "../PaymentBadges";

export function Footer() {
  return (
    <footer className="bg-white pt-16 pb-8 relative">
      <div className="container mx-auto px-4">
        
        {/* Newsletter Box */}
        <div className="bg-secondary/30 rounded-[2.5rem] p-8 md:p-12 mb-16 flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-white shadow-lg">
           <div className="text-center md:text-left">
              <h3 className="font-serif text-3xl text-secondary-foreground mb-2">Rejoins le Club Waw ! 🎈</h3>
              <p className="text-gray-600 font-medium">Des coloriages gratuits et des promos magiques.</p>
           </div>
           <div className="flex w-full md:w-auto gap-3">
              <Input placeholder="Ton email..." className="bg-white border-none h-14 rounded-2xl text-lg px-6 shadow-sm w-full md:w-80" />
              <Button className="h-14 rounded-2xl px-8 bg-secondary text-secondary-foreground font-bold hover:bg-secondary/80 text-lg shadow-sm">
                Hop !
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 text-center md:text-left">
          <div className="space-y-4 flex flex-col items-center md:items-start">
            <h3 className="font-serif text-3xl font-bold text-primary rotate-[-3deg]">WawBook</h3>
            <p className="text-gray-500 font-medium leading-relaxed max-w-xs">
              L'atelier de livres magiques pour les enfants extraordinaires (comme le vôtre !).
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" size="icon" className="rounded-full border-2 border-gray-100 hover:bg-primary/10 hover:text-primary hover:border-primary/20 w-12 h-12">
                <Instagram className="h-6 w-6" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full border-2 border-gray-100 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-100 w-12 h-12">
                <Facebook className="h-6 w-6" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full border-2 border-gray-100 hover:bg-pink-50 hover:text-pink-500 hover:border-pink-100 w-12 h-12">
                <Mail className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-black text-lg mb-6 text-gray-800 uppercase tracking-wider">La Boutique</h4>
            <ul className="space-y-3 text-gray-500 font-medium text-lg">
              <li><a href="#" className="hover:text-primary transition-colors">Tous les livres</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Bébés (0-3 ans)</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Grands (4-8 ans)</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cartes Cadeaux</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-lg mb-6 text-gray-800 uppercase tracking-wider">WawBook & Co</h4>
            <ul className="space-y-3 text-gray-500 font-medium text-lg">
              <li><a href="#" className="hover:text-primary transition-colors">Notre Mission</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Écologie 🌱</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Avis Parents</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Presse</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-lg mb-6 text-gray-800 uppercase tracking-wider">Aide</h4>
            <ul className="space-y-3 text-gray-500 font-medium text-lg">
              <li><Link href="/help/FAQ" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/help/Contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/help/Service client" className="hover:text-primary transition-colors">Service client</Link></li>
              <li><Link href="/help/Mentions légales" className="hover:text-primary transition-colors">Mentions légales</Link></li>
            </ul>
          </div>
        </div>

        {/* Payment Badges Section */}
        <div className="pt-8 border-t-2 border-dashed border-gray-100 flex flex-col items-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">Paiements sécurisés</p>
            <PaymentBadges size="small" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400 font-medium">
          <p>&copy; {new Date().getFullYear()} WawBook. Fait avec ❤️ et de la poussière d'étoiles.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary">Confidentialité</a>
            <a href="#" className="hover:text-primary">CGV</a>
            <a href="/admin" className="hover:text-primary text-xs opacity-50" target="_blank">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
