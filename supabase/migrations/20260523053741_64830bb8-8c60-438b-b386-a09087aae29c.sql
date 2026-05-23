
alter function public.set_updated_at() security invoker;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
