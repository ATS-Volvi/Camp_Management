-- Seed a default admin user
-- Email: admin@example.com
-- Password: admin123
INSERT INTO public.app_users (id, email, password_hash)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@example.com',
    '$2b$10$WThGWP.YGcF3H.kyJpVN4ucHYybxH.j0VRDBXXMvNX4DPJ5gIB8se'
) ON CONFLICT (email) DO NOTHING;

-- Create matching profile
INSERT INTO public.profiles (user_id, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Super Admin')
ON CONFLICT (user_id) DO NOTHING;

-- Assign super_admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed some sample data if tables are empty
INSERT INTO public.camps (id, name, location)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Main Camp Alpha', 'Jubail Industrial City'),
    ('c2222222-2222-2222-2222-222222222222', 'Worker Village Beta', 'Yanbu Industrial City')
ON CONFLICT DO NOTHING;
