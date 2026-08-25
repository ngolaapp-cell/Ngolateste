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

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// Admin Users List from Supabase Database
app.get("/api/admin/users", async (req, res) => {
  const dynamicUrl = sanitizeUrl((req.query.url as string) || supabaseUrl);
  const dynamicKey = ((req.query.key as string) || supabaseKey).trim().replace(/^["']|["']$/g, "");
  const client = (dynamicUrl && dynamicKey) ? createClient(dynamicUrl, dynamicKey) : serverSupabase;

  if (!client) {
    return res.json({ success: true, count: 0, users: [], message: "Supabase não configurado." });
  }

  try {
    const userMap = new Map<string, any>();

    // 1. Query 'usuarios' table
    try {
      const { data: uData, error: uErr } = await client
        .from("usuarios")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!uErr && Array.isArray(uData)) {
        for (const row of uData) {
          const phone = (row.phone || row.telefone || "").trim();
          if (phone) {
            userMap.set(phone, {
              name: row.name || row.nome || "Candidato Ngola",
              phone,
              email: row.email || "",
              isActivated: Boolean(row.is_activated ?? row.isActivated ?? false),
              activationCode: row.activation_code || row.activationCode || null,
              expiresAt: row.expires_at || row.expiresAt || null,
              activatedSpecializations: row.activated_specializations || row.activatedSpecializations || [],
              dailyGoalQuestions: row.daily_goal_questions ?? 30,
              dailyCompletedQuestions: row.daily_completed_questions ?? 0,
              totalTestsTaken: row.total_tests_taken ?? 0,
              averageScore: Number(row.average_score ?? 0),
              isBlocked: Boolean(row.is_blocked ?? row.isBlocked ?? false),
              blockedReason: row.blocked_reason || row.blockedReason || undefined,
              blockedAt: row.blocked_at || row.blockedAt || undefined,
            });
          }
        }
      }
    } catch (_) {}

    // 2. Query 'profiles' table for any additional users
    try {
      const { data: pData, error: pErr } = await client
        .from("profiles")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!pErr && Array.isArray(pData)) {
        for (const row of pData) {
          const phone = (row.phone || row.telefone || "").trim();
          if (phone && !userMap.has(phone)) {
            userMap.set(phone, {
              name: row.name || row.nome || "Candidato Ngola",
              phone,
              email: row.email || "",
              isActivated: Boolean(row.is_activated ?? row.isActivated ?? false),
              activationCode: row.activation_code || row.activationCode || null,
              expiresAt: row.expires_at || row.expiresAt || null,
              activatedSpecializations: row.activated_specializations || row.activatedSpecializations || [],
              dailyGoalQuestions: row.daily_goal_questions ?? 30,
              dailyCompletedQuestions: row.daily_completed_questions ?? 0,
              totalTestsTaken: row.total_tests_taken ?? 0,
              averageScore: Number(row.average_score ?? 0),
              isBlocked: Boolean(row.is_blocked ?? row.isBlocked ?? false),
              blockedReason: row.blocked_reason || row.blockedReason || undefined,
              blockedAt: row.blocked_at || row.blockedAt || undefined,
            });
          }
        }
      }
    } catch (_) {}

    const users = Array.from(userMap.values());
    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || String(err), users: [] });
  }
});

