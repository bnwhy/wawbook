import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroBg from "@assets/generated_images/pastel_hero_background_wawbook.png";
import { Sparkles, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fffdf5] pt-10 pb-20 md:pt-16 md:pb-28">
      
      {/* Pastel Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] bg-accent/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left order-2 md:order-1">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-secondary/30 text-secondary-foreground text-sm font-bold uppercase tracking-wider mb-6 shadow-sm transform -rotate-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                Magie Garantie 100%
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-primary drop-shadow-sm leading-[0.9] mb-6">
                Des histoires <br/>
                <span className="text-secondary-foreground relative">
                  extraordinaires
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-secondary/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h1>
              
              <p className="text-xl text-gray-500 mb-8 max-w-lg mx-auto md:mx-0 font-medium leading-relaxed">
                Transformez votre enfant en héros de son propre conte de fées ! 
                <br className="hidden md:block"/> 
                Un cadeau doux, coloré et inoubliable.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button size="lg" className="rounded-3xl text-xl h-16 px-10 bg-primary hover:bg-primary/90 text-white font-serif shadow-[0_8px_0_rgb(219,112,147)] hover:shadow-[0_4px_0_rgb(219,112,147)] hover:translate-y-[4px] transition-all active:shadow-none active:translate-y-[8px]">
                  Je crée mon livre !
                </Button>
              </div>
              
              <div className="mt-10 flex items-center justify-center md:justify-start gap-3">
                 <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 rotate-1">
                    <div className="flex -space-x-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-white overflow-hidden bg-gray-100">
                          <img src={`https://ui-avatars.com/api/?name=Kid+${i}&background=random&color=fff`} alt="Kid" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-gray-400">Déjà 50,000+ <br/>enfants heureux</p>
                 </div>
              </div>
            </motion.div>
          </div>

          {/* Hero Image */}
          <div className="flex-1 relative w-full max-w-lg md:max-w-none order-1 md:order-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
              className="relative z-10"
            >
              <div className="absolute top-0 right-0 w-full h-full bg-accent rounded-[3rem] rotate-6 -z-10 transform translate-x-4 translate-y-4"></div>
              <img 
                src={heroBg} 
                alt="NuageBook World" 
                className="w-full h-auto rounded-[3rem] border-8 border-white shadow-xl object-cover aspect-square"
              />
              
              {/* Sticker Badge */}
              <div className="absolute -bottom-4 -left-4 bg-yellow-200 text-yellow-800 p-4 rounded-full w-28 h-28 flex flex-col items-center justify-center text-center shadow-lg rotate-[-12deg] border-4 border-white font-serif leading-tight z-20 animate-bounce-slow">
                <span className="text-3xl font-bold">top</span>
                <span className="text-sm font-bold">CADEAU</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Cloud Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
         <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[50px] fill-white">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
        </svg>
      </div>
    </section>
  );
}
