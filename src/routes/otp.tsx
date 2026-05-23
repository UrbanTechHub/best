import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

export const Route = createFileRoute("/otp")({
  component: OtpPage,
  head: () => ({
    meta: [
      { title: "Verify your identity — Chase" },
      { name: "description", content: "Enter your one-time identification code." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";

function OtpPage() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const complete = digits.every((d) => d);

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Blue top region — matches login */}
      <div
        className="flex-1 min-h-[40vh] sm:min-h-[45vh]"
        style={{ backgroundColor: CHASE_BLUE }}
      />

      <div className="mx-auto w-full max-w-md px-4 sm:px-6 relative">
        <section className="bg-white shadow-md px-5 sm:px-7 pt-7 pb-7 -mt-[22vh] sm:-mt-[26vh] relative z-10">
          <h1 className="text-[24px] font-semibold text-neutral-900 leading-snug">
            Enter your identification code
          </h1>
          <p className="text-[15px] text-neutral-700 mt-3 leading-relaxed">
            We sent a 6-digit code to the phone number ending in
            <span className="font-semibold"> ••• 4421</span>. The code expires in 10 minutes.
          </p>

          <div className="mt-7 flex items-center justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-[24px] font-semibold border-b-2 outline-none bg-transparent text-neutral-900"
                style={{ borderColor: d ? CHASE_BLUE : "#9ca3af" }}
              />
            ))}
          </div>

          <button
            type="button"
            className="mt-5 text-[15px] font-semibold"
            style={{ color: CHASE_BLUE }}
          >
            Resend code
          </button>

          <div className="mt-6 rounded-lg p-4" style={{ backgroundColor: "#E6F1FB" }}>
            <p className="text-[13.5px] text-neutral-800 leading-relaxed">
              Chase will never call, text or email you asking for this code. If anyone asks, do not share it.
            </p>
          </div>

          <button
            type="button"
            disabled={!complete}
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full py-3.5 text-white text-[17px] font-medium mt-7 disabled:opacity-50"
            style={{ backgroundColor: CHASE_BLUE }}
          >
            Next
          </button>
        </section>

        <div className="pt-5 pb-10 text-center text-[14px]">
          <Link to="/" className="underline font-medium" style={{ color: CHASE_BLUE }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