// Admin Delete User from Supabase Database
app.post("/api/admin/delete-user", async (req, res) => {
  const { phone, url, key } = req.body;
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return res.status(400).json({ success: false, message: "Número de telefone do usuário obrigatório." });
  }

  const cleanPhone = phone.trim();
  const dynamicUrl = sanitizeUrl(url || supabaseUrl);
  const dynamicKey = (key || supabaseKey).trim().replace(/^["']|["']$/g, "");
  const client = (dynamicUrl && dynamicKey) ? createClient(dynamicUrl, dynamicKey) : serverSupabase;

  if (client) {
    try {
      // 1. Delete from usuarios
      await client.from("usuarios").delete().eq("phone", cleanPhone);
      await client.from("usuarios").delete().eq("telefone", cleanPhone);

      // 2. Delete from profiles
      await client.from("profiles").delete().eq("phone", cleanPhone);
      await client.from("profiles").delete().eq("telefone", cleanPhone);

      // 3. Unlink from codigos_ativacao
      try {
        await client
          .from("codigos_ativacao")
          .update({ is_used: false, used_by_phone: null, used_by_name: null, used_at: null })
          .eq("used_by_phone", cleanPhone);
      } catch (_) {}
    } catch (dbErr: any) {
      console.warn("Notice deleting user in Supabase:", dbErr);
    }
  }

  return res.json({
    success: true,
    message: `Usuário ${cleanPhone} eliminado com sucesso do banco de dados e do sistema.`,
  });
});

// Admin Toggle User Activation (14-day full unlock of all categories & specializations)
app.post("/api/admin/toggle-user-activation", async (req, res) => {
  const { phone, activate, days = 14, categories = [], specializations = [], url, key } = req.body;
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return res.status(400).json({ success: false, message: "Número de telefone do usuário obrigatório." });
  }

  const cleanPhone = phone.trim();
  const shouldActivate = Boolean(activate);
  const durationDays = Number(days) || 14;

  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + durationDays);
  const expiresAtStr = shouldActivate ? expiresDate.toLocaleDateString("pt-AO") : null;

  const allActivatedSpecs: string[] = shouldActivate
    ? Array.from(
        new Set([
          "all",
          "ALL",
          "TODAS",
          "GLOBAL",
          ...specializations.map((s: any) => (typeof s === "string" ? s : s?.id || s?.title)).filter(Boolean),
          ...specializations.map((s: any) => (typeof s === "string" ? s : s?.title)).filter(Boolean),
          ...categories.map((c: any) => (typeof c === "string" ? c : c?.id || c?.name)).filter(Boolean),
          ...categories.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean),
        ])
      )
    : [];

  const dynamicUrl = sanitizeUrl(url || supabaseUrl);
  const dynamicKey = (key || supabaseKey).trim().replace(/^["']|["']$/g, "");
  const client = (dynamicUrl && dynamicKey) ? createClient(dynamicUrl, dynamicKey) : serverSupabase;

  if (client) {
    try {
      const updateData = {
        is_activated: shouldActivate,
        expires_at: expiresAtStr,
        activated_specializations: allActivatedSpecs,
        active_specialization_id: shouldActivate ? "all" : null,
        active_specialization_title: shouldActivate ? "Todas Especialidades (Liberado 14d)" : null,
        plan: shouldActivate ? "14d_todas_especialidades" : "gratuito",
        updated_at: new Date().toISOString(),
      };

      await client.from("usuarios").update(updateData).eq("phone", cleanPhone);
      await client.from("profiles").update(updateData).eq("phone", cleanPhone);
    } catch (dbErr: any) {
      console.warn("Notice updating user activation in Supabase via backend:", dbErr);
    }
  }

  return res.json({
    success: true,
    isActivated: shouldActivate,
    expiresAt: expiresAtStr,
    activatedSpecializations: allActivatedSpecs,
    plan: shouldActivate ? "14d_todas_especialidades" : "gratuito",
    message: shouldActivate
      ? `Todas as categorias e especialidades foram liberadas com sucesso por 14 dias para o candidato (${cleanPhone})!`
      : `Acesso do candidato (${cleanPhone}) desativado com sucesso.`,
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

// Storage for shared results (In-Memory + Supabase persistence)
interface SharedResultData {
  id: string;
  candidateName: string;
  score: number;
  total: number;
  percentage: number;
  finalGrade: number;
  categoryName: string;
  imageDataUri?: string;
  imageUrl?: string;
  createdAt: number;
}
const sharedResultsMap = new Map<string, SharedResultData>();

// --- REAL-TIME ANNOUNCEMENTS & NOTIFICATIONS SSE HUB ---
interface ServerAnnouncement {
  id: string;
  title: string;
  content: string;
  type: "text" | "image" | "video";
  mediaUrl?: string;
  actionText?: string;
  actionUrl?: string;
  badge?: string;
  targetType: "all" | "single" | "selected";
  targetPhones?: string[];
  active: boolean;
  dismissible: boolean;
  createdAt: string;
}

let serverAnnouncementsCache: ServerAnnouncement[] = [];
const sseClients = new Set<express.Response>();

function broadcastAnnouncementUpdate(payload?: any) {
  const dataString = `data: ${JSON.stringify(payload || { type: "update", timestamp: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

// Server-Sent Events Endpoint for Instant Real-Time Notifications
app.get("/api/announcements/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send initial ping and current count
  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`);

  sseClients.add(res);

  const heartbeatInterval = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch (_) {
      clearInterval(heartbeatInterval);
      sseClients.delete(res);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeatInterval);
    sseClients.delete(res);
  });
});

