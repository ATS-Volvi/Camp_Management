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

    // Verify calling user is super_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", callingUser.id);
    const isSuperAdmin = roles?.some(r => r.role === "super_admin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Insufficient permissions - super_admin required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── CREATE USER ───
    if (action === "create_user") {
      const { email, full_name, role, password } = body;
      if (!email || !full_name || !role) {
        return new Response(JSON.stringify({ error: "Missing required fields: email, full_name, role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user with invite (sends email automatically)
      const tempPassword = password || crypto.randomUUID().slice(0, 16) + "A1!";
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name, display_name: full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign role
      await supabaseAdmin.from("user_roles").insert({
        user_id: newUser.user!.id,
        role,
      });

      // Update profile
      await supabaseAdmin.from("profiles").update({
        full_name,
        email,
        must_change_password: true,
      }).eq("user_id", newUser.user!.id);

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: callingUser.id,
        action: "user_created",
        table_name: "auth.users",
        record_id: newUser.user!.id,
        details: { email, full_name, role },
      });

      // Send password reset email so user sets their own password
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      return new Response(JSON.stringify({
        success: true,
        user_id: newUser.user!.id,
        message: "User created. They can use the temporary password or request a reset.",
        temp_password: tempPassword,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── DISABLE / ENABLE USER ───
    if (action === "toggle_user_status") {
      const { target_user_id, is_disabled } = body;
      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (is_disabled) {
        await supabaseAdmin.auth.admin.updateUserById(target_user_id, { ban_duration: "876000h" });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(target_user_id, { ban_duration: "none" });
      }

      await supabaseAdmin.from("profiles").update({ is_disabled }).eq("user_id", target_user_id);

      await supabaseAdmin.from("audit_logs").insert({
        user_id: callingUser.id,
        action: is_disabled ? "user_disabled" : "user_enabled",
        table_name: "profiles",
        record_id: target_user_id,
        details: { is_disabled },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CHANGE USER ROLE ───
    if (action === "change_role") {
      const { target_user_id, new_role } = body;
      if (!target_user_id || !new_role) {
        return new Response(JSON.stringify({ error: "Missing target_user_id or new_role" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get old role for audit
      const { data: oldRoles } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", target_user_id);

      // Delete existing roles and insert new one
      await supabaseAdmin.from("user_roles").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id: target_user_id, role: new_role });

      await supabaseAdmin.from("audit_logs").insert({
        user_id: callingUser.id,
        action: "role_changed",
        table_name: "user_roles",
        record_id: target_user_id,
        details: { old_roles: oldRoles?.map(r => r.role), new_role },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESET PASSWORD ───
    if (action === "reset_password") {
      const { target_user_id, target_email } = body;
      if (!target_user_id || !target_email) {
        return new Response(JSON.stringify({ error: "Missing target_user_id or target_email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tempPassword = crypto.randomUUID().slice(0, 12) + "X1!";
      await supabaseAdmin.auth.admin.updateUserById(target_user_id, { password: tempPassword });
      await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("user_id", target_user_id);

      await supabaseAdmin.from("audit_logs").insert({
        user_id: callingUser.id,
        action: "password_reset_by_admin",
        table_name: "auth.users",
        record_id: target_user_id,
        details: { target_email },
      });

      return new Response(JSON.stringify({
        success: true,
        temp_password: tempPassword,
        message: "Password reset. User must change on next login.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── UPDATE USER DETAILS ───
    if (action === "update_user") {
      const { target_user_id, full_name, display_name } = body;
      if (!target_user_id) {
        return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, any> = {};
      if (full_name) updates.full_name = full_name;
      if (display_name) updates.display_name = display_name;

      await supabaseAdmin.from("profiles").update(updates).eq("user_id", target_user_id);

      await supabaseAdmin.from("audit_logs").insert({
        user_id: callingUser.id,
        action: "user_updated",
        table_name: "profiles",
        record_id: target_user_id,
        details: updates,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIST USERS ───
    if (action === "list_users") {
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all profiles and roles
      const { data: profiles } = await supabaseAdmin.from("profiles").select("*");
      const { data: allRoles } = await supabaseAdmin.from("user_roles").select("*");

      const users = authUsers.users.map(u => {
        const profile = profiles?.find(p => p.user_id === u.id);
        const userRoles = allRoles?.filter(r => r.user_id === u.id) || [];
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || profile?.display_name || u.email,
          display_name: profile?.display_name,
          is_disabled: profile?.is_disabled || !!u.banned_until,
          must_change_password: profile?.must_change_password || false,
          roles: userRoles.map(r => r.role),
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        };
      });

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
