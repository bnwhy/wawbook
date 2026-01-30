import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, Link } from 'wouter';
import { UserPlus, Mail, Lock, Phone, Loader2, Package, Zap, BookOpen, Cloud } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const SignupPage = () => {
  const { signup } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions générales');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
      setLocation('/account');
    } catch (err: any) {
      setError(err.message || 'Échec de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google?returnTo=/account';
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream relative overflow-hidden">
      {/* Floating Clouds Background */}
      <div className="absolute top-32 left-10 text-white opacity-60 animate-float pointer-events-none z-0">
        <Cloud size={100} fill="currentColor" />
      </div>
      <div className="absolute top-52 right-20 text-white opacity-40 animate-float-delayed pointer-events-none z-0">
        <Cloud size={80} fill="currentColor" />
      </div>
      <div className="absolute bottom-20 left-1/4 text-white opacity-50 animate-float pointer-events-none z-0">
        <Cloud size={120} fill="currentColor" />
      </div>
      
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 flex pt-20 relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cloud-lightest to-cloud-lighter p-12 flex-col justify-center items-center relative">
          <div className="max-w-lg w-full text-center">
            <div className="flex items-center justify-center gap-4 mb-8">
              <h2 className="font-display font-black text-4xl md:text-5xl text-cloud-dark leading-tight">
                Rejoignez<br />le <span className="text-cloud-blue relative inline-block">
                  club
                  <svg className="absolute w-full h-4 -bottom-1 left-0 text-accent-sun opacity-100" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h2>
              
              {/* Logo du site à côté */}
              <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                  <g className="animate-[spin_10s_linear_infinite] origin-[75px_35px]">
                    <path d="M75 10 L75 20 M75 50 L75 60 M55 35 L45 35 M105 35 L95 35 M61 21 L68 28 M82 42 L89 49 M89 21 L82 28 M61 49 L68 42" stroke="#FCD34D" strokeWidth="4" strokeLinecap="round" />
                  </g>
                  <circle cx="75" cy="35" r="18" fill="#FCD34D" />
                  <path d="M20 70 C 10 70, 10 50, 30 50 C 30 30, 60 30, 60 50 C 70 40, 90 40, 90 60 C 90 80, 70 80, 60 80 L 30 80 C 10 80, 10 70, 20 70" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2" />
                  <g transform="translate(0, 2)">
                    <circle cx="45" cy="65" r="3" fill="white" />
                    <circle cx="65" cy="65" r="3" fill="white" />
                    <path d="M50 72 Q 55 78, 60 72" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="42" cy="70" r="3" fill="#FF9999" opacity="0.6" />
                    <circle cx="68" cy="70" r="3" fill="#FF9999" opacity="0.6" />
                  </g>
                </svg>
              </div>
            </div>
            
            <p className="text-xl md:text-2xl text-cloud-dark/70 font-medium mb-12 leading-relaxed max-w-2xl mx-auto">
              Le club de ceux qui créent des histoires magiques et personnalisées
            </p>
            
            <div className="space-y-6 mb-14 text-left max-w-md mx-auto">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cloud-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-0.5">Suivez vos commandes</h3>
                  <p className="text-cloud-dark/60 text-sm leading-relaxed">Suivi en temps réel de toutes vos créations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cloud-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-0.5">Checkout ultra-rapide</h3>
                  <p className="text-cloud-dark/60 text-sm leading-relaxed">Passez commande en 2 clics seulement</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cloud-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-0.5">Bibliothèque personnelle</h3>
                  <p className="text-cloud-dark/60 text-sm leading-relaxed">Retrouvez tous vos livres personnalisés</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-10 justify-center">
              <div className="text-center">
                <div className="font-black text-5xl text-cloud-blue">1M+</div>
                <div className="text-cloud-dark/50 text-sm font-medium">Livres créés</div>
              </div>
              <div className="text-center">
                <div className="font-black text-5xl text-cloud-blue">4.9/5</div>
                <div className="text-cloud-dark/50 text-sm font-medium">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="font-black text-5xl text-cloud-blue">50K+</div>
                <div className="text-cloud-dark/50 text-sm font-medium">Clients heureux</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white">
          <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-md py-8">
              <div className="mb-10 text-center">
                <h1 className="font-display font-black text-3xl lg:text-4xl text-stone-900 mb-3">
                  Je m'inscris !
                </h1>
                <p className="text-stone-600 text-lg">
                  Rejoignez-nous et profitez de tous les avantages
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-stone-300 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-colors font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuer avec Google
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-stone-200"></div>
                <span className="text-stone-500 text-sm">ou</span>
                <div className="flex-1 h-px bg-stone-200"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
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
                      required
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="Jean"
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
                      required
                      className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="Dupont"
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
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-bold text-stone-700 mb-2">
                    Téléphone <span className="text-stone-400 font-normal">(facultatif)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">Minimum 8 caractères</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-stone-700 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className="mt-1 rounded border-stone-300 text-cloud-blue focus:ring-cloud-blue"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-stone-600">
                    J'accepte les conditions générales d'utilisation et la politique de confidentialité
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cloud-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-cloud-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-stone-600">
                  Déjà un compte ?{' '}
                  <Link href="/login" className="text-cloud-blue hover:underline font-bold">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SignupPage;