// GET Announcements from Server / Supabase
app.get("/api/announcements", async (_req, res) => {
  if (serverSupabase) {
    try {
      let { data, error } = await serverSupabase.from("comunicados").select("*").order("created_at", { ascending: false });
      if (error || !data || data.length === 0) {
        const alt = await serverSupabase.from("admin_announcements").select("*").order("created_at", { ascending: false });
        data = alt.data;
        error = alt.error;
      }
      if (!error && data && Array.isArray(data)) {
        serverAnnouncementsCache = data.map((item: any) => {
          let targetPhones: string[] = [];
          if (Array.isArray(item.target_phones)) {
            targetPhones = item.target_phones;
          } else if (typeof item.target_phones === "string") {
            try {
              targetPhones = JSON.parse(item.target_phones);
            } catch (_) {
              targetPhones = [item.target_phones];
            }
          }
          return {
            id: String(item.id),
            title: item.title || item.titulo || "Comunicado do Administrador",
            content: item.content || item.conteudo || item.mensagem || "",
            type: (item.type || item.tipo || "text") as "text" | "image" | "video",
            mediaUrl: item.media_url || item.mediaUrl || item.imagem_url || item.video_url || undefined,
            actionText: item.action_text || item.actionText || item.botao_texto || undefined,
            actionUrl: item.action_url || item.actionUrl || item.botao_link || undefined,
            badge: item.badge || item.etiqueta || "Comunicado",
            targetType: (item.target_type || item.targetType || "all") as "all" | "single" | "selected",
            targetPhones,
            active: Boolean(item.active ?? item.ativo ?? true),
            dismissible: Boolean(item.dismissible ?? item.fechavel ?? true),
            createdAt: item.created_at || item.createdAt || new Date().toISOString(),
          };
        });
      }
    } catch (e) {
      console.warn("Server fetch announcements from Supabase error:", e);
    }
  }

  res.json({ success: true, announcements: serverAnnouncementsCache });
});

// POST Save/Publish Announcement with Instant Real-Time Broadcast
app.post("/api/announcements", async (req, res) => {
  const ann: ServerAnnouncement = req.body;
  if (!ann || !ann.title || !ann.content) {
    return res.status(400).json({ success: false, message: "Título e mensagem são obrigatórios." });
  }

  const cleanAnn: ServerAnnouncement = {
    id: ann.id ? String(ann.id) : `ann-${Date.now()}`,
    title: ann.title.trim(),
    content: ann.content.trim(),
    type: ann.type || "text",
    mediaUrl: ann.mediaUrl || undefined,
    actionText: ann.actionText || undefined,
    actionUrl: ann.actionUrl || undefined,
    badge: ann.badge || "Comunicado ADM",
    targetType: ann.targetType || "all",
    targetPhones: Array.isArray(ann.targetPhones) ? ann.targetPhones : [],
    active: ann.active ?? true,
    dismissible: ann.dismissible ?? true,
    createdAt: ann.createdAt || new Date().toISOString(),
  };

  // Update in-memory server cache
  const filtered = serverAnnouncementsCache.filter((a) => a.id !== cleanAnn.id);
  serverAnnouncementsCache = [cleanAnn, ...filtered];

  // Persist to Supabase if configured
  if (serverSupabase) {
    try {
      const payload = {
        id: cleanAnn.id,
        title: cleanAnn.title,
        content: cleanAnn.content,
        type: cleanAnn.type,
        media_url: cleanAnn.mediaUrl || null,
        action_text: cleanAnn.actionText || null,
        action_url: cleanAnn.actionUrl || null,
        badge: cleanAnn.badge,
        target_type: cleanAnn.targetType,
        target_phones: cleanAnn.targetPhones,
        active: cleanAnn.active,
        dismissible: cleanAnn.dismissible,
        created_at: cleanAnn.createdAt,
      };

      let dbRes = await serverSupabase.from("comunicados").upsert(payload, { onConflict: "id" });
      if (dbRes.error) {
        await serverSupabase.from("admin_announcements").upsert(payload, { onConflict: "id" });
      }
    } catch (dbErr) {
      console.warn("Could not upsert announcement to Supabase database:", dbErr);
    }
  }

  // Instant Realtime SSE Broadcast to all connected candidates
  broadcastAnnouncementUpdate({ type: "new_announcement", announcement: cleanAnn, timestamp: Date.now() });

  return res.json({
    success: true,
    message: "Comunicado publicado e transmitido em tempo real com sucesso!",
    announcement: cleanAnn,
  });
});

