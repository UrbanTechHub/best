
alter function public.handle_new_user() set search_path = public;
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
