import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { ProductGrid } from "@/components/home/ProductGrid";
import { Features } from "@/components/home/Features";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <Features />
        <ProductGrid />
        
        {/* Trust Section */}
        <section className="py-16 bg-primary text-primary-foreground text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-serif font-bold mb-8">Approuvé par les parents du monde entier</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-90 max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold mb-2">1M+</span>
                <span className="text-sm uppercase tracking-wider">Livres vendus</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold mb-2">30+</span>
                <span className="text-sm uppercase tracking-wider">Langues</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold mb-2">100%</span>
                <span className="text-sm uppercase tracking-wider">Papier recyclé</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold mb-2">4.9</span>
                <span className="text-sm uppercase tracking-wider">Score TrustPilot</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
