import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Permission {
  module: string;
  feature: string;
  action: string;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id,
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ["user-permissions", userRoles],
    queryFn: async () => {
      if (userRoles.length === 0) return [];
      const { data } = await supabase
        .from("role_permissions")
        .select("granted, permissions(module, feature, action)")
        .in("role", userRoles)
        .eq("granted", true);
      return (data || []).map((rp: any) => rp.permissions as Permission).filter(Boolean);
    },
    enabled: userRoles.length > 0,
  });

  const isSuperAdmin = userRoles.includes("super_admin");

  const hasPermission = (module: string, feature: string, action: string): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some(
      p => p.module === module && p.feature === feature && p.action === action
    );
  };

  const canView = (module: string, feature: string = "list") => hasPermission(module, feature, "view");
  const canCreate = (module: string, feature: string = "list") => hasPermission(module, feature, "create");
  const canEdit = (module: string, feature: string = "list") => hasPermission(module, feature, "edit");
  const canDelete = (module: string, feature: string = "list") => hasPermission(module, feature, "delete");
  const canApprove = (module: string, feature: string = "list") => hasPermission(module, feature, "approve");

  return {
    userRoles,
    permissions,
    isSuperAdmin,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
  };
}
