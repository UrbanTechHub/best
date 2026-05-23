import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({
    meta: [
      { title: "Profile & settings — Chase" },
      { name: "description", content: "Update your name, phone, address, and password." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";
const NAVY = "#0b1f33";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  account_number: string;
};

function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [profMsg, setProfMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [profBusy, setProfBusy] = useState(false);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/" });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id,email,full_name,phone,address,account_number")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const p = data as Profile;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setAddress(p.address ?? "");
      }
    })();
  }, [navigate]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfBusy(true);
    setProfMsg(null);
    try {
      const name = fullName.trim();
      if (!name) throw new Error("Name cannot be empty.");
      if (name.length > 120) throw new Error("Name is too long.");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, phone: phone.trim(), address: address.trim() })
        .eq("id", profile.id);
      if (error) throw error;
      setProfMsg({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setProfMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed." });
    } finally {
      setProfBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw1.length < 8) {
      setPwMsg({ kind: "err", text: "Password must be at least 8 characters." });
      return;
    }
    if (pw1 !== pw2) {
      setPwMsg({ kind: "err", text: "Passwords don't match." });
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1("");
      setPw2("");
      setPwMsg({ kind: "ok", text: "Password updated." });
    } catch (err) {
      setPwMsg({ kind: "err", text: err instanceof Error ? err.message : "Failed." });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-100">
      <header
        className="px-5 py-4 flex items-center gap-3 text-white"
        style={{ backgroundColor: NAVY }}
      >
        <Link to="/dashboard" className="p-1 -ml-1 text-white" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </Link>
        <span className="text-[18px] font-semibold">Profile & settings</span>
      </header>

      <div className="max-w-xl mx-auto p-5 space-y-5">
        {profile && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="text-[12px] uppercase tracking-wide text-neutral-500">Account</div>
            <div className="text-[15px] text-neutral-900 mt-1">{profile.email}</div>
            <div className="text-[13px] text-neutral-600 mt-0.5">
              Acct ••• {profile.account_number.slice(-4)}
            </div>
          </div>
        )}

        <form onSubmit={saveProfile} className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-[18px] font-semibold text-neutral-900">Personal info</h2>
          <label className="block mt-4">
            <span className="text-[13px] text-neutral-700">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              required
              className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[16px] outline-none focus:border-neutral-500"
            />
          </label>
          <label className="block mt-4">
            <span className="text-[13px] text-neutral-700">Phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[16px] outline-none focus:border-neutral-500"
            />
          </label>
          <label className="block mt-4">
            <span className="text-[13px] text-neutral-700">Address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={240}
              className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[16px] outline-none focus:border-neutral-500"
            />
          </label>
          {profMsg && (
            <p className={`mt-3 text-[13px] ${profMsg.kind === "ok" ? "text-green-700" : "text-red-700"}`}>
              {profMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={profBusy}
            className="w-full mt-5 py-3 text-white text-[15px] font-semibold rounded disabled:opacity-60"
            style={{ backgroundColor: CHASE_BLUE }}
          >
            {profBusy ? "Saving…" : "Save changes"}
          </button>
        </form>

        <form onSubmit={changePassword} className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-[18px] font-semibold text-neutral-900">Change password</h2>
          <label className="block mt-4">
            <span className="text-[13px] text-neutral-700">New password</span>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              minLength={8}
              maxLength={72}
              required
              className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[16px] outline-none focus:border-neutral-500"
            />
          </label>
          <label className="block mt-4">
            <span className="text-[13px] text-neutral-700">Confirm new password</span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              minLength={8}
              maxLength={72}
              required
              className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[16px] outline-none focus:border-neutral-500"
            />
          </label>
          {pwMsg && (
            <p className={`mt-3 text-[13px] ${pwMsg.kind === "ok" ? "text-green-700" : "text-red-700"}`}>
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwBusy}
            className="w-full mt-5 py-3 text-white text-[15px] font-semibold rounded disabled:opacity-60"
            style={{ backgroundColor: NAVY }}
          >
            {pwBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
