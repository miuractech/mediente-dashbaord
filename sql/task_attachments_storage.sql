-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Create storage policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- Create storage policy for authenticated users to view files
CREATE POLICY "Authenticated users can view files" ON storage.objects
FOR SELECT USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- Create storage policy for authenticated users to delete files
CREATE POLICY "Authenticated users can delete files" ON storage.objects
FOR DELETE USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');
