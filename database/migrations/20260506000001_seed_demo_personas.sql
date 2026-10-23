-- Seed auth.users first for FK constraints
INSERT INTO auth.users (id, email)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'manager@camp.com'),
  ('00000000-0000-0000-0000-000000000003', 'catering@camp.com')
ON CONFLICT (id) DO NOTHING;

-- Seed app_users
INSERT INTO public.app_users (id, email, password_hash)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'manager@camp.com', '$2b$10$WThGWP.YGcF3H.kyJpVN4ucHYybxH.j0VRDBXXMvNX4DPJ5gIB8se'),
  ('00000000-0000-0000-0000-000000000003', 'catering@camp.com', '$2b$10$WThGWP.YGcF3H.kyJpVN4ucHYybxH.j0VRDBXXMvNX4DPJ5gIB8se')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash;

-- Seed profiles
INSERT INTO public.profiles (user_id, display_name)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Camp Manager'),
  ('00000000-0000-0000-0000-000000000003', 'Catering Supervisor')
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Seed user roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'camp_manager'),
  ('00000000-0000-0000-0000-000000000003', 'store_keeper')
ON CONFLICT (user_id, role) DO NOTHING;
