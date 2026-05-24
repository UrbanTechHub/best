import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { useForceLogoutGuard } from "@/lib/use-force-logout-guard";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Accounts — Chase" },
      { name: "description", content: "Your Chase accounts dashboard." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";
const LIGHT_BG = "#F2F3F5";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  account_number: string;
  balance_cents: number;
};

type Account = {
  id: string;
  kind: "checking" | "savings" | "credit" | "loan";
  name: string;
  account_number: string;
  balance_cents: number;
};

type Txn = {
  id: string;
  type: "credit" | "debit";
  amount_cents: number;
  description: string;
  created_at: string;
};

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function Dashboard() {
  const navigate = useNavigate();
  useForceLogoutGuard();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/" });
        return;
      }
      const [{ data: p }, { data: a }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("accounts")
          .select("id,kind,name,account_number,balance_cents")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("transactions")
          .select("id,type,amount_cents,description,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (!active) return;
      setProfile(p as Profile | null);
      setAccounts((a as Account[]) ?? []);
      setTxns((t as Txn[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  const fullName = profile?.full_name?.trim();

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: LIGHT_BG }}>
      <header className="px-5 pt-3 pb-2 flex items-center justify-between">
        <ChaseLogo />
        <div className="flex items-center gap-4">
          <Link to="/settings" className="text-[14px] font-semibold" style={{ color: CHASE_BLUE }}>
            Settings
          </Link>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="text-[14px] font-semibold"
            style={{ color: CHASE_BLUE }}
          >
            Sign out
          </button>
        </div>
      </header>


      <section className="px-5 pt-3">
        <h1 className="text-[36px] leading-tight font-normal text-neutral-900">
          {greeting}{fullName ? `, ${fullName}` : ""}!
        </h1>
        <p className="text-[16px] text-neutral-800 mt-1">{today}</p>
      </section>

      <div className="mt-5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 px-5 pb-1 min-w-max">
          <Link to="/transfer"><Pill>Pay & transfer</Pill></Link>
          <Pill>Send | Zelle®</Pill>
          <Pill>Deposit checks</Pill>
          <Pill>Pay bills</Pill>
          <Pill>Account services</Pill>
        </div>
      </div>

      <div className="px-5 mt-8 flex items-center justify-between">
        <h2 className="text-[26px] font-normal text-neutral-900">Accounts</h2>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {(() => {
          const bank = accounts.filter((a) => a.kind === "checking" || a.kind === "savings");
          const credit = accounts.filter((a) => a.kind === "credit");
          const loans = accounts.filter((a) => a.kind === "loan");
          const captionFor = (kind: Account["kind"]) =>
            kind === "credit" ? "Current balance" : kind === "loan" ? "Principal balance" : "Available balance";
          return (
            <>
              {bank.length > 0 && (
                <AccountGroup title={`Bank accounts (${bank.length})`}>
                  {bank.map((a, i) => (
                    <div key={a.id}>
                      {i > 0 && <Divider />}
                      <AccountRow
                        name={a.name}
                        sub={`••• ${a.account_number.slice(-4)}`}
                        amount={loading ? "—" : usd(a.balance_cents)}
                        caption={captionFor(a.kind)}
                      />
                    </div>
                  ))}
                </AccountGroup>
              )}
              {credit.length > 0 && (
                <AccountGroup title={`Credit cards (${credit.length})`}>
                  {credit.map((a, i) => (
                    <div key={a.id}>
                      {i > 0 && <Divider />}
                      <AccountRow
                        name={a.name}
                        sub={`••• ${a.account_number.slice(-4)}`}
                        amount={loading ? "—" : usd(a.balance_cents)}
                        caption={captionFor(a.kind)}
                        amountColor={a.balance_cents < 0 ? "#b3261e" : undefined}
                      />
                    </div>
                  ))}
                </AccountGroup>
              )}
              {loans.length > 0 && (
                <AccountGroup title={`Loans (${loans.length})`}>
                  {loans.map((a, i) => (
                    <div key={a.id}>
                      {i > 0 && <Divider />}
                      <AccountRow
                        name={a.name}
                        sub={`••• ${a.account_number.slice(-4)}`}
                        amount={loading ? "—" : usd(a.balance_cents)}
                        caption={captionFor(a.kind)}
                      />
                    </div>
                  ))}
                </AccountGroup>
              )}
            </>
          );
        })()}
      </div>

      <div className="px-5 mt-8 flex items-center justify-between">
        <h2 className="text-[22px] font-semibold text-neutral-900">Transaction history</h2>
      </div>

      <div className="px-4 mt-3 pb-28">
        <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] divide-y divide-neutral-200">
          {loading && <Row left="Loading…" right="" />}
          {!loading && txns.length === 0 && (
            <Row left="No transactions yet" right="" sub="Your activity will appear here" />
          )}
          {txns.map((t) => (
            <Row
              key={t.id}
              icon={<ArrowIcon credit={t.type === "credit"} />}
              left={t.description || (t.type === "credit" ? "Deposit" : "Withdrawal")}
              sub={new Date(t.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              right={`${t.type === "credit" ? "+" : "−"}${usd(t.amount_cents)}`}
              rightColor={t.type === "credit" ? "#0a7d3e" : "#b3261e"}
            />
          ))}
        </div>
      </div>


      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 grid grid-cols-4 pt-2 pb-3">
        <TabItem active label="Accounts" icon={<TabWalletIcon />} />
        <Link to="/transfer"><TabItem label="Pay & transfer" icon={<TabPayIcon />} /></Link>
        <TabItem label="Plan & track" icon={<TabPlanIcon />} />
        <TabItem label="More" icon={<TabMoreIcon />} />
      </nav>
    </main>
  );
}
function AccountGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div
        className="px-5 py-4 text-white text-[18px] font-semibold"
        style={{ backgroundColor: CHASE_BLUE }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function AccountRow({
  name,
  sub,
  amount,
  caption,
  amountColor,
}: {
  name: string;
  sub: string;
  amount: string;
  caption: string;
  amountColor?: string;
}) {
  return (
    <div className="px-5 py-5">
      <div className="text-[14px] tracking-wide text-neutral-800 uppercase">{name}</div>
      <div className="text-[13px] text-neutral-600 mt-1">{sub}</div>
      <div className="mt-6 text-right">
        <div
          className="text-[28px] font-semibold leading-none"
          style={{ color: amountColor ?? "#171717" }}
        >
          {amount}
        </div>
        <div className="text-[14px] text-neutral-700 mt-1">{caption}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-neutral-200 mx-5" />;
}


function Row({
  left,
  sub,
  right,
  rightColor,
  icon,
}: {
  left: string;
  sub?: string;
  right: string;
  rightColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="text-[16px] text-neutral-900 truncate">{left}</div>
          {sub && <div className="text-[13px] text-neutral-600 mt-0.5">{sub}</div>}
        </div>
      </div>
      <div className="text-[16px] font-semibold whitespace-nowrap" style={{ color: rightColor ?? "#1a1a1a" }}>
        {right}
      </div>
    </div>
  );
}

function ArrowIcon({ credit }: { credit: boolean }) {
  const color = credit ? "#0a7d3e" : "#b3261e";
  const bg = credit ? "#e6f4ea" : "#fde7e9";
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: bg }}
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {credit ? (
          <>
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </>
        ) : (
          <>
            <path d="M17 7 7 17" />
            <path d="M16 17H7V8" />
          </>
        )}
      </svg>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-5 py-2.5 rounded-full bg-white text-[15px] font-semibold whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      style={{ color: CHASE_BLUE }}
    >
      {children}
    </span>
  );
}

function TabItem({ label, icon, active }: { label: string; icon: React.ReactNode; active?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ color: active ? CHASE_BLUE : "#3a3a3a" }}>{icon}</div>
      <span
        className="text-[12px]"
        style={{ color: active ? CHASE_BLUE : "#3a3a3a", fontWeight: active ? 600 : 400 }}
      >
        {label}
      </span>
    </div>
  );
}

function ChaseLogo() {
  return (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <g fill={CHASE_BLUE}>
        <rect x="17" y="3" width="6" height="14" rx="1" />
        <rect x="23" y="17" width="14" height="6" rx="1" />
        <rect x="17" y="23" width="6" height="14" rx="1" />
        <rect x="3" y="17" width="14" height="6" rx="1" />
      </g>
    </svg>
  );
}

function TabWalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
      <path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v2H6a2 2 0 0 0-2 2V7zm0 5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6zm12 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </svg>
  );
}
function TabPayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9 14c.5.8 1.5 1.2 2.5 1.2 1.4 0 2-.6 2-1.4 0-1.8-4-1-4-2.8 0-.8.6-1.4 2-1.4 1 0 1.8.3 2.3 1" />
    </svg>
  );
}
function TabPlanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M15 4v4h4" />
      <path d="M8 13l2 2 4-4" />
    </svg>
  );
}
function TabMoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export { Link };
