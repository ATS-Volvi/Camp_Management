
-- Create visitors table
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  id_number TEXT,
  id_type TEXT DEFAULT 'national_id',
  purpose TEXT NOT NULL,
  host_employee_id UUID REFERENCES public.employees(id),
  camp_id UUID NOT NULL REFERENCES public.camps(id),
  room_id UUID REFERENCES public.rooms(id),
  badge_number TEXT,
  vehicle_number TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_check_out TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'checked_in',
  remarks TEXT,
  checked_in_by UUID,
  checked_out_by UUID,
  items_carried TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read visitors"
  ON public.visitors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Security and admins can insert visitors"
  ON public.visitors FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'camp_manager'::app_role) OR 
    has_role(auth.uid(), 'security'::app_role)
  );

CREATE POLICY "Security and admins can update visitors"
  ON public.visitors FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR 
    has_role(auth.uid(), 'camp_manager'::app_role) OR 
    has_role(auth.uid(), 'security'::app_role)
  );
