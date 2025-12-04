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
    title: "The Great Adventure",
    description: "A journey through the magical forest where your child meets woodland friends.",
    image: coverAdventure,
    price: "$29.99",
    badge: "Bestseller",
    age: "3-7 years"
  },
  {
    id: 2,
    title: "Goodnight, Little One",
    description: "The perfect bedtime story to lull your little hero into a peaceful sleep.",
    image: coverBedtime,
    price: "$24.99",
    badge: "New",
    age: "0-4 years"
  },
  {
    id: 3,
    title: "World Search & Find",
    description: "Can you find yourself? A global adventure across 10 different countries.",
    image: coverSearch,
    price: "$34.99",
    badge: "Top Rated",
    age: "4-8 years"
  }
];

export function ProductGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">Favorite Stories</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our most loved personalized books, ready for your child to star in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {books.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="h-full border-none shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group bg-[#fcfaf6]">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/20 p-8 flex items-center justify-center">
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary font-bold shadow-sm">
                      {book.badge}
                    </Badge>
                  </div>
                  <img 
                    src={book.image} 
                    alt={book.title}
                    className="w-3/4 h-auto shadow-xl rounded-sm transform group-hover:scale-105 group-hover:-rotate-2 transition-transform duration-500"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{book.age}</div>
                  <h3 className="text-2xl font-serif font-bold text-primary mb-2 group-hover:text-blue-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    {book.description}
                  </p>
                  <div className="font-bold text-lg text-primary">
                    {book.price}
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button className="w-full rounded-full font-bold h-12 text-base bg-primary hover:bg-primary/90">
                    Personalize Now
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Button variant="outline" size="lg" className="rounded-full px-8 h-12 border-2 text-primary border-primary/20 hover:border-primary hover:bg-transparent">
            See all books
          </Button>
        </div>
      </div>
    </section>
  );
}