// DELETE Announcement with Instant Real-Time Broadcast
app.delete("/api/announcements/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "ID do comunicado obrigatório." });
  }

  serverAnnouncementsCache = serverAnnouncementsCache.filter((a) => a.id !== id);

  if (serverSupabase) {
    try {
      await serverSupabase.from("comunicados").delete().eq("id", id);
      await serverSupabase.from("admin_announcements").delete().eq("id", id);
    } catch (e) {
      console.warn("Could not delete announcement in Supabase database:", e);
    }
  }

  // Broadcast deletion event to all connected clients
  broadcastAnnouncementUpdate({ type: "delete_announcement", id, timestamp: Date.now() });

  return res.json({ success: true, message: "Comunicado apagado com sucesso." });
});

// Upload Shared Result Card to Supabase / Server storage
app.post("/api/share/save-result", async (req, res) => {
  try {
    const { id, candidateName, score, total, percentage, finalGrade, categoryName, imageDataUri } = req.body;
    const cleanId = (id && typeof id === "string") ? id.trim() : `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    let publicImageUrl = "";

    // 1. If Supabase storage is available, upload to Supabase Storage bucket
    if (serverSupabase && imageDataUri && typeof imageDataUri === "string" && imageDataUri.startsWith("data:image")) {
      try {
        const base64Data = imageDataUri.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        const filePath = `shared-results/${cleanId}.png`;

        // Try uploading to 'public' or 'Logotipo' or 'resultados' bucket
        const { data: uploadData, error: uploadErr } = await serverSupabase.storage
          .from("Logotipo")
          .upload(filePath, imageBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = serverSupabase.storage
            .from("Logotipo")
            .getPublicUrl(filePath);
          publicImageUrl = publicUrlData?.publicUrl || "";
        }
      } catch (uploadEx) {
        console.warn("Could not upload result image to Supabase storage bucket:", uploadEx);
      }
    }

    const resultRecord: SharedResultData = {
      id: cleanId,
      candidateName: candidateName || "Candidato(a)",
      score: Number(score) || 0,
      total: Number(total) || 20,
      percentage: Number(percentage) || 0,
      finalGrade: Number(finalGrade) || 0,
      categoryName: categoryName || "Concursos Públicos Angola",
      imageDataUri: imageDataUri || undefined,
      imageUrl: publicImageUrl || undefined,
      createdAt: Date.now(),
    };

    sharedResultsMap.set(cleanId, resultRecord);

    // Also persist record metadata in Supabase if table exists
    if (serverSupabase) {
      try {
        await serverSupabase.from("resultados_testes").insert({
          id: cleanId,
          score: resultRecord.score,
          total: resultRecord.total,
          percentage: resultRecord.percentage,
          final_grade: resultRecord.finalGrade,
          category_name: resultRecord.categoryName,
          study_tip: resultRecord.candidateName,
          created_at: new Date().toISOString(),
        });
      } catch (_) {}
    }

    const host = req.get("host") || "ngolateste.netlify.app";
    const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const shareableLandingUrl = `${protocol}://${host}/share/${cleanId}`;

    return res.json({
      success: true,
      id: cleanId,
      shareUrl: shareableLandingUrl,
      imageUrl: publicImageUrl || undefined,
    });
  } catch (err: any) {
    console.error("Error saving shared result:", err);
    return res.status(500).json({ success: false, message: "Erro ao salvar cartão de resultado." });
  }
});

