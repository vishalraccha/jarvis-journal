-- ==============================================================================
-- STORAGE BUCKETS SETUP FOR TRADE ATTACHMENTS & JOURNAL SCREENSHOTS
-- ==============================================================================

-- Create buckets for attachments and screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('trade-attachments', 'trade-attachments', false),
    ('journal-screenshots', 'journal-screenshots', false),
    ('strategy-charts', 'strategy-charts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies: Authenticated users can upload and view only their own files
CREATE POLICY "Users can upload their own trade attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('trade-attachments', 'journal-screenshots', 'strategy-charts') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own trade attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('trade-attachments', 'journal-screenshots', 'strategy-charts') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own trade attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('trade-attachments', 'journal-screenshots', 'strategy-charts') AND (storage.foldername(name))[1] = auth.uid()::text);
