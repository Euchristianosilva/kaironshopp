
-- Leitura pública das imagens do bucket
CREATE POLICY "product_images_public_select" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Vendedor pode gerenciar arquivos dentro de uma pasta = seu seller_id
CREATE POLICY "product_images_seller_insert" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.sellers WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "product_images_seller_update" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.sellers WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "product_images_seller_delete" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.sellers WHERE owner_id = auth.uid()
  )
);
