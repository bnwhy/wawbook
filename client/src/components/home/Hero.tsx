import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImage from "@assets/generated_images/whimsical_child_reading_magic_book.png";
import { ArrowRight, Star } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fcfaf6] pt-12 pb-24 md:pt-20 md:pb-32">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
          
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-yellow-700 text-xs font-bold uppercase tracking-wider mb-6">
                <Star className="w-3 h-3 fill-current" />
                Over 1 Million Books Sold
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-primary leading-[1.1] mb-6">
                The most personal <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-600">children's books</span>
                <br/> in the world.
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto md:mx-0 leading-relaxed">
                Create a unique story where your child is the hero. 
                Customized appearance, name, and a magical adventure they'll cherish forever.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button size="lg" className="rounded-full text-lg h-14 px-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
                  Create your book
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-full text-lg h-14 px-8 border-2 hover:bg-primary/5">
                  View all stories
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="User" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex text-yellow-400">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                  </div>
                  <span>4.9/5 from happy parents</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Hero Image */}
          <div className="flex-1 relative w-full max-w-lg md:max-w-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10"
            >
              {/* Blob Background Shape */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-pink-100 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] blur-3xl opacity-60 -z-10 animate-pulse" />
              
              <img 
                src={heroImage} 
                alt="Child reading a magical book" 
                className="w-full h-auto rounded-3xl shadow-2xl transform md:rotate-2 hover:rotate-0 transition-transform duration-500"
              />
              
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 md:bottom-10 md:-left-10 bg-white p-4 rounded-2xl shadow-xl max-w-[200px] rotate-[-6deg]">
                <p className="font-serif text-primary font-bold text-lg leading-tight">"Best gift ever!"</p>
                <p className="text-xs text-muted-foreground mt-1">- Sarah, Mom of 2</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Wave Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[60px]">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="#ffffff"></path>
        </svg>
      </div>
    </section>
  );
}
