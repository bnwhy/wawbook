import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'wouter';
import { Link } from 'wouter';
import { Lock, Mail, Loader2, Package, Zap, BookOpen, Cloud } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

const LoginPage = () => {
  const { login } = useAuth();
  const [location, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    // Store return path before redirecting to Google
    window.location.href = `/api/auth/google?returnTo=${encodeURIComponent(redirectPath)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navigation onStart={() => setLocation('/')} />
      
      <main className="flex-1 flex pt-20">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-brand-cream p-12 flex-col justify-center relative">
          <div className="max-w-md">
            <h2 className="font-display font-black text-4xl text-cloud-dark mb-4">
              Bienvenue au club<br />NuageBook
            </h2>
            <p className="text-cloud-dark/70 text-lg mb-8">
              Le club de ceux qui créent des histoires magiques et personnalisées
            </p>
            
            <div className="space-y-4 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-cloud-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-1">Suivez vos commandes</h3>
                  <p className="text-cloud-dark/60 text-sm">Suivi en temps réel de toutes vos créations</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-cloud-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-1">Checkout ultra-rapide</h3>
                  <p className="text-cloud-dark/60 text-sm">Passez commande en 2 clics seulement</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-cloud-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-cloud-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-cloud-dark mb-1">Bibliothèque personnelle</h3>
                  <p className="text-cloud-dark/60 text-sm">Retrouvez tous vos livres personnalisés</p>
                </div>
              </div>
            </div>
            
            {/* Social Proof */}
            <div className="flex gap-8">
              <div>
                <div className="font-black text-4xl text-cloud-blue">1M+</div>
                <div className="text-cloud-dark/50 text-sm">Livres créés</div>
              </div>
              <div>
                <div className="font-black text-4xl text-cloud-blue">4.9/5</div>
                <div className="text-cloud-dark/50 text-sm">Satisfaction</div>
              </div>
              <div>
                <div className="font-black text-4xl text-cloud-blue">50K+</div>
                <div className="text-cloud-dark/50 text-sm">Clients heureux</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <h1 className="font-display font-black text-3xl text-stone-900 mb-2">
                  Me connecter
                </h1>
                <p className="text-stone-600">
                  Accédez à votre espace client
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
                onClick={handleGoogleLogin}
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
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-stone-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
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
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-11 pr-4 py-3 border border-stone-300 rounded-lg focus:border-cloud-blue focus:ring-1 focus:ring-cloud-blue outline-none transition-shadow"
                      placeholder="••••••••"
                    />
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
