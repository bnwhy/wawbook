import { Pencil, BookOpen, Gift, Smile } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Pencil,
    title: "Configure",
    description: "Enter the child's name and choose their appearance (hair, skin, eyes, etc.)."
  },
  {
    icon: BookOpen,
    title: "Preview",
    description: "Read the entire book online for free before you buy. No surprises."
  },
  {
    icon: Gift,
    title: "Order",
    description: "We print your book on eco-friendly paper and ship it within 3 days."
  },
  {
    icon: Smile,
    title: "Smile",
    description: "Watch their eyes light up when they see themselves in the story."
  }
];

export function Features() {
  return (
    <section className="py-20 bg-[#ebf4f7] relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 translate-y-1/2"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary mb-4">How it works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Creating a magical gift is easier than you think.
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
              <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center mb-6 text-primary relative group hover:scale-110 transition-transform duration-300">
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
