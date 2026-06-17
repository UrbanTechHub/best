-- Ensure realtime delivers force_logout flips instantly.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
