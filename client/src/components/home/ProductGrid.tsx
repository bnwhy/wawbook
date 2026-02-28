import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useBooks } from "../../context/BooksContext";
import { BookOpen } from "lucide-react";
import { formatPrice, getMinCoverPrice } from "../../utils/formatPrice";
import BookCover3D from "../BookCover3D";

export function ProductGrid() {
  const { books } = useBooks();

  if (books.length === 0) {
    return (
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-serif text-primary mb-4 drop-shadow-sm">Nos Histoires Favorites</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium">
              Les livres arrivent bientôt...
            </p>
          </div>
          <div className="flex justify-center">
            <div className="text-center p-12 bg-gray-50 rounded-3xl">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">Aucun livre disponible pour le moment</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
          {books.slice(0, 3).map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full border-4 shadow-none hover:shadow-xl transition-all duration-300 overflow-hidden group rounded-[2rem] bg-secondary/20 border-secondary/40">
                <div className="relative aspect-square overflow-visible p-6 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
                  {book.coverImage ? (
                    <div className="w-3/4">
                      <BookCover3D 
                        imageUrl={book.coverImage} 
                        alt={book.name}
                      />
                    </div>
                  ) : (
                    <div className="w-3/4 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <CardContent className="p-6 bg-white/50 backdrop-blur-sm">
                  <h3 className="text-3xl font-serif text-foreground mb-2 leading-tight">
                    {book.name}
                  </h3>
                  <p className="text-gray-500 font-medium leading-relaxed mb-4 text-lg">
                    {book.description || "Une histoire personnalisée pour votre enfant"}
                  </p>
                  <div className="font-serif text-2xl text-primary">
                    {(() => { const { price, hasMultiple } = getMinCoverPrice(book); return (hasMultiple ? 'À partir de ' : '') + formatPrice(price); })()}
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
          <Button variant="ghost" size="lg" className="rounded-lg px-10 h-14 text-xl font-serif text-gray-400 hover:text-primary hover:bg-primary/5">
            Voir toute la bibliothèque
          </Button>
        </div>
      </div>
    </section>
  );
}
