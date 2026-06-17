import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";

/**
 * Watches the current user's `profiles.force_logout` flag. When an admin
 * flips it on, the user is signed out and redirected to /locked.
 *
 * Uses three signals so the lock takes effect quickly no matter what the
 * user is doing:
 *  1. Realtime postgres_changes subscription on their profile row.
 *  2. Short polling fallback (every 5s) in case realtime is unavailable.
 *  3. Re-check whenever the tab becomes visible / regains focus.
 */
export function useForceLogoutGuard() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    let triggered = false;

    const lockOut = async () => {
      if (triggered || cancelled) return;
      triggered = true;
      try {
        await signOut();
      } catch {
        /* ignore */
      }
      navigate({ to: "/locked" });
    };

    const check = async () => {
      if (triggered || cancelled) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("force_logout")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data && (data as { force_logout: boolean }).force_logout) {
        await lockOut();
      }
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel(`force-logout-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const next = (payload.new as { force_logout?: boolean } | null)?.force_logout;
            if (next) void lockOut();
          },
        )
        .subscribe();
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    check();
    const id = window.setInterval(check, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);
}
