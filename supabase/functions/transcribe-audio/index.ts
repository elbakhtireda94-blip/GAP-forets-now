import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { audio_base64, mime_type } = await req.json();

    if (!audio_base64) {
      return new Response(
        JSON.stringify({ error: "No audio data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioMime = mime_type || "audio/webm";

    // Use Gemini's multimodal capabilities via the AI gateway
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Tu es un transcripteur audio professionnel. Transcris fidèlement l'audio ci-joint en texte.

Règles :
- Détecte automatiquement la langue (français, arabe marocain/dialectal, ou mélange des deux).
- Transcris EXACTEMENT ce qui est dit, mot pour mot.
- Pour l'arabe dialectal marocain, transcris en caractères arabes.
- Si l'audio mélange français et arabe, transcris chaque passage dans sa langue.
- Ne traduis PAS. Ne résume PAS. Ne commente PAS.
- Ajoute la ponctuation appropriée pour la lisibilité.
- Si l'audio est inaudible ou vide, réponds uniquement : "[Audio inaudible]"

Retourne UNIQUEMENT le texte transcrit, sans aucune introduction ni commentaire.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${audioMime};base64,${audio_base64}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error [${response.status}]: ${errorText}`);
    }

    const result = await response.json();
    const transcription = result.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ transcription, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
