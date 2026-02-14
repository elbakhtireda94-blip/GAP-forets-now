import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Production email configuration - set these in Supabase Edge Function secrets
// For production: Replace with your verified domain sender (e.g., noreply@anef.ma)
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const FROM_NAME = Deno.env.get("FROM_NAME") || "GAP Forêts";

// Allowed origins for CORS - restrict to your domains
const ALLOWED_ORIGINS = [
  "https://adp-territoire-connect.lovable.app",
  "https://id-preview--bd2cf91d-7249-4d2e-9500-a1d664ed73a5.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

// Get CORS headers based on request origin
const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
};

interface UnlockRequestEmailPayload {
  pdfcp_id: string;
  pdfcp_name: string;
  requester_name: string;
  requester_email: string;
  requester_scope_level: string;
  territoire: string;
  current_validation_status: string;
  reason: string;
  admin_email: string;
}

const VALIDATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  VALIDATED_ADP: "Validé ADP",
  VALIDATED_DPANEF: "Validé DPANEF",
  VISA_DRANEF: "Visa DRANEF",
};

const SCOPE_LABELS: Record<string, string> = {
  LOCAL: "ADP (Local)",
  PROVINCIAL: "DPANEF (Provincial)",
  REGIONAL: "DRANEF (Régional)",
  NATIONAL: "National",
  ADMIN: "Administrateur",
};

// Input validation constants
const MAX_REASON_LENGTH = 1000;
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_PDFCP_NAME_LENGTH = 500;

// Sanitize string for HTML to prevent XSS in email content
const sanitizeForHtml = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= MAX_EMAIL_LENGTH;
};

// Validate and sanitize payload
const validatePayload = (payload: any): { valid: boolean; error?: string; sanitized?: UnlockRequestEmailPayload } => {
  // Check required fields
  if (!payload.pdfcp_id || typeof payload.pdfcp_id !== 'string') {
    return { valid: false, error: "Missing or invalid pdfcp_id" };
  }
  if (!payload.pdfcp_name || typeof payload.pdfcp_name !== 'string') {
    return { valid: false, error: "Missing or invalid pdfcp_name" };
  }
  if (!payload.requester_name || typeof payload.requester_name !== 'string') {
    return { valid: false, error: "Missing or invalid requester_name" };
  }
  if (!payload.requester_email || !isValidEmail(payload.requester_email)) {
    return { valid: false, error: "Missing or invalid requester_email" };
  }
  if (!payload.reason || typeof payload.reason !== 'string') {
    return { valid: false, error: "Missing or invalid reason" };
  }
  if (!payload.admin_email || !isValidEmail(payload.admin_email)) {
    return { valid: false, error: "Missing or invalid admin_email" };
  }

  // Check length limits
  if (payload.reason.length > MAX_REASON_LENGTH) {
    return { valid: false, error: `Reason too long (max ${MAX_REASON_LENGTH} characters)` };
  }
  if (payload.pdfcp_name.length > MAX_PDFCP_NAME_LENGTH) {
    return { valid: false, error: `PDFCP name too long (max ${MAX_PDFCP_NAME_LENGTH} characters)` };
  }
  if (payload.requester_name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Requester name too long (max ${MAX_NAME_LENGTH} characters)` };
  }

  // Sanitize all string fields for HTML
  const sanitized: UnlockRequestEmailPayload = {
    pdfcp_id: sanitizeForHtml(payload.pdfcp_id),
    pdfcp_name: sanitizeForHtml(payload.pdfcp_name),
    requester_name: sanitizeForHtml(payload.requester_name),
    requester_email: payload.requester_email.trim().toLowerCase(),
    requester_scope_level: sanitizeForHtml(payload.requester_scope_level || 'LOCAL'),
    territoire: sanitizeForHtml(payload.territoire || 'Non spécifié'),
    current_validation_status: sanitizeForHtml(payload.current_validation_status || 'DRAFT'),
    reason: sanitizeForHtml(payload.reason),
    admin_email: payload.admin_email.trim().toLowerCase(),
  };

  return { valid: true, sanitized };
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate origin for non-OPTIONS requests
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );
  
  if (!isAllowedOrigin && origin) {
    console.warn(`Rejected request from unauthorized origin: ${origin}`);
    return new Response(
      JSON.stringify({ success: false, error: "Forbidden" }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const rawPayload = await req.json();
    
    // Validate and sanitize input
    const validation = validatePayload(rawPayload);
    if (!validation.valid || !validation.sanitized) {
      console.warn("Invalid payload:", validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload = validation.sanitized;

    const {
      pdfcp_id,
      pdfcp_name,
      requester_name,
      requester_email,
      requester_scope_level,
      territoire,
      current_validation_status,
      reason,
      admin_email,
    } = payload;

    const statusLabel = VALIDATION_STATUS_LABELS[current_validation_status] || current_validation_status;
    const scopeLabel = SCOPE_LABELS[requester_scope_level] || requester_scope_level;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Demande de déverrouillage PDFCP</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">
            🔓 Demande de déverrouillage PDFCP
          </h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #1B4332; margin-top: 0;">Nouvelle demande reçue</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #2D6A4F;">📋 Informations PDFCP</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">ID PDFCP:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${pdfcp_id}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Nom PDFCP:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${pdfcp_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Statut actuel:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                  <span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${statusLabel}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin-top: 0; color: #2D6A4F;">👤 Demandeur</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Nom:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${requester_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
                  <a href="mailto:${requester_email}" style="color: #2D6A4F;">${requester_email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Profil:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${scopeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Territoire:</td>
                <td style="padding: 8px 0;">${territoire}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #FEF2F2; padding: 15px; border-radius: 8px; border-left: 4px solid #DC2626;">
            <h3 style="margin-top: 0; color: #DC2626;">📝 Motif de la demande</h3>
            <p style="margin: 0; white-space: pre-wrap;">${reason}</p>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="color: #666; font-size: 14px;">
              Connectez-vous à l'application pour traiter cette demande.
            </p>
          </div>
        </div>
        
        <div style="background: #1B4332; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="color: white; margin: 0; font-size: 12px;">
            GAP Forêts - Application de Gestion des Plans PDFCP<br>
            Cet email a été envoyé automatiquement, merci de ne pas y répondre.
          </p>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [admin_email],
        reply_to: requester_email,
        subject: `[GAP Forêts] Demande de déverrouillage PDFCP – ${pdfcp_name}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    // Log success without exposing sensitive data
    console.log("Unlock request email sent successfully to admin");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-unlock-request-email function:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: "Failed to send email notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
