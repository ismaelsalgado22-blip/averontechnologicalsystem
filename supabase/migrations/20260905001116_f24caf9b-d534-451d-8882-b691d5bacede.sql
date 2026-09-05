REVOKE ALL ON FUNCTION public.next_doc_number(text) FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.consume_stock() FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.set_doc_number() FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated, anon, public;