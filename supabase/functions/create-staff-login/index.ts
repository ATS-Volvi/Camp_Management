import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify calling user is admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if calling user is super_admin or camp_manager
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);
    
    const isAdmin = roles?.some(r => r.role === "super_admin" || r.role === "camp_manager");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, employee_id, staff_role } = await req.json();

    if (!email || !password || !employee_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map staff_role to app_role
    let appRole = "security"; // default
    if (staff_role === "Warden" || staff_role === "Supervisor") appRole = "camp_manager";
    else if (["Electrician", "Plumber"].includes(staff_role)) appRole = "maintenance_supervisor";
    else if (staff_role === "Security Guard") appRole = "security";
    else if (staff_role === "Cook" || staff_role === "Cleaner" || staff_role === "Driver") appRole = "store_keeper";

    // Get employee's camp_id
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("camp_id")
      .eq("id", employee_id)
      .single();

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user!.id,
      role: appRole,
      camp_id: employee?.camp_id || null,
    });

    // Link user to employee record
    await supabaseAdmin
      .from("employees")
      .update({ user_id: newUser.user!.id, email })
      .eq("id", employee_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUser.user!.id,
        role: appRole,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
