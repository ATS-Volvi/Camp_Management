
-- Permissions table: defines all module/feature/action combinations
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  feature text NOT NULL,
  action text NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'approve')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module, feature, action)
);

-- Role-permission mapping
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, permission_id)
);

-- Add must_change_password to profiles for forced password change
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table: everyone can read, only super_admin can manage
CREATE POLICY "auth_read_permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_permissions" ON public.permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Role permissions: everyone can read, only super_admin can manage
CREATE POLICY "auth_read_role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_role_permissions" ON public.role_permissions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_update_role_permissions" ON public.role_permissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_delete_role_permissions" ON public.role_permissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _feature text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role AND rp.granted = true
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.feature = _feature
      AND p.action = _action
  )
$$;

-- Seed default permissions for all modules
INSERT INTO public.permissions (module, feature, action, description) VALUES
  -- Dashboard
  ('dashboard', 'overview', 'view', 'View dashboard overview'),
  -- Employee
  ('employees', 'list', 'view', 'View employee list'),
  ('employees', 'list', 'create', 'Create employees'),
  ('employees', 'list', 'edit', 'Edit employees'),
  ('employees', 'list', 'delete', 'Delete employees'),
  -- Camp Management
  ('camps', 'list', 'view', 'View camps'),
  ('camps', 'list', 'create', 'Create camps'),
  ('camps', 'list', 'edit', 'Edit camps'),
  ('camps', 'list', 'delete', 'Delete camps'),
  -- Check-in/out
  ('checkinout', 'operations', 'view', 'View check-in/out'),
  ('checkinout', 'operations', 'create', 'Perform check-in/out'),
  -- Maintenance
  ('maintenance', 'tickets', 'view', 'View maintenance tickets'),
  ('maintenance', 'tickets', 'create', 'Create maintenance tickets'),
  ('maintenance', 'tickets', 'edit', 'Edit/assign maintenance tickets'),
  ('maintenance', 'tickets', 'approve', 'Approve/close maintenance tickets'),
  -- Inventory
  ('inventory', 'stock', 'view', 'View inventory'),
  ('inventory', 'stock', 'create', 'Add inventory items'),
  ('inventory', 'stock', 'edit', 'Edit inventory'),
  -- Assets
  ('assets', 'management', 'view', 'View assets'),
  ('assets', 'management', 'create', 'Create assets'),
  ('assets', 'management', 'edit', 'Edit assets'),
  ('assets', 'management', 'delete', 'Delete assets'),
  -- Item Assignments
  ('assignments', 'items', 'view', 'View item assignments'),
  ('assignments', 'items', 'create', 'Create item assignments'),
  ('assignments', 'items', 'edit', 'Edit item assignments'),
  -- Attendance
  ('attendance', 'records', 'view', 'View attendance'),
  ('attendance', 'records', 'create', 'Record attendance'),
  -- Mess & Catering
  ('catering', 'menu', 'view', 'View catering'),
  ('catering', 'menu', 'create', 'Manage catering'),
  ('catering', 'menu', 'edit', 'Edit catering config'),
  -- Visitors
  ('visitors', 'management', 'view', 'View visitors'),
  ('visitors', 'management', 'create', 'Register visitors'),
  ('visitors', 'management', 'edit', 'Edit visitor records'),
  -- Reports
  ('reports', 'analytics', 'view', 'View reports'),
  ('reports', 'ai', 'view', 'View AI reports'),
  -- User Management (admin only)
  ('admin', 'users', 'view', 'View user management'),
  ('admin', 'users', 'create', 'Create users'),
  ('admin', 'users', 'edit', 'Edit users'),
  ('admin', 'users', 'delete', 'Disable users'),
  ('admin', 'permissions', 'view', 'View permission matrix'),
  ('admin', 'permissions', 'edit', 'Edit permission matrix'),
  -- Alerts
  ('alerts', 'notifications', 'view', 'View alerts'),
  -- Activities
  ('activities', 'log', 'view', 'View activity log');

-- Seed default role permissions: super_admin gets everything
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'super_admin', id, true FROM public.permissions;

-- camp_manager gets most things except admin
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'camp_manager', id, true FROM public.permissions WHERE module != 'admin';

-- hr_admin gets employee, checkinout, attendance, reports
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'hr_admin', id, true FROM public.permissions 
WHERE module IN ('dashboard', 'employees', 'checkinout', 'attendance', 'reports', 'alerts', 'activities');

-- store_keeper gets inventory, assets, assignments, catering
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'store_keeper', id, true FROM public.permissions 
WHERE module IN ('dashboard', 'inventory', 'assets', 'assignments', 'catering', 'alerts', 'activities');

-- maintenance_supervisor gets maintenance, assets
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'maintenance_supervisor', id, true FROM public.permissions 
WHERE module IN ('dashboard', 'maintenance', 'assets', 'alerts', 'activities');

-- security gets visitors, checkinout, maintenance view
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'security', id, true FROM public.permissions 
WHERE module IN ('dashboard', 'visitors', 'checkinout', 'maintenance', 'alerts')
AND action = 'view';
-- security can also create visitors and maintenance tickets
INSERT INTO public.role_permissions (role, permission_id, granted)
SELECT 'security', id, true FROM public.permissions 
WHERE (module = 'visitors' AND action = 'create') OR (module = 'maintenance' AND action = 'create');

-- Update handle_new_user to populate email/full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
