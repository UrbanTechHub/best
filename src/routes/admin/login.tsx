import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, getMyRoles, signOut } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({
    meta: [
      { title: "Admin sign in — Chase" },
      { name: "description", content: "Administrator access." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";

function AdminLogin() {
  const navigate = useNavigate();
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
      const roles = await getMyRoles();
      if (!roles.includes("admin")) {
        await signOut();
        throw new Error("This account is not an administrator.");
      }
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-neutral-100">
      <header
        className="px-5 py-5 flex items-center gap-3 text-white"
        style={{ backgroundColor: "#0b1f33" }}
      >
        <Link to="/" className="p-1 -ml-1 text-white" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </Link>
        <span className="text-[18px] font-semibold tracking-wide">Chase Admin</span>
      </header>

      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-md mt-10 bg-white shadow-md px-7 py-8 rounded"
      >
        <h1 className="text-[24px] font-semibold text-neutral-900">Administrator sign in</h1>
        <p className="text-[14px] text-neutral-600 mt-2">
          Restricted to authorized staff only.
        </p>

        <label className="block mt-6">
          <span className="text-[14px] text-neutral-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border-b border-neutral-400 pb-1.5 bg-transparent outline-none text-[16px]"
            required
          />
        </label>

        <label className="block mt-6">
          <span className="text-[14px] text-neutral-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border-b border-neutral-400 pb-1.5 bg-transparent outline-none text-[16px]"
            required
          />
        </label>

        {error && <p className="mt-4 text-[14px] text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 py-3 text-white text-[16px] font-semibold disabled:opacity-60"
          style={{ backgroundColor: "#0b1f33" }}
        >
          {loading ? "Signing in…" : "Sign in to admin"}
        </button>
      </form>
    </main>
  );
}
