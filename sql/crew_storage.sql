-- Create storage bucket for crew profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('crew-photos', 'crew-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for crew photos
CREATE POLICY "Allow authenticated users to upload crew photos" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'crew-photos');

CREATE POLICY "Allow authenticated users to view crew photos" ON storage.objects
    FOR SELECT TO authenticated 
    USING (bucket_id = 'crew-photos');

CREATE POLICY "Allow authenticated users to update crew photos" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (bucket_id = 'crew-photos')
    WITH CHECK (bucket_id = 'crew-photos');

CREATE POLICY "Allow authenticated users to delete crew photos" ON storage.objects
    FOR DELETE TO authenticated 
    USING (bucket_id = 'crew-photos');

-- Allow public access to view crew photos (for displaying profile pictures)
CREATE POLICY "Allow public to view crew photos" ON storage.objects
    FOR SELECT TO public 
    USING (bucket_id = 'crew-photos');
