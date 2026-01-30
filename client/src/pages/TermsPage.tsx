import React from 'react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { FileText } from 'lucide-react';

const TermsPage = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 pt-32 pb-20">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-8 h-8 text-cloud-blue" />
            <h1 className="font-display font-black text-3xl md:text-4xl text-stone-900">
              Conditions Générales d'Utilisation
            </h1>
          </div>

          <div className="prose prose-stone max-w-none">
            <p className="text-stone-600 text-lg mb-8">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">1. Objet</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du site web et des services proposés par notre plateforme de création de livres personnalisés.
              </p>
              <p className="text-stone-700 leading-relaxed">
                En accédant à notre site et en utilisant nos services, vous acceptez sans réserve les présentes CGU.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">2. Services proposés</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Notre plateforme permet aux utilisateurs de :
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>Créer des livres personnalisés pour enfants</li>
                <li>Personnaliser les personnages, histoires et illustrations</li>
                <li>Commander l'impression et la livraison de leurs créations</li>
                <li>Gérer leur compte et suivre leurs commandes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">3. Création de compte</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Pour accéder à certains services, vous devez créer un compte en fournissant des informations exactes et à jour.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toutes les activités effectuées sous votre compte.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">4. Commandes et paiement</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Toutes les commandes passées sur notre site sont soumises à acceptation et à disponibilité.
              </p>
              <p className="text-stone-700 leading-relaxed mb-4">
                Les prix sont indiqués en euros (€) toutes taxes comprises (TTC). Le paiement s'effectue de manière sécurisée via notre prestataire de paiement Stripe.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Une fois la commande validée et le paiement accepté, vous recevrez un email de confirmation avec votre numéro de commande.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">5. Livraison</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Les délais de livraison sont indiqués à titre indicatif lors de la commande. Nous mettons tout en œuvre pour respecter ces délais.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Les frais de livraison sont calculés en fonction de la destination et du mode de livraison choisi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">6. Droit de rétractation</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Conformément à la législation en vigueur, vous disposez d'un délai de 14 jours à compter de la réception de votre commande pour exercer votre droit de rétractation.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Toutefois, les livres personnalisés étant fabriqués sur mesure selon vos spécifications, le droit de rétractation ne peut s'appliquer qu'en cas de défaut de fabrication ou d'erreur de notre part.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">7. Propriété intellectuelle</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Tous les contenus présents sur notre site (textes, images, logos, graphismes) sont protégés par les droits de propriété intellectuelle.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Vous conservez les droits sur les contenus personnalisés que vous créez. Nous nous réservons le droit d'utiliser les créations à des fins de promotion avec votre accord préalable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">8. Responsabilité</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Nous nous efforçons d'assurer l'exactitude et la mise à jour des informations diffusées sur notre site, mais ne pouvons garantir l'absence d'erreurs.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Notre responsabilité ne saurait être engagée en cas de force majeure ou de fait indépendant de notre volonté.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">9. Modification des CGU</h2>
              <p className="text-stone-700 leading-relaxed">
                Nous nous réservons le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur le site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">10. Contact</h2>
              <p className="text-stone-700 leading-relaxed">
                Pour toute question concernant ces conditions générales, vous pouvez nous contacter à l'adresse : <a href="mailto:contact@votresite.com" className="text-cloud-blue hover:underline font-medium">contact@votresite.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsPage;
