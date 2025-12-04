import { Link } from "wouter";
import { Search, ShoppingBag, Menu, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import logoImage from "@assets/generated_images/wawbook_logo_pastel_playful.png";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b-2 border-dashed border-primary/20 bg-white/90 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 text-primary hover:bg-primary/10 rounded-full">
                <Menu className="h-7 w-7" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#fffdf5]">
              <div className="flex flex-col gap-6 mt-8 font-serif text-xl text-foreground">
                <Link href="/books" className="hover:text-primary transition-colors">Nos Livres</Link>
                <Link href="/gifts" className="hover:text-primary transition-colors">Cadeaux</Link>
                <Link href="/about" className="hover:text-primary transition-colors">L'Atelier</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center md:justify-start">
          <Link href="/">
            <a className="flex items-center gap-3 group transition-transform hover:scale-105 duration-300">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/30 bg-white p-1 shadow-sm">
                 <img src={logoImage} alt="WawBook Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-serif text-4xl text-primary drop-shadow-sm tracking-wide">
                WawBook
              </span>
            </a>
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 bg-white/50 px-8 py-2 rounded-full border border-secondary/30 shadow-sm">
          <Link href="/books">
            <a className="text-base font-bold text-gray-600 hover:text-primary transition-colors font-sans">Nos Livres</a>
          </Link>
          <Link href="/gifts">
            <a className="text-base font-bold text-gray-600 hover:text-secondary-foreground transition-colors font-sans">Cadeaux</a>
          </Link>
          <Link href="/about">
            <a className="text-base font-bold text-gray-600 hover:text-accent-foreground transition-colors font-sans">L'Atelier</a>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
            <Search className="h-6 w-6" strokeWidth={2.5} />
            <span className="sr-only">Recherche</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full hidden sm:flex transition-colors">
             <Heart className="h-6 w-6" strokeWidth={2.5} />
            <span className="sr-only">Favoris</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full relative transition-colors">
            <ShoppingBag className="h-6 w-6" strokeWidth={2.5} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-secondary border-2 border-white rounded-full"></span>
            <span className="sr-only">Panier</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
