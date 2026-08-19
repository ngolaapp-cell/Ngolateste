import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

function sanitizeUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim().replace(/^["']|["']$/g, "");
  url = url.replace(/\/rest\/v1\/?$/i, "");
  url = url.replace(/\/auth\/v1\/?$/i, "");
  url = url.replace(/\/graphql\/v1\/?$/i, "");
  return url.replace(/\/+$/, "");
}

// Initialize Supabase Server Client if configured
const supabaseUrl = sanitizeUrl(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "");
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "");
const serverSupabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Admin Recovery State & OTP Storage (In-Memory + Supabase persistence)
let currentAdminPassword = process.env.ADMIN_PASSWORD || "ngola2025";
let currentRecoveryEmail = process.env.ADMIN_RECOVERY_EMAIL || "ngolaapp@gmail.com";

interface RecoveryOTP {
  email: string;
  code: string;
  expiresAt: number;
}
const recoveryOtps = new Map<string, RecoveryOTP>();

// Helper to mask email for security
function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name.substring(0, 2)}***` : `${name}***`;
  return `${maskedName}@${domain}`;
}

// In-memory SMTP runtime settings (with fallback to environment variables)
interface SmtpSettings {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  resendApiKey?: string;
}

let runtimeSmtpSettings: SmtpSettings = {
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT) || 587,
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
};

// Helper to fetch merged SMTP config (Env + Supabase)
async function getEffectiveSmtpConfig(): Promise<SmtpSettings> {
  const config: SmtpSettings = { ...runtimeSmtpSettings };

  if (serverSupabase) {
    try {
      const { data } = await serverSupabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "smtp_settings")
        .maybeSingle();

      if (data?.valor) {
        const parsed = typeof data.valor === "string" ? JSON.parse(data.valor) : data.valor;
        if (parsed.user) config.user = parsed.user;
        if (parsed.pass) config.pass = parsed.pass;
        if (parsed.host) config.host = parsed.host;
        if (parsed.port) config.port = Number(parsed.port);
        if (parsed.from) config.from = parsed.from;
        if (parsed.resendApiKey) config.resendApiKey = parsed.resendApiKey;
      }
    } catch (e) {
      // ignore
    }
  }

  return config;
}

// Helper to create Mail Transporter with sanitized inputs
function createMailTransporter(config: SmtpSettings) {
  const host = config.host?.trim();
  const port = Number(config.port) || 587;
  const user = config.user?.trim();
  let pass = config.pass?.trim();

  // If using Gmail app password, strip spaces (often formatted as "abcd efgh ijkl mnop")
  if (pass) {
    pass = pass.replace(/\s+/g, "");
  }

  if (!user || !pass) {
    return null;
  }

  // 1. Explicit Gmail Service or smtp.gmail.com
  const isGmail = (host && host.includes("gmail.com")) || (user && user.toLowerCase().endsWith("@gmail.com"));

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // 2. Custom SMTP Host
  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return null;
}

// Send Real Email with 6-digit recovery code
async function sendRecoveryEmailToAdmin(
  toEmail: string,
  otpCode: string
): Promise<{ success: boolean; delivered: boolean; method: string; message?: string; error?: string }> {
  const config = await getEffectiveSmtpConfig();
  const subject = "🔒 Código de Recuperação de Senha do Administrador - NgolaTeste";
  const htmlContent = `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f1f5f9; padding: 32px 16px; color: #0f172a;">
      <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1d4ed8, #4338ca); padding: 28px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">NgolaTeste</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #bfdbfe;">Recuperação Segura de Senha do Administrador</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; text-align: center;">
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
            Recebemos uma solicitação de redefinição de senha para o <strong>Painel do Administrador</strong> da plataforma NgolaTeste.
          </p>

          <p style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 10px;">
            O seu código de verificação é:
          </p>

          <!-- 6 Digit OTP Box -->
          <div style="display: inline-block; background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 14px; padding: 16px 32px; margin: 8px 0 24px 0;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8;">
              ${otpCode}
            </span>
          </div>

          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0;">
            Copie este código de 6 dígitos e cole-o na aplicação NgolaTeste para confirmar a sua identidade e definir a sua nova senha de administrador.<br/>
            <strong>Este código é válido por 15 minutos.</strong>
          </p>

          <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px; font-size: 11px; color: #991b1b; text-align: left;">
            ⚠️ <strong>Atenção de Segurança:</strong> Se não foi você quem solicitou este código, ignore esta mensagem. Nunca partilhe este código com terceiros.
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} NgolaTeste • Preparação Oficial para Concursos Públicos em Angola
        </div>

      </div>
    </div>
  `;

  const textContent = `NgolaTeste - Recuperação de Senha do Administrador\n\nO seu código de verificação é: ${otpCode}\n\nCopie este código e cole-o na aplicação para definir a sua nova senha. Válido por 15 minutos.\n\nSe não solicitou esta alteração, ignore este e-mail.`;

  // 1. Try Resend if configured
  const resendApiKey = config.resendApiKey?.trim();
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from || "NgolaTeste <onboarding@resend.dev>",
          to: [toEmail],
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });
      if (res.ok) {
        console.log(`[Email Dispatch] Recovery OTP sent to ${toEmail} via Resend.`);
        return { success: true, delivered: true, method: "resend" };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn("[Resend Warning] API returned:", errJson);
      }
    } catch (err: any) {
      console.warn("Resend email dispatch error:", err?.message);
    }
  }

  // 2. Try Nodemailer transport if configured
  const transporter = createMailTransporter(config);
  if (transporter) {
    try {
      await transporter.sendMail({
        from: config.from || `"NgolaTeste" <${config.user || "suporte@ngolateste.ao"}>`,
        to: toEmail,
        subject,
        html: htmlContent,
        text: textContent,
      });
      console.log(`[Email Dispatch] Recovery OTP successfully delivered to ${toEmail} via SMTP.`);
      return { success: true, delivered: true, method: "smtp" };
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("535-5.7.8") || errMsg.includes("Invalid login") || errMsg.includes("BadCredentials")) {
        console.warn(
          `[SMTP Auth Warning] Falha de autenticação SMTP (535-5.7.8). Se estiver a utilizar o Gmail (${config.user}), é obrigatório usar uma 'Senha de App' de 16 caracteres gerada na conta Google (myaccount.google.com/apppasswords) em vez da sua senha de login padrão.`
        );
        return {
          success: true,
          delivered: false,
          method: "smtp_auth_failed",
          error: "Credenciais SMTP rejeitadas (535-5.7.8). Para contas Gmail, use uma 'Senha de App' de 16 dígitos com 2FA ativado.",
        };
      } else {
        console.warn(`[SMTP Warning] Falha ao enviar via SMTP: ${errMsg}`);
        return {
          success: true,
          delivered: false,
          method: "smtp_failed",
          error: errMsg,
        };
      }
    }
  }

  // 3. Fallback: Log email event securely on server console
  console.log(`[Email Recovery Service] Código OTP gerado para ${toEmail}. Válido por 15 min.`);
  return {
    success: true,
    delivered: false,
    method: "server_storage",
  };
}

// Demo activation codes storage
const activeCodes = new Set<string>([
  "ABC1-2345-DEFG",
  "NGOLA-2025-X89K",
  "TESTE-1000-KZS2",
  "CONCURSO-2026-OK"
]);

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "NgolaTeste", supabaseConnected: !!serverSupabase });
});

// Admin Recovery Email - Get Current Email
app.get("/api/admin/recovery-email", async (_req, res) => {
  if (serverSupabase) {
    try {
      const { data } = await serverSupabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "admin_recovery_email")
        .maybeSingle();
      if (data?.valor) {
        currentRecoveryEmail = data.valor;
      }
    } catch (e) {
      // fallback
    }
  }
  res.json({ email: currentRecoveryEmail, maskedEmail: maskEmail(currentRecoveryEmail) });
});

// Admin Recovery Email - Save New Email
app.post("/api/admin/recovery-email", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "E-mail inválido." });
  }

  currentRecoveryEmail = email.trim().toLowerCase();

  if (serverSupabase) {
    try {
      await serverSupabase
        .from("configuracoes")
        .upsert(
          {
            chave: "admin_recovery_email",
            valor: currentRecoveryEmail,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "chave" }
        );
    } catch (e) {
      console.warn("Failed saving recovery email to Supabase:", e);
    }
  }

  res.json({
    success: true,
    message: `E-mail de recuperação "${currentRecoveryEmail}" atualizado com sucesso!`,
    maskedEmail: maskEmail(currentRecoveryEmail),
  });
});

// Admin Recovery - Send OTP via Email (NEVER returns the code in the response)
app.post("/api/admin/send-recovery-otp", async (req, res) => {
  const { email } = req.body;
  const targetEmail = (email && typeof email === "string" && email.includes("@"))
    ? email.trim().toLowerCase()
    : currentRecoveryEmail;

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  // Store in server memory map
  recoveryOtps.set(targetEmail, {
    email: targetEmail,
    code: otpCode,
    expiresAt,
  });

  // Store in Supabase if configured
  if (serverSupabase) {
    try {
      await serverSupabase.from("configuracoes").upsert({
        chave: "admin_recovery_otp",
        valor: JSON.stringify({ code: otpCode, email: targetEmail, expiresAt }),
        updated_at: new Date().toISOString(),
      }, { onConflict: "chave" });
    } catch (e) {
      // non-blocking
    }
  }

  // Dispatch real email
  const sendResult = await sendRecoveryEmailToAdmin(targetEmail, otpCode);

  if (!sendResult.delivered) {
    return res.json({
      success: false,
      delivered: false,
      deliveryMethod: sendResult.method,
      message:
        sendResult.error ||
        `Não foi possível entregar o e-mail para ${maskEmail(targetEmail)}. Verifique as configurações de envio (Gmail / SMTP / Resend) na aba Segurança do Painel do Administrador.`,
      maskedEmail: maskEmail(targetEmail),
      expiresInMinutes: 15,
      errorNotice: sendResult.error,
    });
  }

  const statusMsg = `Código de verificação de 6 dígitos enviado com sucesso para ${maskEmail(targetEmail)}. Verifique a sua caixa de entrada no e-mail (e a pasta de spam).`;

  // Return strictly WITHOUT revealing the OTP code
  return res.json({
    success: true,
    delivered: true,
    deliveryMethod: sendResult.method,
    message: statusMsg,
    maskedEmail: maskEmail(targetEmail),
    expiresInMinutes: 15,
  });
});

// Admin SMTP Status & Configuration Endpoints
app.get("/api/admin/smtp-status", async (_req, res) => {
  const config = await getEffectiveSmtpConfig();
  const hasSmtp = Boolean(config.user && config.pass);
  const hasResend = Boolean(config.resendApiKey);

  res.json({
    configured: hasSmtp || hasResend,
    user: config.user ? maskEmail(config.user) : "",
    host: config.host || (config.user?.includes("@gmail.com") ? "smtp.gmail.com" : ""),
    port: config.port || 587,
    hasResend,
    hasSmtp,
    provider: hasResend ? "Resend API" : hasSmtp ? (config.user?.includes("@gmail.com") ? "Gmail SMTP" : "Custom SMTP") : "Nenhum (armazenamento seguro em servidor)",
  });
});

app.post("/api/admin/smtp-config", async (req, res) => {
  const { host, port, user, pass, from, resendApiKey } = req.body;

  if (host !== undefined) runtimeSmtpSettings.host = host;
  if (port !== undefined) runtimeSmtpSettings.port = Number(port);
  if (user !== undefined) runtimeSmtpSettings.user = user.trim();
  if (pass !== undefined) runtimeSmtpSettings.pass = pass.trim();
  if (from !== undefined) runtimeSmtpSettings.from = from.trim();
  if (resendApiKey !== undefined) runtimeSmtpSettings.resendApiKey = resendApiKey.trim();

  if (serverSupabase) {
    try {
      await serverSupabase.from("configuracoes").upsert(
        {
          chave: "smtp_settings",
          valor: JSON.stringify(runtimeSmtpSettings),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chave" }
      );
    } catch (e) {
      console.warn("Could not persist SMTP settings to Supabase:", e);
    }
  }

  res.json({
    success: true,
    message: "Configurações de envio de e-mail atualizadas com sucesso!",
  });
});

app.post("/api/admin/smtp-test", async (req, res) => {
  const { testEmail } = req.body;
  const targetEmail = testEmail && testEmail.includes("@") ? testEmail.trim() : currentRecoveryEmail;
  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const sendResult = await sendRecoveryEmailToAdmin(targetEmail, testOtp);
  res.json({
    success: sendResult.success,
    delivered: sendResult.delivered,
    method: sendResult.method,
    message: sendResult.delivered
      ? `E-mail de teste enviado com sucesso para ${targetEmail} via ${sendResult.method}.`
      : sendResult.error || `Código de teste gerado com sucesso.`,
    error: sendResult.error,
  });
});

// Admin Recovery - Verify OTP Code
app.post("/api/admin/verify-recovery-otp", async (req, res) => {
  const { code, email } = req.body;
  if (!code || typeof code !== "string" || code.trim().length !== 6) {
    return res.status(400).json({ success: false, message: "Insira o código de 6 dígitos recebido no seu e-mail." });
  }

  const cleanCode = code.trim();
  const targetEmail = (email && typeof email === "string" && email.includes("@"))
    ? email.trim().toLowerCase()
    : currentRecoveryEmail;

  // 1. Check in-memory map
  const record = recoveryOtps.get(targetEmail);
  if (record) {
    if (Date.now() > record.expiresAt) {
      recoveryOtps.delete(targetEmail);
      return res.status(400).json({ success: false, message: "O código de recuperação expirou. Solicite um novo código." });
    }
    if (record.code === cleanCode) {
      return res.json({ success: true, message: "Código verificado com sucesso!" });
    }
  }

  // 2. Check Supabase backup
  if (serverSupabase) {
    try {
      const { data } = await serverSupabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "admin_recovery_otp")
        .maybeSingle();

      if (data?.valor) {
        const parsed = JSON.parse(data.valor);
        if (Date.now() > parsed.expiresAt) {
          return res.status(400).json({ success: false, message: "O código expirou. Solicite um novo." });
        }
        if (parsed.code.trim() === cleanCode) {
          return res.json({ success: true, message: "Código verificado com sucesso!" });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return res.status(400).json({ success: false, message: "Código incorreto. Por favor verifique os 6 dígitos no seu e-mail e tente novamente." });
});

// Admin Recovery - Reset Admin Password
app.post("/api/admin/reset-password", async (req, res) => {
  const { code, newPassword, email } = req.body;
  if (!code || !newPassword || !newPassword.trim()) {
    return res.status(400).json({ success: false, message: "Código ou nova senha não informados." });
  }

  const cleanCode = code.trim();
  const cleanPass = newPassword.trim();
  const targetEmail = (email && typeof email === "string" && email.includes("@"))
    ? email.trim().toLowerCase()
    : currentRecoveryEmail;

  // Validate OTP first
  let isValid = false;
  const record = recoveryOtps.get(targetEmail);
  if (record && record.code === cleanCode && Date.now() <= record.expiresAt) {
    isValid = true;
    recoveryOtps.delete(targetEmail);
  }

  if (!isValid && serverSupabase) {
    try {
      const { data } = await serverSupabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "admin_recovery_otp")
        .maybeSingle();

      if (data?.valor) {
        const parsed = JSON.parse(data.valor);
        if (parsed.code.trim() === cleanCode && Date.now() <= parsed.expiresAt) {
          isValid = true;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!isValid) {
    return res.status(400).json({ success: false, message: "Código inválido ou expirado. Não foi possível redefinir a senha." });
  }

  currentAdminPassword = cleanPass;

  // Save new password in Supabase
  if (serverSupabase) {
    try {
      await serverSupabase.from("configuracoes").upsert({
        chave: "admin_password",
        valor: cleanPass,
        updated_at: new Date().toISOString(),
      }, { onConflict: "chave" });
    } catch (e) {
      // non-blocking
    }
  }

  return res.json({
    success: true,
    message: "Senha do Administrador redefinida com sucesso! Você já pode acessar o painel.",
  });
});

// Supabase Status & Diagnostic API
app.get("/api/supabase/status", async (req, res) => {
  const dynamicUrl = sanitizeUrl((req.query.url as string) || supabaseUrl);
  const dynamicKey = ((req.query.key as string) || supabaseKey).trim().replace(/^["']|["']$/g, "");
  
  const client = (dynamicUrl && dynamicKey) ? createClient(dynamicUrl, dynamicKey) : serverSupabase;
  if (!client) {
    return res.json({
      configured: false,
      message: "Supabase não configurado no servidor (.env ou parâmetros).",
      tables: []
    });
  }

  const tablesToCheck = [
    { name: "modulos_teste", displayName: "Módulos de Teste" },
    { name: "perguntas", displayName: "Perguntas de Exames" },
    { name: "categorias", displayName: "Categorias" },
    { name: "especialidades", displayName: "Especialidades" },
    { name: "usuarios", displayName: "Usuários e Assinaturas" },
    { name: "resultados_testes", displayName: "Resultados de Testes" },
    { name: "codigos_ativacao", displayName: "Códigos de Ativação" }
  ];

  const results = [];
  for (const t of tablesToCheck) {
    try {
      const { count, error } = await client.from(t.name).select("*", { count: "exact", head: true });
      if (error) {
        results.push({ table: t.name, displayName: t.displayName, status: "error", message: error.message, count: 0 });
      } else {
        results.push({ table: t.name, displayName: t.displayName, status: "ok", message: "Conectado", count: count || 0 });
      }
    } catch (err: any) {
      results.push({ table: t.name, displayName: t.displayName, status: "error", message: err?.message || String(err), count: 0 });
    }
  }

  res.json({
    configured: true,
    message: "Verificação concluída.",
    tables: results
  });
});

// Supabase Save Module Proxy Endpoint
app.post("/api/supabase/save-module", async (req, res) => {
  const { module, url, key } = req.body;
  if (!module || !module.title) {
    return res.status(400).json({ success: false, message: "Dados do módulo incompletos." });
  }

  const client = (url && key) ? createClient(url, key) : serverSupabase;
  if (!client) {
    return res.status(400).json({ success: false, message: "Supabase não configurado." });
  }

  try {
    const payload = {
      id: String(module.id),
      title: module.title,
      year: Number(module.year) || 2025,
      question_count: Number(module.questionCount || module.question_count || 0),
      badge: module.badge || "NOVO",
      category: module.category || "Geral",
      description: module.description || null,
      created_at: new Date().toISOString(),
    };

    let { error } = await client.from("modulos_teste").upsert(payload, { onConflict: "id" });
    if (error) {
      const resAlt = await client.from("test_modules").upsert(payload, { onConflict: "id" });
      if (resAlt.error) {
        return res.status(500).json({ success: false, message: `Erro no Supabase: ${error.message}` });
      }
    }

    return res.json({ success: true, message: `Módulo "${module.title}" salvo no Supabase via backend!` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || String(err) });
  }
});


// Code Activation Endpoint
app.post("/api/activate", async (req, res) => {
  const { code, phone } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ success: false, message: "Código inválido." });
  }

  const cleanCode = code.trim().toUpperCase();

  // Try checking Supabase first if available
  if (serverSupabase) {
    try {
      let { data, error } = await serverSupabase
        .from("codigos_ativacao")
        .select("*")
        .eq("code", cleanCode)
        .maybeSingle();

      if (error || !data) {
        const altRes = await serverSupabase
          .from("activation_codes")
          .select("*")
          .eq("code", cleanCode)
          .maybeSingle();
        data = altRes.data;
      }

      if (data) {
        if (data.is_used && data.used_by_phone && data.used_by_phone !== phone) {
          return res.status(400).json({
            success: false,
            message: "Este código já foi utilizado em outra conta."
          });
        }

        const nowIso = new Date().toISOString();
        await serverSupabase
          .from("codigos_ativacao")
          .update({ is_used: true, used_by_phone: phone || null, used_at: nowIso })
          .eq("code", cleanCode);

        return res.json({
          success: true,
          message: "Código validado e ativado no Supabase com sucesso! Assinatura válida por 14 dias (2 semanas).",
          expiresInDays: data.days_valid || 14,
          plan: "Acesso Total (2 Semanas)"
        });
      }
    } catch (err) {
      console.error("Server Supabase activation query error:", err);
    }
  }

  // Fallback to activeCodes or NGOLA- prefix
  if (activeCodes.has(cleanCode) || cleanCode.startsWith("NGOLA-")) {
    return res.json({
      success: true,
      message: "Código de acesso ativado com sucesso! Assinatura válida por 14 dias (2 semanas).",
      expiresInDays: 14,
      plan: "Acesso Total (2 Semanas)"
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Código não encontrado no Supabase ou expirado. Por favor verifique ou contacte o suporte no WhatsApp (923361877)."
    });
  }
});

// AI Study Tip Endpoint
app.post("/api/gemini/study-tip", async (req, res) => {
  try {
    const { category, score, totalQuestions, wrongCategories } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        tip: `Revise as questões de ${category || "Legislação"}. Foi onde você teve mais dificuldades hoje. Mantenha a constância!`
      });
    }

    const prompt = `Você é um mentor especialista em concursos públicos angolanos (como Ministério da Educação - MED, Ministério da Saúde - MINMED, Administração Pública, etc).
