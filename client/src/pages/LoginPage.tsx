import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Lock, Mail, Loader2, Package, BookOpen, Cloud, Eye, EyeOff } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const LoginPage = () => {
  const { login } = useAuth();
  const [location, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get redirect path from URL
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const redirectPath = searchParams.get('redirect') || '/account';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Échec de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(redirectPath)}`;
  };

  const handleAppleLogin = () => {
    window.location.href = `/api/auth/apple?returnTo=${encodeURIComponent(redirectPath)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 flex relative min-h-[calc(100vh-80px)]">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cloud-lightest to-cloud-lighter p-12 pt-32 flex-col justify-center items-center relative overflow-hidden">
          {/* Top Wave Divider */}
          <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0] rotate-180">
            <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[50px] fill-white/30">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
          </div>
          
          {/* Bottom Wave Divider */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
            <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[50px] fill-white/30">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
            </svg>
          </div>
          <div className="max-w-lg w-full text-center">
            <h2 className="font-display font-black text-4xl md:text-5xl text-cloud-dark leading-tight mb-6">
              Bienvenue<br />au nuage<span className="text-cloud-blue relative inline-block">club
                <svg className="absolute w-full h-4 -bottom-1 left-0 text-accent-sun opacity-100" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-cloud-dark/70 font-medium mb-8 leading-relaxed max-w-2xl mx-auto">
              Le club de ceux qui créent des histoires magiques et personnalisées
            </p>
            
            {/* Social Proof - Remonté */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <span className="flex items-center gap-2 bg-white/60 px-5 py-2.5 rounded-full text-sm font-bold text-cloud-dark/70 shadow-sm border border-accent-mint/20">
                <Package size={18} className="text-accent-mint" /> 1M+ Livres créés
              </span>
              <span className="flex items-center gap-2 bg-white/60 px-5 py-2.5 rounded-full text-sm font-bold text-cloud-dark/70 shadow-sm border border-accent-mint/20">
                <BookOpen size={18} className="text-accent-mint" /> 4.9/5 Satisfaction
              </span>
            </div>
            
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
                  <BookOpen className="w-6 h-6 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-0.5">Promotions exclusives</h3>
                  <p className="text-cloud-dark/60 text-sm leading-relaxed">Recevez des offres personnalisées</p>
                </div>
              </div>
            </div>

            {/* Nuages flottants subtils */}
            <div className="relative h-32 mb-10 flex items-center justify-center">
              <style>{`
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-12px); }
                }
                @keyframes float-delayed {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-15px); }
                }
                @keyframes float-slow {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-8px); }
                }
              `}</style>
              
              {/* Nuage gauche */}
              <div className="absolute left-8 opacity-20 blur-[0.5px]" style={{ animation: 'float 6s ease-in-out infinite' }}>
                <Cloud size={60} fill="white" strokeWidth={0} />
              </div>
              
              {/* Nuage central */}
              <div className="opacity-30 blur-[0.5px]" style={{ animation: 'float-delayed 7s ease-in-out infinite' }}>
                <Cloud size={80} fill="white" strokeWidth={0} />
              </div>
              
              {/* Nuage droit */}
              <div className="absolute right-8 opacity-20 blur-[0.5px]" style={{ animation: 'float-slow 8s ease-in-out infinite' }}>
                <Cloud size={55} fill="white" strokeWidth={0} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white">
          <div className="flex-1 flex items-center justify-center p-6 pt-32 lg:p-12 lg:pt-32">
            <div className="w-full max-w-md">
              <div className="mb-10 text-center">
                <h1 className="font-display font-black text-3xl lg:text-4xl text-stone-900 mb-3">
                  Se connecter
                </h1>
                <p className="text-stone-600 text-lg">
                  Accédez à votre espace client
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              {/* OAuth Buttons */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-stone-300 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continuer avec Google
                </button>

                <button
                  type="button"
                  onClick={handleAppleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-stone-300 rounded-lg hover:border-stone-400 hover:bg-stone-50 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="black">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continuer avec Apple
                </button>
              </div>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-stone-200"></div>
                <span className="text-stone-500 text-sm">ou</span>
                <div className="flex-1 h-px bg-stone-200"></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-stone-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Mail size={20} className="text-stone-400" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock size={20} className="text-stone-400" />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-11 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <Link href="/forgot-password" className="text-cloud-blue hover:underline font-medium">
                    Mot de passe oublié ?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cloud-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-cloud-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <p className="text-stone-600">
                  Pas encore de compte ?{' '}
                  <Link href="/signup" className="text-cloud-blue hover:underline font-bold">
                    S'inscrire
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

export default LoginPage;
