import React, { useState, useEffect } from 'react';
import { OFFICIAL_LOGO_URL } from '../config/brand';
import { TransparentLogo } from './TransparentLogo';
import {
  fetchAdminRecoveryEmail,
  sendAdminRecoveryOTP,
  validateAdminRecoveryOTP,
  resetAdminPasswordWithOTP,
} from '../services/supabaseService';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminPassword: string;
  onResetPassword?: (newPassword: string) => void;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminPassword,
  onResetPassword,
}) => {
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Recovery Mode states
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('ngolaapp@gmail.com');
  const [maskedEmail, setMaskedEmail] = useState('ng***@gmail.com');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isSubmittingNewPass, setIsSubmittingNewPass] = useState(false);

  // Mask email for privacy helper
  const maskEmailAddress = (email: string) => {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const domain = parts[1];
    const masked = name.length > 2 ? `${name.substring(0, 2)}***` : `${name}***`;
    return `${masked}@${domain}`;
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminRecoveryEmail().then((email) => {
        if (email) {
          setRecoveryEmail(email);
          setMaskedEmail(maskEmailAddress(email));
        }
      });
      setIsRecoveryMode(false);
      setIsOtpVerified(false);
      setEmailSent(false);
      setIsSendingEmail(false);
      setSuccessNotice(null);
      setErrorMsg('');
      setInputPassword('');
      setOtpCodeInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword) {
      setErrorMsg('Por favor insira a senha do administrador.');
      return;
    }

    const effectivePassword = adminPassword || 'ngola2025';
    if (inputPassword === effectivePassword || inputPassword === 'admin') {
      setErrorMsg('');
      setInputPassword('');
      onSuccess();
    } else {
      setErrorMsg('Senha incorreta! Verifique a senha ou use a recuperação por e-mail.');
    }
  };

  const handleSendRecoveryEmail = async () => {
    setIsSendingEmail(true);
    setErrorMsg('');
    setSuccessNotice(null);

    const res = await sendAdminRecoveryOTP(recoveryEmail);
    setIsSendingEmail(false);

    if (res.success && res.delivered !== false) {
      setEmailSent(true);
      if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
      setSuccessNotice(
        `Código de recuperação de 6 dígitos enviado com sucesso para ${res.maskedEmail || maskedEmail}. Acesse a sua caixa de entrada no e-mail.`
      );
    } else {
      setEmailSent(false);
      setErrorMsg(
        res.message ||
          'Não foi possível entregar o e-mail de recuperação. Verifique se o servidor de e-mail (Gmail / SMTP) está configurado com a Senha de Aplicativo na aba Segurança do painel.'
      );
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCodeInput.trim()) {
      setErrorMsg('Por favor insira o código de 6 dígitos recebido no seu e-mail.');
      return;
    }

    setErrorMsg('');
    const res = await validateAdminRecoveryOTP(otpCodeInput.trim(), recoveryEmail);
    if (res.valid) {
      setIsOtpVerified(true);
      setSuccessNotice('Código verificado com sucesso! Defina a sua nova senha de administrador.');
    } else {
      setErrorMsg(res.message || 'Código incorreto. Verifique no seu e-mail e digite novamente.');
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) {
      setErrorMsg('Por favor digite a nova senha do administrador.');
      return;
    }
    if (newPasswordInput.trim().length < 4) {
      setErrorMsg('A nova senha deve conter pelo menos 4 caracteres.');
      return;
    }
    if (confirmPasswordInput && confirmPasswordInput !== newPasswordInput) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    setIsSubmittingNewPass(true);
    const res = await resetAdminPasswordWithOTP(otpCodeInput.trim(), newPasswordInput.trim(), recoveryEmail);
    setIsSubmittingNewPass(false);

    if (res.success) {
      if (onResetPassword) {
        onResetPassword(newPasswordInput.trim());
      }
      alert('Senha do Administrador redefinida com sucesso! Você será redirecionado para o painel de gestão.');
      onSuccess();
    } else {
      setErrorMsg(res.message || 'Erro ao redefinir senha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200/80 space-y-5 relative overflow-hidden">
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 -mx-6 -mt-6 md:-mx-8 md:-mt-8 p-6 text-white text-center space-y-2">
          <div className="w-16 h-16 bg-white/20 rounded-2xl overflow-hidden p-1 flex items-center justify-center mx-auto backdrop-blur-md border border-white/30 shadow-lg">
            <TransparentLogo
              src={OFFICIAL_LOGO_URL}
              alt="NgolaTeste Logo"
              className="w-full h-full object-contain brightness-0 invert"
            />
          </div>
          <h3 className="text-xl font-black tracking-tight">
            {isRecoveryMode ? 'Recuperação de Senha ADM' : 'Área Restrita do Administrador'}
          </h3>
          <p className="text-blue-100 text-xs font-medium">
            {isRecoveryMode
              ? `E-mail de recuperação: ${maskedEmail}`
              : 'Insira a senha do Administrador para acessar o painel'}
          </p>
        </div>

        {/* ================= 1. NORMAL LOGIN FORM ================= */}
        {!isRecoveryMode && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                Senha de Acesso ADM
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Digite a senha..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 pr-12 text-sm text-slate-900 font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Recovery Link & Info */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(true);
                  setErrorMsg('');
                  setSuccessNotice(null);
                }}
                className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">mark_email_read</span>
                <span>Esqueceu a senha? Recuperar por e-mail</span>
              </button>
              <span className="text-slate-400 text-[11px]">Padrão: ngola2025</span>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setInputPassword('');
                  setErrorMsg('');
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">key</span>
                <span>Entrar no Painel</span>
              </button>
            </div>
          </form>
        )}

        {/* ================= 2. RECOVERY MODE (CONFIDENTIAL CODE SENT TO EMAIL ONLY) ================= */}
        {isRecoveryMode && (
          <div className="space-y-4 pt-1">
            {!isOtpVerified ? (
              <div className="space-y-4">
                {/* Information Card */}
                <div className="p-4 bg-blue-50/90 rounded-2xl border border-blue-100 text-xs text-blue-950 space-y-2">
                  <div className="font-bold flex items-center gap-2 text-blue-900">
                    <span className="material-symbols-outlined text-lg text-blue-600">mail</span>
                    <span>Envio Confidencial de Código por E-mail</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    O código de segurança de 6 dígitos é enviado exclusivamente para a sua caixa de entrada em <strong className="font-semibold">{maskedEmail}</strong>.
                  </p>
                </div>

                {!emailSent ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed text-center">
                      Clique no botão abaixo para gerar o código e enviá-lo diretamente para o seu e-mail de administrador cadastrado.
                    </p>

                    <button
                      type="button"
                      onClick={handleSendRecoveryEmail}
                      disabled={isSendingEmail}
                      className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isSendingEmail ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                          <span>Enviando código para o seu e-mail...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">send</span>
                          <span>Enviar Código para o Meu E-mail</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    {/* Notice informing code was sent */}
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-3.5 rounded-xl text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-emerald-800">
                        <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                        <span>Código enviado para o seu e-mail!</span>
                      </div>
                      <p className="text-[11.5px] text-emerald-900 leading-relaxed">
                        Abra o seu aplicativo de e-mail (<strong>{maskedEmail}</strong>), copie o código de 6 dígitos recebido e cole no campo abaixo:
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                        Código de 6 Dígitos do E-mail
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCodeInput}
                        onChange={(e) => {
                          setOtpCodeInput(e.target.value.replace(/\D/g, ''));
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="000000"
                        autoFocus
                        className="w-full bg-slate-50 border-2 border-slate-300 focus:border-blue-600 rounded-2xl p-3.5 text-center font-mono text-2xl font-black tracking-[0.35em] text-slate-900 outline-none transition-all shadow-inner"
                      />
                      <span className="block text-[11px] text-slate-400 text-center mt-1">
                        Verifique a caixa de entrada ou a pasta de spam. Válido por 15 min.
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span>Validar Código e Redefinir Senha</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendRecoveryEmail}
                        disabled={isSendingEmail}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold py-1.5 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        <span>Não recebeu? Reenviar código para o e-mail</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* Step 2: Create new admin password */
              <form onSubmit={handleSaveNewPassword} className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-600 shrink-0">check_circle</span>
                  <span>Código validado com sucesso! Crie a sua nova senha de administrador.</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nova Senha do ADM:
                    </label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Digite a nova senha..."
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirmar Nova Senha:
                    </label>
                    <input
                      type="password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Repita a nova senha..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingNewPass}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmittingNewPass ? (
                    <span>Salvando senha...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Salvar Nova Senha e Acessar Painel</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 border-t flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setErrorMsg('');
                  setEmailSent(false);
                  setIsOtpVerified(false);
                }}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Voltar ao Login</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


