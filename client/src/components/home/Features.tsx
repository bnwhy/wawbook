import { Pencil, BookOpen, Gift, Smile } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Pencil,
    title: "Configurer",
    description: "Entrez le prénom de l'enfant et choisissez son apparence (cheveux, peau, yeux, etc.)."
  },
  {
    icon: BookOpen,
    title: "Prévisualiser",
    description: "Lisez le livre entier en ligne gratuitement avant d'acheter. Pas de surprises."
  },
  {
    icon: Gift,
    title: "Commander",
    description: "Nous imprimons votre livre sur du papier écologique et l'expédions sous 3 jours."
  },
  {
    icon: Smile,
    title: "Sourire",
    description: "Regardez leurs yeux s'illuminer lorsqu'ils se voient dans l'histoire."
  }
];

export function Features() {
  return (
    <section className="py-20 bg-blue-50/50 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">Comment ça marche</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Créer un cadeau magique est plus facile que vous ne le pensez.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center mb-6 text-primary relative group hover:scale-110 transition-transform duration-300 border border-blue-100">
                <step.icon className="w-10 h-10" strokeWidth={1.5} />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-sm shadow-sm border-2 border-white">
                  {index + 1}
                </div>
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed px-4">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
