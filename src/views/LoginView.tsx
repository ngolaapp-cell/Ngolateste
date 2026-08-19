import React, { useState } from 'react';
import { Screen, UserProfile } from '../types';
import { OFFICIAL_LOGO_URL } from '../config/brand';
import { TransparentLogo } from '../components/TransparentLogo';
import { loginOrRegisterUser } from '../services/supabaseService';

interface LoginViewProps {
  onNavigate: (screen: Screen) => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Format Angolan phone numbers smoothly
  const handlePhoneChange = (val: string) => {
    setErrorMessage('');
    // Remove non-digit chars except +
    let cleaned = val.replace(/[^\d+]/g, '');
    setPhone(cleaned);
  };

  const validatePhone = (raw: string): { isValid: boolean; formatted: string } => {
    let digits = raw.replace(/\D/g, '');
    
    // Check for +244 or 244 prefix
    if (digits.startsWith('244')) {
      digits = digits.slice(3);
    }

    // Angolan mobile numbers are 9 digits, usually starting with 9 (91, 92, 93, 94, 95, 97, 99)
    if (digits.length === 9 && digits.startsWith('9')) {
      const formatted = `+244 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
      return { isValid: true, formatted };
    }

    // Generic international format with at least 8 digits
    if (digits.length >= 9) {
      return { isValid: true, formatted: raw.startsWith('+') ? raw : `+244 ${digits}` };
    }

    return { isValid: false, formatted: '' };
  };

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let finalPhone = '';
    let finalEmail = '';

    if (loginMethod === 'phone') {
      if (!phone.trim()) {
        setErrorMessage('Por favor, informe o seu número de telefone.');
        return;
      }

      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        setErrorMessage('Número de telefone inválido. Digite um número de Angola com 9 dígitos (ex: 923 361 877).');
        return;
      }
      finalPhone = phoneValidation.formatted;
      finalEmail = email.trim();
    } else {
      if (!email.trim()) {
        setErrorMessage('Por favor, informe o seu endereço de e-mail.');
        return;
      }

      if (!validateEmail(email)) {
        setErrorMessage('Endereço de e-mail inválido. Exemplo: seu.nome@gmail.com');
        return;
      }
      finalEmail = email.trim().toLowerCase();
      // Generate standard identifier if phone not specified
      finalPhone = phone.trim() ? phone.trim() : `email-${finalEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    setIsLoading(true);

    try {
      const candidateName = name.trim() || (finalEmail ? finalEmail.split('@')[0] : 'Candidato Ngola');
      
      // Save and register user in Supabase & LocalStorage
      const userProfile = await loginOrRegisterUser({
        phone: finalPhone,
        email: finalEmail,
        name: candidateName,
      });

      onLoginSuccess(userProfile);
      onNavigate('home');
    } catch (err: any) {
      console.error('Erro ao realizar login:', err);
      setErrorMessage(err?.message || 'Erro ao comunicar com a base de dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim() || !validateEmail(googleEmail)) {
      alert('Por favor, insira um e-mail do Google válido.');
      return;
    }

    setIsLoading(true);
    setShowGoogleModal(false);

    try {
      const candidateName = googleName.trim() || googleEmail.split('@')[0];
      const googlePhone = `google-${googleEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const userProfile = await loginOrRegisterUser({
        phone: googlePhone,
        email: googleEmail.trim().toLowerCase(),
        name: candidateName,
      });

      onLoginSuccess(userProfile);
      onNavigate('home');
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      setErrorMessage('Erro ao autenticar com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Back Button */}
      <div className="fixed top-0 left-0 p-6 z-20">
        <button
          onClick={() => onNavigate('home')}
          className="p-2.5 rounded-full text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer flex items-center justify-center bg-white shadow-sm border border-slate-200/60"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
      </div>

      {/* Main Content Box */}
      <main className="w-full max-w-md space-y-6 z-10">
        {/* Brand Header */}
        <header className="text-center space-y-2">
          {/* Logo Graphic */}
          <div className="flex justify-center mb-1">
            <div className="w-24 h-24 flex items-center justify-center">
              <TransparentLogo
                src={OFFICIAL_LOGO_URL}
                alt="NgolaTeste Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Ngola<span className="text-blue-600">Teste</span>
          </h1>

          <div className="space-y-1">
            <h2 className="font-extrabold text-slate-800 text-base sm:text-lg leading-snug px-2">
              Bem-vindo aos testes que garantem a tua vaga
            </h2>
            <p className="text-slate-500 font-medium text-xs">
              Informe os seus dados reais para sincronizar o seu progresso no sistema.
            </p>
          </div>
        </header>

        {/* Login Form Box */}
        <div className="p-6 md:p-8 rounded-3xl shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] border border-white bg-white space-y-5">
          {/* Method Selector Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('phone');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === 'phone'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">smartphone</span>
              <span>Telefone (+244)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                loginMethod === 'email'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-base">mail</span>
              <span>E-mail</span>
            </button>
          </div>

          {/* Validation Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-semibold animate-shake">
              <span className="material-symbols-outlined text-base text-red-500 flex-shrink-0 mt-0.5">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Candidate Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-bold text-slate-800 ml-1">
                Nome do Candidato <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-lg">person</span>
                </div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Manuel dos Santos"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-xs font-medium"
                />
              </div>
            </div>

            {/* Phone Input */}
            {loginMethod === 'phone' ? (
              <div className="space-y-1.5">
                <label htmlFor="phone" className="block text-xs font-bold text-slate-800 ml-1 flex items-center justify-between">
                  <span>Número de Telefone *</span>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Angola (+244)
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-lg">smartphone</span>
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="923 361 877 ou +244 9XX XXX XXX"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-xs font-medium ${
                      errorMessage && !phone ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 ml-1">
                  Ex: 923 361 877 (Será vinculado às estatísticas e ao Supabase).
                </p>
              </div>
            ) : (
              /* Email Input */
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-bold text-slate-800 ml-1">
                  Endereço de E-mail *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-lg">mail</span>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="exemplo@gmail.com"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-xs font-medium ${
                      errorMessage && !email ? 'border-red-400 bg-red-50/20' : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 ml-1">
                  Seu e-mail será registrado para sincronização com a base de dados.
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs cursor-pointer flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-75 cursor-wait' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>A sincronizar com o Supabase...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">login</span>
                  <span>Entrar no NgolaTeste</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ou
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={() => {
                setShowGoogleModal(true);
              }}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2.5 border border-slate-200 transition-colors text-xs cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continuar com Google</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-3">
          <div className="flex justify-center">
            <button
              onClick={() => onNavigate('admin')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 font-bold transition-colors cursor-pointer group"
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>Entrar como Administrador</span>
            </button>
          </div>
        </footer>
      </main>

      {/* Google Login Input Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <h3 className="text-base font-bold text-slate-900">Entrar com Conta Google</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Forneça os seus dados do Google para registrar e sincronizar sua conta no Supabase:
            </p>

            <form onSubmit={handleGoogleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Seu Nome"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail do Google *
                </label>
                <input
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  Confirmar e Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
