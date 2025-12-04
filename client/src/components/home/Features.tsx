import { Pencil, BookOpen, Gift, Smile } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Pencil,
    title: "Je Crée",
    description: "Entre ton prénom et choisis ton look (cheveux, yeux, habits...)."
  },
  {
    icon: BookOpen,
    title: "Je Lis",
    description: "Découvre ton livre en entier à l'écran, c'est magique !"
  },
  {
    icon: Gift,
    title: "Je Reçois",
    description: "On imprime ton livre avec amour et on l'envoie chez toi."
  },
  {
    icon: Smile,
    title: "Je Souris",
    description: "Le plus beau des cadeaux pour des souvenirs éternels."
  }
];

export function Features() {
  return (
    <section className="py-24 bg-[#f0fdf4] relative overflow-hidden">
      
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 text-secondary/20 font-serif text-9xl opacity-50 pointer-events-none select-none rotate-[-15deg]">1</div>
      <div className="absolute bottom-10 right-10 text-primary/10 font-serif text-9xl opacity-50 pointer-events-none select-none rotate-[15deg]">2</div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-serif text-secondary-foreground mb-6">C'est super facile !</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            Quelques clics suffisent pour créer un livre unique.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="flex flex-col items-center text-center relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-1 bg-dashed border-t-4 border-dashed border-gray-200 -z-10"></div>
              )}
              
              <div className="w-24 h-24 rounded-3xl bg-white shadow-[8px_8px_0_rgba(0,0,0,0.05)] flex items-center justify-center mb-8 text-primary relative group hover:scale-110 transition-transform duration-300 border-4 border-white">
                <step.icon className={`w-10 h-10 ${index % 2 === 0 ? 'text-primary' : 'text-secondary-foreground'}`} strokeWidth={2.5} />
                <div className={`absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg shadow-sm border-4 border-white ${index % 2 === 0 ? 'bg-primary' : 'bg-secondary'}`}>
                  {index + 1}
                </div>
              </div>
              <h3 className="text-2xl font-serif text-gray-700 mb-3">{step.title}</h3>
              <p className="text-gray-500 font-medium leading-relaxed px-2">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Wavy Bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
         <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[40px] fill-white">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
        </svg>
      </div>
    </section>
  );
}
