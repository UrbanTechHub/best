import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "user";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // If the admin has locked this account, refuse to keep the session.
  try {
    const uid = data.user?.id;
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("force_logout")
        .eq("id", uid)
        .maybeSingle();
      if (prof && (prof as { force_logout: boolean }).force_logout) {
        await supabase.auth.signOut();
        throw new Error(
          "Account has been locked for security reasons. Please contact the bank.",
        );
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Account has been locked")) {
      throw e;
    }
  }
  return data;
}

export async function signUp(email: string, password: string, fullName: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { full_name: fullName, phone },
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getMyRoles(): Promise<Role[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((r) => r.role as Role);
}
