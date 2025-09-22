-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for project images
CREATE POLICY "Allow authenticated users to upload project images" ON storage.objects
    FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Allow authenticated users to view project images" ON storage.objects
    FOR SELECT TO authenticated 
    USING (bucket_id = 'project-images');

CREATE POLICY "Allow authenticated users to update project images" ON storage.objects
    FOR UPDATE TO authenticated 
    USING (bucket_id = 'project-images')
    WITH CHECK (bucket_id = 'project-images');

CREATE POLICY "Allow authenticated users to delete project images" ON storage.objects
    FOR DELETE TO authenticated 
    USING (bucket_id = 'project-images');

-- Allow public access to view project images (for displaying project pictures)
CREATE POLICY "Allow public to view project images" ON storage.objects
    FOR SELECT TO public 
    USING (bucket_id = 'project-images');
