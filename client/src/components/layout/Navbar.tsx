import { Link } from "wouter";
import { Search, ShoppingBag, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/books" className="text-lg font-medium">Livres</Link>
                <Link href="/gifts" className="text-lg font-medium">Cadeaux</Link>
                <Link href="/about" className="text-lg font-medium">À propos</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <a className="flex items-center gap-2 group">
              {/* Simple text logo with a playful touch */}
              <span className="font-serif text-2xl font-bold text-primary tracking-tight group-hover:text-primary/90 transition-colors">
                WawaBook
                <span className="text-secondary inline-block transform -rotate-12 text-3xl leading-[0]">.</span>
              </span>
            </a>
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/books">
            <a className="text-sm font-medium hover:text-primary transition-colors">Livres</a>
          </Link>
          <Link href="/gifts">
            <a className="text-sm font-medium hover:text-primary transition-colors">Cadeaux</a>
          </Link>
          <Link href="/about">
            <a className="text-sm font-medium hover:text-primary transition-colors">À propos</a>
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
            <Search className="h-5 w-5" />
            <span className="sr-only">Recherche</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hidden sm:flex">
            <User className="h-5 w-5" />
            <span className="sr-only">Compte</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full"></span>
            <span className="sr-only">Panier</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
