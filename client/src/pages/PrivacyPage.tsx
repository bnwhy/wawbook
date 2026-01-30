import React from 'react';
import { useLocation } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Shield } from 'lucide-react';

const PrivacyPage = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 pt-32 pb-20">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 md:p-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-cloud-blue" />
            <h1 className="font-display font-black text-3xl md:text-4xl text-stone-900">
              Politique de Confidentialité
            </h1>
          </div>

          <div className="prose prose-stone max-w-none">
            <p className="text-stone-600 text-lg mb-8">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">1. Introduction</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                La protection de vos données personnelles est une priorité pour nous. Cette politique de confidentialité explique quelles informations nous collectons, comment nous les utilisons et quels sont vos droits.
              </p>
              <p className="text-stone-700 leading-relaxed">
                En utilisant notre site, vous acceptez les pratiques décrites dans cette politique.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">2. Données collectées</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Nous collectons les informations suivantes :
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>Informations d'identification :</strong> nom, prénom, adresse email</li>
                <li><strong>Informations de livraison :</strong> adresse postale, numéro de téléphone</li>
                <li><strong>Informations de paiement :</strong> traitées de manière sécurisée par Stripe (nous ne stockons pas vos données bancaires)</li>
                <li><strong>Données de navigation :</strong> adresse IP, type de navigateur, pages visitées</li>
                <li><strong>Contenus créés :</strong> personnalisations et créations réalisées sur notre plateforme</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">3. Utilisation des données</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Vos données personnelles sont utilisées pour :
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>Traiter et livrer vos commandes</li>
                <li>Gérer votre compte client</li>
                <li>Vous envoyer des informations sur vos commandes</li>
                <li>Améliorer nos services et votre expérience utilisateur</li>
                <li>Vous envoyer des offres promotionnelles (avec votre consentement)</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">4. Partage des données</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Nous ne vendons ni ne louons vos données personnelles à des tiers.
              </p>
              <p className="text-stone-700 leading-relaxed mb-4">
                Nous pouvons partager vos données avec :
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li><strong>Prestataires de services :</strong> hébergement, paiement (Stripe), livraison</li>
                <li><strong>Imprimeurs :</strong> pour la fabrication de vos livres personnalisés</li>
                <li><strong>Autorités légales :</strong> si requis par la loi</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">5. Sécurité des données</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou destruction.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Les paiements sont sécurisés via Stripe, certifié PCI-DSS niveau 1 (le plus haut niveau de sécurité dans l'industrie des paiements).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">6. Conservation des données</h2>
              <p className="text-stone-700 leading-relaxed">
                Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services et respecter nos obligations légales. Les données de commande sont conservées conformément aux obligations comptables et fiscales.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">7. Vos droits</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-4">
                <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
                <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
                <li><strong>Droit de retirer votre consentement :</strong> à tout moment</li>
              </ul>
              <p className="text-stone-700 leading-relaxed">
                Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@votresite.com" className="text-cloud-blue hover:underline font-medium">privacy@votresite.com</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">8. Cookies</h2>
              <p className="text-stone-700 leading-relaxed mb-4">
                Notre site utilise des cookies pour améliorer votre expérience de navigation et analyser l'utilisation du site.
              </p>
              <p className="text-stone-700 leading-relaxed">
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais cela peut affecter certaines fonctionnalités du site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">9. Modifications</h2>
              <p className="text-stone-700 leading-relaxed">
                Nous pouvons modifier cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec une nouvelle date de mise à jour.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="font-display font-bold text-2xl text-stone-900 mb-4">10. Contact</h2>
              <p className="text-stone-700 leading-relaxed">
                Pour toute question concernant cette politique de confidentialité ou vos données personnelles, contactez-nous :
              </p>
              <ul className="list-none text-stone-700 space-y-2 mt-4">
                <li><strong>Email :</strong> <a href="mailto:privacy@votresite.com" className="text-cloud-blue hover:underline">privacy@votresite.com</a></li>
                <li><strong>Adresse :</strong> [Votre adresse]</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPage;
