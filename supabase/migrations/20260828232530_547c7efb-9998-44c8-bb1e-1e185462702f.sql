CREATE POLICY "mecfrio_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mecfrio');
CREATE POLICY "mecfrio_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mecfrio');
CREATE POLICY "mecfrio_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mecfrio') WITH CHECK (bucket_id = 'mecfrio');
CREATE POLICY "mecfrio_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mecfrio');