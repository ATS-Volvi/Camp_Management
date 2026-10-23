
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read invoice files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can upload invoice files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can update invoice files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'invoices');

CREATE POLICY "Authenticated users can delete invoice files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'invoices');
