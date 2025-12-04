import { Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Footer() {
  return (
    <footer className="bg-blue-50/50 pt-16 pb-8 border-t border-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-primary">WawaBook</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nous créons des livres personnalisés qui font des enfants les héros de leurs propres histoires. Imprimés sur du papier 100% recyclé.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/5">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/5">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary hover:bg-primary/5">
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-primary">Boutique</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Tous les livres</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Nouveaux-nés</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Frères et sœurs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cherche et trouve</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cartes cadeaux</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-primary">À propos</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Notre histoire</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Durabilité</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Impact social</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Carrières</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-primary">Restez informé</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Inscrivez-vous pour recevoir des offres spéciales et des nouvelles magiques.
            </p>
            <div className="flex gap-2">
              <Input placeholder="Votre email" className="bg-white border-transparent shadow-sm focus-visible:ring-primary" />
              <Button className="bg-primary hover:bg-primary/90">Rejoindre</Button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} WawaBook. Tous droits réservés.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary">Politique de confidentialité</a>
            <a href="#" className="hover:text-primary">Conditions d'utilisation</a>
            <a href="#" className="hover:text-primary">Mentions légales</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
