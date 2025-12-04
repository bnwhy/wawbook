import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import coverAdventure from "@assets/generated_images/adventure_book_cover.png";
import coverBedtime from "@assets/generated_images/bedtime_book_cover.png";
import coverSearch from "@assets/generated_images/search_and_find_book_cover.png";

const books = [
  {
    id: 1,
    title: "L'Aventure Magique",
    description: "Un voyage à travers la forêt enchantée !",
    image: coverAdventure,
    price: "29,99 €",
    badge: "Coup de ❤️",
    age: "3-7 ans",
    color: "bg-secondary/20 border-secondary/40"
  },
  {
    id: 2,
    title: "Dodo, Petit Ange",
    description: "L'histoire douce pour faire de beaux rêves.",
    image: coverBedtime,
    price: "24,99 €",
    badge: "Nouveau ✨",
    age: "0-4 ans",
    color: "bg-accent/20 border-accent/40"
  },
  {
    id: 3,
    title: "Où es-tu ?",
    description: "Cherche et trouve ton personnage partout !",
    image: coverSearch,
    price: "34,99 €",
    badge: "Rigolo 🎈",
    age: "4-8 ans",
    color: "bg-primary/10 border-primary/30"
  }
];

export function ProductGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-serif text-primary mb-4 drop-shadow-sm">Nos Histoires Favorites</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium">
            Choisis ton livre préféré et commence la personnalisation !
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {books.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className={`h-full border-4 shadow-none hover:shadow-xl transition-all duration-300 overflow-hidden group rounded-[2rem] ${book.color}`}>
                <div className="relative aspect-[4/3] overflow-hidden p-6 flex items-center justify-center">
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-white text-foreground font-black text-sm px-3 py-1 shadow-sm border-2 border-gray-100 rounded-full transform rotate-3 group-hover:rotate-6 transition-transform">
                      {book.badge}
                    </Badge>
                  </div>
                  <img 
                    src={book.image} 
                    alt={book.title}
                    className="w-3/4 h-auto shadow-lg rounded-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-6 bg-white/50 backdrop-blur-sm">
                  <div className="inline-block px-3 py-1 rounded-lg bg-white border-2 border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    {book.age}
                  </div>
                  <h3 className="text-3xl font-serif text-foreground mb-2 leading-tight">
                    {book.title}
                  </h3>
                  <p className="text-gray-500 font-medium leading-relaxed mb-4 text-lg">
                    {book.description}
                  </p>
                  <div className="font-serif text-2xl text-primary">
                    {book.price}
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0 bg-white/50 backdrop-blur-sm">
                  <Button className="w-full rounded-2xl font-bold h-14 text-lg bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-sm transition-colors">
                    Personnaliser !
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button variant="ghost" size="lg" className="rounded-full px-10 h-14 text-xl font-serif text-gray-400 hover:text-primary hover:bg-primary/5">
            Voir toute la bibliothèque →
          </Button>
        </div>
      </div>
    </section>
  );
}
