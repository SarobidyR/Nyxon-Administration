import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useRedirectIfAuthenticated } from '../../hooks/useAuth';
import useAuthStore from '../../store/authStore';

// ── Validation ────────────────────────────────────────────────
const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export default function Login() {
  useRedirectIfAuthenticated('/');

  const login    = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    const result = await login(email, password);
    if (!result.success) {
      setServerError(result.message || 'Identifiants incorrects');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* ── Panneau gauche — branding ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden
                      bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800
                      flex-col items-center justify-center p-16">

        {/* Grille décorative subtile */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Accent lumineux */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96
                        bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Contenu branding */}
        <div className="relative z-10 text-center">
          {/* Logo */}
          {/* <div className="inline-flex items-center justify-center
                          w-20 h-20 rounded-2xl bg-sky-500 mb-8
                          shadow-lg shadow-sky-500/30">
            <span className="text-3xl font-black text-white tracking-tighter">N</span>
          </div> */}
          <div className="w-50 h-50 overflow-hidden flex items-center justify-center flex-shrink-0">
            <img 
              src="/icone SITE blanc0.5.svg"
              alt="Logo" 
              className="w-full h-full object-cover" 
            />
          </div> 


          <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
            Nyxon Administration
          </h1>
          <p className="text-gray-400 text-lg mb-12">
            Gestion de boutique & stock
          </p>

          {/* Features list */}
          <div className="space-y-4 text-left">
            {[
              { label: 'Catalogue & stock en temps réel' },
              { label: 'Commandes & précommandes'        },
              { label: 'KPIs & prévisions de ventes'     },
              { label: 'Gestion des budgets Ads'         },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-sky-500/20
                                border border-sky-500/40 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-sky-400" />
                </div>
                <span className="text-gray-300 text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer branding */}
        <p className="absolute bottom-8 text-gray-600 text-xs">
          © {new Date().getFullYear()} Nyxon — tous droits réservés
        </p>
      </div>

      {/* ── Panneau droit — formulaire ────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-950">
        <div className="w-full max-w-sm">

          {/* En-tête mobile */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center
                            w-14 h-14 rounded-xl bg-sky-500 mb-4">
              <span className="text-2xl font-black text-white">N</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Nyxon</h1>
          </div>

          {/* Titre formulaire */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">
              Connexion
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Accédez à votre espace de gestion
            </p>
          </div>

          {/* Erreur serveur */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3
                            bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{serverError}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Adresse email
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                className={`
                  w-full px-4 py-2.5 rounded-lg text-sm
                  bg-gray-900 border text-white placeholder-gray-600
                  outline-none transition-all duration-150
                  focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500
                  ${errors.email
                    ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500'
                    : 'border-gray-800 hover:border-gray-700'}
                `}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`
                    w-full px-4 py-2.5 pr-11 rounded-lg text-sm
                    bg-gray-900 border text-white placeholder-gray-600
                    outline-none transition-all duration-150
                    focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500
                    ${errors.password
                      ? 'border-red-500/60 focus:ring-red-500/30 focus:border-red-500'
                      : 'border-gray-800 hover:border-gray-700'}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye    className="w-4 h-4" />
                  }
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Bouton submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full flex items-center justify-center gap-2
                px-4 py-2.5 rounded-lg text-sm font-medium
                bg-sky-500 text-white
                hover:bg-sky-400 active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 mt-2
                shadow-lg shadow-sky-500/20
              "
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30
                                  border-t-white rounded-full animate-spin" />
                  <span>Connexion…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Séparateur */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-xs text-gray-600 text-center">
              Accès réservé au personnel autorisé.
              <br />Contactez un administrateur pour créer un compte.
            </p>
          </div>

          {/* Badge version */}
          <div className="mt-8 flex justify-center">
            <span className="text-xs text-gray-700 px-3 py-1
                             bg-gray-900 border border-gray-800 rounded-full">
              v1.0 — Phase 1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
