import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoAccount {
  email: string;
  password: string;
  full_name: string;
  role_label: string;
  scope_level: "ADMIN" | "NATIONAL" | "REGIONAL" | "PROVINCIAL" | "LOCAL";
  dranef_id: string | null;
  dpanef_id: string | null;
  commune_ids: string[];
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "demo-dg@anef.ma",
    password: "demo2026",
    full_name: "DG Démonstration",
    role_label: "DG",
    scope_level: "NATIONAL",
    dranef_id: null,
    dpanef_id: null,
    commune_ids: [],
  },
  {
    email: "demo-dranef@anef.ma",
    password: "demo2026",
    full_name: "DRANEF Démonstration",
    role_label: "DRANEF",
    scope_level: "REGIONAL",
    dranef_id: "DRANEF-RSK",
    dpanef_id: null,
    commune_ids: [],
  },
  {
    email: "demo-dpanef@anef.ma",
    password: "demo2026",
    full_name: "DPANEF Démonstration",
    role_label: "DPANEF",
    scope_level: "PROVINCIAL",
    dranef_id: "DRANEF-RSK",
    dpanef_id: "DPANEF-KEN",
    commune_ids: [],
  },
  {
    email: "demo-adp@anef.ma",
    password: "demo2026",
    full_name: "ADP Démonstration",
    role_label: "ADP",
    scope_level: "LOCAL",
    dranef_id: "DRANEF-RSK",
    dpanef_id: "DPANEF-KEN",
    commune_ids: ["COM-KNTR-01", "COM-KNTR-02"],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results: { email: string; status: string; error?: string }[] = [];

    for (const account of DEMO_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u) => u.email === account.email
        );

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          // Update password
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: account.password,
            email_confirm: true,
          });
          results.push({ email: account.email, status: "updated" });
        } else {
          // Create user
          const { data: newUser, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email: account.email,
              password: account.password,
              email_confirm: true,
              user_metadata: { full_name: account.full_name },
            });

          if (createError) {
            results.push({
              email: account.email,
              status: "error",
              error: createError.message,
            });
            continue;
          }
          userId = newUser.user.id;
          results.push({ email: account.email, status: "created" });
        }

        // Update profile with territorial assignments
        await supabaseAdmin
          .from("profiles")
          .update({
            full_name: account.full_name,
            role_label: account.role_label,
            dranef_id: account.dranef_id,
            dpanef_id: account.dpanef_id,
            commune_ids: account.commune_ids,
          })
          .eq("user_id", userId);

        // Upsert user role
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingRole) {
          await supabaseAdmin
            .from("user_roles")
            .update({ role: account.scope_level })
            .eq("user_id", userId);
        } else {
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userId, role: account.scope_level });
        }
      } catch (accountError) {
        results.push({
          email: account.email,
          status: "error",
          error: String(accountError),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