// Dynamic Facebook OpenGraph Landing Page for Results (/share/:id)
app.get("/share/:id", async (req, res) => {
  const resultId = req.params.id;
  const result = sharedResultsMap.get(resultId);

  const candidateName = result ? result.candidateName : "Candidato(a)";
  const score = result ? result.score : 18;
  const total = result ? result.total : 20;
  const finalGrade = result ? result.finalGrade : 18;
  const percentage = result ? result.percentage : 90;
  const category = result ? result.categoryName : "Concurso Público em Angola";

  const defaultOgImage = "https://tmvhypfpqocgksaxywuj.supabase.co/storage/v1/object/public/Logotipo/ngola%20teste%20logotipo.png";
  const ogImageUrl = result?.imageUrl || (result?.id ? `/api/share/image/${result.id}` : defaultOgImage);

  const host = req.get("host") || "ngolateste.netlify.app";
  const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
  const currentFullUrl = `${protocol}://${host}/share/${resultId}`;

  const title = `🇦🇴 ${candidateName} tirou ${finalGrade}/20 Valores no NgolaTeste!`;
  const description = `Desempenho oficial: ${score}/${total} acertos (${percentage}%) em ${category}. Participe do Desafio dos 100 Likes e prepare-se para os Concursos Públicos em Angola!`;

  const html = `<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>

  <!-- Facebook Open Graph Meta Tags -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${currentFullUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1350" />
  <meta property="og:image:alt" content="Cartão de Desempenho Oficial NgolaTeste" />
  <meta property="fb:app_id" content="966242223397117" />

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImageUrl}" />

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #001A3D;
      color: #ffffff;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: linear-gradient(135deg, #002244 0%, #0050b3 50%, #00AEEF 100%);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .badge {
      background: #facc15;
      color: #001A3D;
      font-weight: 900;
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 12px;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 16px;
    }
    .btn {
      background: #ffffff;
      color: #002244;
      font-weight: 800;
      padding: 16px 28px;
      border-radius: 16px;
      text-decoration: none;
      display: inline-block;
      margin-top: 24px;
      font-size: 15px;
      transition: transform 0.1s ease;
    }
    .btn:hover {
      transform: scale(1.03);
    }
    .score {
      font-size: 54px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
      margin: 12px 0 6px;
    }
    .sub {
      color: #bae6fd;
      font-size: 14px;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🇦🇴 NgolaTeste • Resumo Oficial</div>
    <h2 style="margin: 0; font-size: 20px;">${candidateName}</h2>
    <div class="score">${finalGrade} <span style="font-size: 24px; color: #facc15;">/ 20</span></div>
    <p class="sub">${score} de ${total} Questões Corretas (${percentage}%)</p>
    <p style="color: #e0f2fe; font-size: 13px; margin: 16px 0 0 0; line-height: 1.5;">
      Especialidade: <strong>${category}</strong><br/>
      💡 <em>Desafio dos 100 Likes: Apoie este candidato para ganhar 1 inscrição gratuita no NgolaTeste!</em>
    </p>

    <a href="/" class="btn">🚀 Fazer Simulado Grátis no NgolaTeste</a>
  </div>
</body>
</html>`;

  res.send(html);
});

// Endpoint serving image directly if stored as dataUri
app.get("/api/share/image/:id", (req, res) => {
  const result = sharedResultsMap.get(req.params.id);
  if (result && result.imageDataUri && result.imageDataUri.startsWith("data:image")) {
    const base64Data = result.imageDataUri.replace(/^data:image\/\w+;base64,/, "");
    const img = Buffer.from(base64Data, "base64");
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length,
      "Cache-Control": "public, max-age=86400",
    });
    return res.end(img);
  }
  // Redirect to official logo
  res.redirect("https://tmvhypfpqocgksaxywuj.supabase.co/storage/v1/object/public/Logotipo/ngola%20teste%20logotipo.png");
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
