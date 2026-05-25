import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";

/**
 * Polls the current user's `profiles.force_logout` flag. When an admin
 * flips it on, the user is signed out and redirected to /locked.
 */
export function useForceLogoutGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("force_logout")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data && (data as { force_logout: boolean }).force_logout) {
        await signOut();
        navigate({ to: "/locked" });
      }
    };

    check();
    const id = window.setInterval(check, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [navigate]);
}