O candidato concluiu um simulado na categoria "${category || 'Geral'}" e acertou ${score || 16} de ${totalQuestions || 20} questões.
Tópicos com mais erros: ${Array.isArray(wrongCategories) && wrongCategories.length > 0 ? wrongCategories.join(", ") : "Legislação e Leis Orgânicas"}.

Forneça uma DICA DE ESTUDO motivadora, curta e direta (máximo 3 frases) em português de Angola, apontando o que ele deve revisar estrategicamente.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    res.json({
      tip: response.text ? response.text.trim() : "Revise a legislação específica para aumentar seus acertos no próximo teste!"
    });
  } catch (error) {
    console.error("Gemini study-tip error:", error);
    res.json({
      tip: "Revise as questões de Legislação e Administração Pública. Mantenha a constância para garantir sua vaga!"
    });
  }
});

// AI Custom Question Generator Endpoint
app.post("/api/gemini/generate-question", async (req, res) => {
  try {
    const { subject, level } = req.body;
    const targetSubject = subject || "Direito Administrativo";

    if (!process.env.GEMINI_API_KEY) {
      const idxRandom = Math.floor(Math.random() * 4);
      const opts = [
        "Princípio da Legalidade, Impessoalidade e Transparência",
        "Princípio do Favoritismo Pessoal",
        "Princípio da Discricionariedade Absoluta",
        "Princípio da Sigilosidade Geral"
      ];
      // Shuffle option placing the correct answer at idxRandom
      const correctText = opts[0];
      const otherTexts = opts.slice(1);
      const shuffledOptions: string[] = [];
      let otherCount = 0;
      for (let i = 0; i < 4; i++) {
        if (i === idxRandom) {
          shuffledOptions.push(correctText);
        } else {
          shuffledOptions.push(otherTexts[otherCount++]);
        }
      }

      return res.json({
        question: {
          id: `ai-${Date.now()}`,
          category: targetSubject,
          banca: "Simulado IA • NgolaTeste",
          statement: `De acordo com a Legislação Geral de Concursos Públicos em Angola, qual é o princípio fundamental regente da Administração Pública?`,
          options: shuffledOptions,
          correctIndex: idxRandom,
          explanation: "O artigo 198º da Constituição da República de Angola estabelece que a Administração Pública obedece aos princípios da legalidade, igualdade, proporcionalidade e transparência."
        }
      });
    }

    const prompt = `Crie uma questão inédita e realista de concurso público em Angola para a disciplina "${targetSubject}" no nível ${level || 'Médio/Superior'}.

IMPORTANTE SOBRE AS ALTERNATIVAS:
- Crie 4 alternativas em "options".
- A opção correta DEVE ser sorteada aleatoriamente entre A, B, C ou D (correctIndex: 0, 1, 2 ou 3). Não coloque a resposta correta sempre na primeira alternativa (A)!

Retorne estritamente um JSON no seguinte formato:
{
  "statement": "Texto do enunciado da questão",
  "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
  "correctIndex": 1,
  "banca": "Banca Simulada IA",
  "explanation": "Explicação detalhada da resposta correta baseada na legislação ou teoria aplicável em Angola."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return res.json({
        question: {
          id: `ai-${Date.now()}`,
          category: targetSubject,
          banca: parsed.banca || "Banca IA • NgolaTeste",
          statement: parsed.statement,
          options: parsed.options,
          correctIndex: typeof parsed.correctIndex === 'number' && parsed.correctIndex >= 0 && parsed.correctIndex <= 3
            ? parsed.correctIndex
            : Math.floor(Math.random() * 4),
          explanation: parsed.explanation || "Gabarito fundamentado pela IA da NgolaTeste."
        }
      });
    }

    throw new Error("Resposta vazia da IA");
  } catch (error) {
    console.error("Gemini generate-question error:", error);
    res.json({
      question: {
        id: `ai-${Date.now()}`,
        category: req.body.subject || "Conhecimentos Gerais",
        banca: "NgolaTeste",
        statement: "A Administração Pública Angolana é regida por normas que garantem a lisura nos exames de acesso. Qual a duração típica de estágio probatório?",
        options: [
          "1 ano",
          "3 anos",
          "5 anos",
          "6 meses"
        ],
        correctIndex: 1,
        explanation: "Na função pública angolana, o estágio probatório visa avaliar o desempenho antes do provimento definitivo."
      }
    });
  }
});

// AI Bulk Question Generator Endpoint (Generate 5 to 50 questions at once)
app.post("/api/gemini/generate-bulk-questions", async (req, res) => {
  try {
    const { subject, count, banca, moduleId } = req.body;
    const requestedCount = Math.min(Math.max(parseInt(count) || 10, 1), 50);
    const targetSubject = subject || "Conhecimentos Gerais & Legislação";
    const targetBanca = banca || "Concurso Público Angola";

    if (!process.env.GEMINI_API_KEY) {
      const generated = Array.from({ length: requestedCount }).map((_, idx) => {
        const correctIdx = (idx * 3 + 1) % 4; // Distribute across B (1), D (3), A (0), C (2)
        const baseOptions = [
          `Os atos administrativos devem observar o princípio da legalidade e transparência.`,
          `O recrutamento pode ser efetuado sem observância das vagas orçamentadas.`,
          `O servidor público está isento de prestação de contas dos dinheiros públicos.`,
          `Os prazos de impugnação administrativa caducam em 48 horas imporrogáveis.`
        ];
        const correctText = baseOptions[0];
        const wrongTexts = baseOptions.slice(1);
        const options: string[] = [];
        let wrongIdx = 0;
        for (let i = 0; i < 4; i++) {
          if (i === correctIdx) {
            options.push(correctText);
          } else {
            options.push(wrongTexts[wrongIdx++]);
          }
        }

        return {
          id: `bulk-${Date.now()}-${idx}`,
          moduleId: moduleId || "exame-2024",
          category: targetSubject,
          banca: targetBanca,
          statement: `[Questão ${idx + 1}] Sobre os princípios da Função Pública e Legislação de Angola para ${targetSubject}, assinale a opção correta:`,
          options,
          correctIndex: correctIdx,
          explanation: `Fundamentado nos termos da legislação angolana sobre a Administração Pública e carreiras do Estado.`
        };
      });
      return res.json({ success: true, count: generated.length, questions: generated });
    }

    const prompt = `Gere rigorosamente um array com ${requestedCount} questões inéditas e de alto nível para concurso público em Angola.
Disciplina/Assunto: "${targetSubject}".
Banca / Instituição: "${targetBanca}".

REGRAS OBRIGATÓRIAS SOBRE O GABARITO (correctIndex):
- "correctIndex": número de 0 a 3 (0 para A, 1 para B, 2 para C, 3 para D).
- DISTRIBUA O GABARITO: As respostas corretas DEVEM estar aleatoriamente distribuídas entre as opções A, B, C e D em cada questão.
- É PROIBIDO colocar a resposta correta sempre na alternativa A (0)! Espalhe uniformemente os gabaritos entre 0, 1, 2 e 3 ao longo das ${requestedCount} questões.

Para cada questão, inclua:
- "statement": enunciado claro e bem formulado
- "options": 4 alternativas em texto
- "correctIndex": número de 0 a 3 (0=A, 1=B, 2=C, 3=D)
- "explanation": justificativa / fundamentação jurídica ou teórica em Angola

Retorne estritamente um JSON no formato:
{
  "questions": [
    {
      "statement": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 1,
      "explanation": "..."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      const rawQuestions = parsed.questions || parsed;
      if (Array.isArray(rawQuestions)) {
        const questions = rawQuestions.map((q: any, idx: number) => ({
          id: `bulk-${Date.now()}-${idx}`,
          moduleId: moduleId || "",
          category: targetSubject,
          banca: targetBanca,
          statement: q.statement || `Questão ${idx + 1}`,
          options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ["Opção A", "Opção B", "Opção C", "Opção D"],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : (idx % 4),
          explanation: q.explanation || "Gabarito fundamentado pela comissão do exame."
        }));
        return res.json({ success: true, count: questions.length, questions });
      }
    }

    throw new Error("Formato de resposta inválido da IA");
  } catch (error) {
    console.error("Gemini generate-bulk-questions error:", error);
    const fallbackCount = Math.min(parseInt(req.body?.count) || 10, 20);
    const generated = Array.from({ length: fallbackCount }).map((_, idx) => {
      const correctIdx = (idx * 2 + 1) % 4; // Rotates: 1 (B), 3 (D), 1 (B), 3 (D)...
      const baseOpts = [
        "Convocatória prévia mediante publicação em Diário da República ou portal oficial.",
        "Acolhimento de candidatos sem apresentação de bilhete de identidade válido.",
        "Divulgação dos resultados finais após prazo de um ano lectivo.",
        "Realização de provas orais sem gravação nem ata assinada pela comissão."
      ];
      const correctText = baseOpts[0];
      const wrongTexts = baseOpts.slice(1);
      const options: string[] = [];
      let wIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === correctIdx) {
          options.push(correctText);
        } else {
          options.push(wrongTexts[wIdx++]);
        }
      }

      return {
        id: `bulk-${Date.now()}-${idx}`,
        moduleId: req.body?.moduleId || "",
        category: req.body?.subject || "Legislação e Administração Pública",
        banca: req.body?.banca || "NgolaTeste",
        statement: `[Questão ${idx + 1}] De acordo com as normas gerais dos exames de admissão em Angola para ${req.body?.subject || 'Administração Pública'}, qual o procedimento correto?`,
        options,
        correctIndex: correctIdx,
        explanation: "Os concursos públicos primam pela publicidade prévia e transparência documental."
      };
    });
    return res.json({ success: true, count: generated.length, questions: generated });
  }
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NgolaTeste Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
