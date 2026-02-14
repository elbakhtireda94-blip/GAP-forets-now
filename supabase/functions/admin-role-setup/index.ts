import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Verify the calling user's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("admin-role-setup: No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Non authentifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create anon client to verify the caller
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      console.error("admin-role-setup: Auth error", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Session invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`admin-role-setup: Request from user ${user.id} (${user.email})`);

    // 2) Use service role client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 3) Check if ANY admin already exists
    const { data: existingAdmins, error: checkError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("role", "ADMIN");

    if (checkError) {
      console.error("admin-role-setup: Error checking admins", checkError.message);
      return new Response(
        JSON.stringify({ success: false, error: checkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      console.warn("admin-role-setup: Admin already exists, rejecting promotion");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Un administrateur existe déjà. Contactez-le pour obtenir les droits.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Check if user already has a role entry → update it; otherwise insert
    const { data: existingRole, error: roleCheckError } = await adminClient
      .from("user_roles")
      .select("id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleCheckError) {
      console.error("admin-role-setup: Error checking user role", roleCheckError.message);
      return new Response(
        JSON.stringify({ success: false, error: roleCheckError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingRole) {
      // Update existing role to ADMIN
      const { error: updateError } = await adminClient
        .from("user_roles")
        .update({ role: "ADMIN" })
        .eq("id", existingRole.id);

      if (updateError) {
        console.error("admin-role-setup: Error updating role", updateError.message);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`admin-role-setup: Updated user ${user.id} role from ${existingRole.role} to ADMIN`);
    } else {
      // Insert new ADMIN role
      const { error: insertError } = await adminClient
        .from("user_roles")
        .insert({ user_id: user.id, role: "ADMIN" });

      if (insertError) {
        console.error("admin-role-setup: Error inserting role", insertError.message);
        return new Response(
          JSON.stringify({ success: false, error: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`admin-role-setup: Inserted ADMIN role for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Rôle ADMIN attribué avec succès" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-role-setup: Unexpected error", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
