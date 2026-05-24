import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/locked")({
  component: LockedPage,
  head: () => ({
    meta: [
      { title: "Account locked — Chase" },
      { name: "description", content: "Your account access is restricted." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";
const NAVY = "#0b1f33";

function LockedPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <header
        className="px-6 py-4 text-white text-[16px] font-semibold"
        style={{ backgroundColor: NAVY }}
      >
        Chase
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-neutral-200 shadow-sm rounded p-8 text-center">
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#fde7e9" }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#b3261e" strokeWidth="2">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <h1 className="mt-5 text-[22px] font-semibold text-neutral-900">
            Account locked
          </h1>
          <p className="mt-3 text-[15px] text-neutral-700 leading-relaxed">
            Account has been locked for security reasons. Please contact the bank for assistance.
          </p>
          <Link
            to="/"
            className="mt-7 inline-block w-full py-3 text-white text-[15px] font-semibold rounded"
            style={{ backgroundColor: CHASE_BLUE }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
