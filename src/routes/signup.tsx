import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Open an account — Chase" },
      { name: "description", content: "Create your Chase account." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";

function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(form.email.trim(), form.password, form.fullName.trim(), form.phone.trim());
      navigate({ to: "/otp" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header
        className="px-5 py-4 flex items-center gap-3 text-white"
        style={{ backgroundColor: CHASE_BLUE }}
      >
        <Link to="/" className="p-1 -ml-1" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </Link>
        <span className="text-[17px] font-semibold">Open an account</span>
      </header>

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-md px-6 pt-8 pb-12">
        <h1 className="text-[26px] font-semibold text-neutral-900">Create your account</h1>
        <p className="text-[15px] text-neutral-700 mt-2">It only takes a minute.</p>

        <Field label="Full name" value={form.fullName} onChange={set("fullName")} required />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
        <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
        <Field label="Password" type="password" value={form.password} onChange={set("password")} required />

        {error && (
          <p className="mt-4 text-[14px] text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-8 py-3.5 text-white text-[17px] font-medium disabled:opacity-60"
          style={{ backgroundColor: CHASE_BLUE }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="mt-6 text-center text-[15px] text-neutral-700">
          Already have an account?{" "}
          <Link to="/" className="font-semibold underline" style={{ color: CHASE_BLUE }}>
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block mt-6">
      <span className="text-[15px] text-neutral-700">{label}</span>
      <input
        {...rest}
        className="mt-2 w-full border-b border-neutral-400 pb-1.5 bg-transparent outline-none text-[17px] text-neutral-900"
      />
    </label>
  );
}
