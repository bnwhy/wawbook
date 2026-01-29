import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { User, Mail, Phone, ArrowLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

const AccountProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/customers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Échec de la mise à jour');
      }

      await refreshUser();
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Navigation onStart={() => setLocation('/')} />
      <main className="flex-1 max-w-3xl mx-auto w-full p-6 pt-32 pb-20">
        <Link href="/account" className="inline-flex items-center gap-2 text-cloud-blue hover:underline font-bold mb-6">
          <ArrowLeft size={16} />
          Retour au compte
        </Link>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-stone-200">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-cloud-blue/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-cloud-blue" />
            </div>
            <div>
              <h1 className="font-display font-black text-3xl text-stone-900">
                Mon Profil
              </h1>
              <p className="text-stone-600">Gérez vos informations personnelles</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-bold text-stone-700 mb-2">
                  Prénom
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-bold text-stone-700 mb-2">
                  Nom
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-stone-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg bg-stone-100 text-stone-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-stone-500 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-stone-700 mb-2">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-cloud-blue text-white font-bold py-3 px-6 rounded-lg hover:bg-cloud-deep transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AccountProfilePage;
