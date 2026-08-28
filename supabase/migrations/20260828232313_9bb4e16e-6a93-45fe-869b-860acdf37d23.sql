REVOKE EXECUTE ON FUNCTION public.next_doc_number(TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_doc_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_stock() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_warranty_end() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon;