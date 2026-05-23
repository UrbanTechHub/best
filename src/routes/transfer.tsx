import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transfer")({
  component: TransferPage,
  head: () => ({
    meta: [
      { title: "Pay & transfer — Chase" },
      { name: "description", content: "Send money via ACH, wire, or international transfer." },
    ],
  }),
});

const CHASE_BLUE = "#117ACA";
const LIGHT_BG = "#F2F3F5";

type Account = {
  id: string;
  kind: "checking" | "savings" | "credit" | "loan";
  name: string;
  account_number: string;
  balance_cents: number;
};

type TransferKind = "domestic" | "international" | "wire";

const usd = (c: number) =>
  (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function TransferPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transferPin, setTransferPin] = useState<string | null>(null);
  const [transfersDisabled, setTransfersDisabled] = useState(false);
  const [kind, setKind] = useState<TransferKind>("domestic");
  const [loading, setLoading] = useState(true);

  const refreshAccounts = async (uid: string) => {
    const { data } = await supabase
      .from("accounts")
      .select("id,kind,name,account_number,balance_cents")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    setAccounts((data as Account[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/" });
        return;
      }
      setUserId(user.id);
      const [{ data: p }] = await Promise.all([
        supabase.from("profiles").select("transfer_pin, transfers_disabled").eq("id", user.id).maybeSingle(),
        refreshAccounts(user.id),
      ]);
      const prof = p as { transfer_pin: string | null; transfers_disabled: boolean | null } | null;
      setTransferPin(prof?.transfer_pin ?? null);
      setTransfersDisabled(!!prof?.transfers_disabled);
      setLoading(false);
    })();
  }, [navigate]);

  const sourceAccounts = useMemo(
    () => accounts.filter((a) => a.kind === "checking" || a.kind === "savings"),
    [accounts],
  );

  return (
    <main className="min-h-screen flex flex-col pb-28" style={{ backgroundColor: LIGHT_BG }}>
      <header className="px-5 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-1 -ml-1" aria-label="Back to accounts">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#1a1a1a" strokeWidth="2">
              <polyline points="15 6 9 12 15 18" />
            </svg>
          </Link>
          <ChaseLogo />
        </div>
        <Link to="/dashboard" className="text-[14px] font-semibold" style={{ color: CHASE_BLUE }}>
          Accounts
        </Link>
      </header>

      <section className="px-5 pt-3">
        <h1 className="text-[36px] leading-tight font-normal text-neutral-900">Pay & transfer</h1>
        <p className="text-[16px] text-neutral-800 mt-1">
          Send money to people, banks, and accounts around the world.
        </p>
      </section>

      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-1.5 grid grid-cols-3 gap-1">
          {(
            [
              ["domestic", "Domestic"],
              ["international", "International"],
              ["wire", "Wire"],
            ] as [TransferKind, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`py-2.5 text-[14px] font-semibold rounded-xl transition-colors ${
                kind === k ? "text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
              style={kind === k ? { backgroundColor: CHASE_BLUE } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {loading ? (
          <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-6 text-neutral-500">
            Loading…
          </div>
        ) : sourceAccounts.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-6 text-red-700">
            No checking/savings account available.
          </div>
        ) : userId ? (
          <TransferForm
            kind={kind}
            userId={userId}
            sourceAccounts={sourceAccounts}
            transferPin={transferPin}
            transfersDisabled={transfersDisabled}
            onPosted={() => refreshAccounts(userId)}
          />
        ) : null}
      </div>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 grid grid-cols-4 pt-2 pb-3">
        <Link to="/dashboard"><TabItem label="Accounts" icon={<TabWalletIcon />} /></Link>
        <TabItem active label="Pay & transfer" icon={<TabPayIcon />} />
        <TabItem label="Plan & track" icon={<TabPlanIcon />} />
        <TabItem label="More" icon={<TabMoreIcon />} />
      </nav>
    </main>
  );
}

function TransferForm({
  kind,
  userId,
  sourceAccounts,
  transferPin,
  transfersDisabled,
  onPosted,
}: {
  kind: TransferKind;
  userId: string;
  sourceAccounts: Account[];
  transferPin: string | null;
  transfersDisabled: boolean;
  onPosted: () => Promise<void>;
}) {
  const [accountId, setAccountId] = useState(sourceAccounts[0]?.id ?? "");
  const [form, setForm] = useState<Record<string, string>>({});
  const [pinInput, setPinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    setForm({});
    setPinInput("");
    setMsg(null);
  }, [kind]);

  useEffect(() => {
    if (!sourceAccounts.some((a) => a.id === accountId)) {
      setAccountId(sourceAccounts[0]?.id ?? "");
    }
  }, [sourceAccounts, accountId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const required = (() => {
    if (kind === "domestic") {
      return [
        "recipient_name",
        "recipient_account",
        "routing_number",
        "bank_name",
        "account_type",
        "amount",
        "transfer_speed",
        "transfer_date",
      ];
    }
    if (kind === "international") {
      return [
        "recipient_name",
        "recipient_address",
        "recipient_account",
        "bank_name",
        "bank_address",
        "swift",
        "country",
        "currency",
        "amount",
        "transfer_date",
        "fee_option",
      ];
    }
    return [
      "recipient_name",
      "recipient_address",
      "recipient_account",
      "bank_name",
      "bank_address",
      "routing_or_swift",
      "amount",
      "transfer_date",
    ];
  })();

  const submit = async () => {
    setMsg(null);
    if (!transferPin) {
      setMsg({
        kind: "err",
        text: "Your transfer PIN has not been set yet. Please contact support to enable transfers.",
      });
      return;
    }
    const missing = required.filter((k) => !form[k]?.trim());
    if (missing.length) {
      setMsg({ kind: "err", text: "Please fill all required fields." });
      return;
    }
    if (pinInput.trim() !== transferPin) {
      setMsg({ kind: "err", text: "Incorrect transfer PIN." });
      return;
    }
    // PIN validated — now enforce the admin disable flag
    if (transfersDisabled) {
      setMsg({ kind: "err", text: "Transfer disabled. Contact bank for more support." });
      return;
    }
    const account = sourceAccounts.find((a) => a.id === accountId);
    if (!account) {
      setMsg({ kind: "err", text: "Select a source account." });
      return;
    }
    const dollars = parseFloat(form.amount);
    if (!dollars || dollars <= 0) {
      setMsg({ kind: "err", text: "Enter a positive amount." });
      return;
    }
    const cents = Math.round(dollars * 100);
    if (cents > account.balance_cents) {
      setMsg({ kind: "err", text: "Insufficient funds for this transfer." });
      return;
    }

    setBusy(true);
    try {
      const newBalance = account.balance_cents - cents;
      const label =
        kind === "domestic"
          ? "ACH transfer"
          : kind === "international"
            ? "International transfer"
            : "Wire transfer";
      const description = `${label} to ${form.recipient_name}${
        form.bank_name ? ` · ${form.bank_name}` : ""
      }${form.memo ? ` — ${form.memo}` : ""}`;

      const { error: txErr } = await supabase.from("transactions").insert({
        user_id: userId,
        account_id: account.id,
        type: "debit",
        amount_cents: cents,
        description,
        balance_after_cents: newBalance,
        created_by: userId,
        status: kind === "wire" ? "completed" : "pending",
      });
      if (txErr) throw txErr;

      const { error: aErr } = await supabase
        .from("accounts")
        .update({ balance_cents: newBalance })
        .eq("id", account.id);
      if (aErr) throw aErr;

      setMsg({
        kind: "ok",
        text: `${label} of ${usd(cents)} submitted. New balance: ${usd(newBalance)}.`,
      });
      const referenceNo = "REF-" + Date.now().toString(36).toUpperCase() +
        "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      setReceipt({
        kind,
        label,
        referenceNo,
        date: new Date(),
        amountCents: cents,
        sourceAccount: account,
        newBalanceCents: newBalance,
        status: kind === "wire" ? "completed" : "pending",
        fields: { ...form },
      });
      setForm({});
      setPinInput("");
      await onPosted();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Transfer failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-5 sm:p-6">
      {receipt && (
        <ReceiptModal data={receipt} onClose={() => setReceipt(null)} />
      )}
      <h2 className="text-[20px] font-semibold text-neutral-900">
        {kind === "domestic"
          ? "Domestic transfer (ACH / Internal)"
          : kind === "international"
            ? "International transfer (SWIFT)"
            : "Wire transfer"}
      </h2>
      <p className="text-[13px] text-neutral-600 mt-1">
        {kind === "domestic"
          ? "1–3 business days, or instant if same bank."
          : kind === "international"
            ? "Sent via the SWIFT network."
            : "Same-day, irreversible. Used for large or urgent transfers."}
      </p>

      {!transferPin && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          Your transfer PIN has not been set. Please contact support to enable transfers from your account.
        </div>
      )}

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <Field label="From account" required>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="input"
          >
            {sourceAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · ••• {a.account_number.slice(-4)} ({usd(a.balance_cents)})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount (USD)" required>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount ?? ""}
            onChange={(e) => set("amount", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Recipient full name" required>
          <input
            value={form.recipient_name ?? ""}
            onChange={(e) => set("recipient_name", e.target.value)}
            className="input"
          />
        </Field>

        {kind !== "domestic" && (
          <Field label="Recipient address" required>
            <input
              value={form.recipient_address ?? ""}
              onChange={(e) => set("recipient_address", e.target.value)}
              className="input"
            />
          </Field>
        )}

        <Field
          label={kind === "international" ? "Account number or IBAN" : "Recipient account number"}
          required
        >
          <input
            value={form.recipient_account ?? ""}
            onChange={(e) => set("recipient_account", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Recipient bank name" required>
          <input
            value={form.bank_name ?? ""}
            onChange={(e) => set("bank_name", e.target.value)}
            className="input"
          />
        </Field>

        {kind !== "domestic" && (
          <Field label="Bank address" required>
            <input
              value={form.bank_address ?? ""}
              onChange={(e) => set("bank_address", e.target.value)}
              className="input"
            />
          </Field>
        )}

        {kind === "domestic" && (
          <>
            <Field label="Routing number (ABA)" required>
              <input
                value={form.routing_number ?? ""}
                onChange={(e) => set("routing_number", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Account type" required>
              <select
                value={form.account_type ?? ""}
                onChange={(e) => set("account_type", e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </Field>
            <Field label="Transfer speed" required>
              <select
                value={form.transfer_speed ?? ""}
                onChange={(e) => set("transfer_speed", e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                <option value="standard">Standard (ACH)</option>
                <option value="same_day">Same-day</option>
              </select>
            </Field>
          </>
        )}

        {kind === "international" && (
          <>
            <Field label="SWIFT / BIC code" required>
              <input
                value={form.swift ?? ""}
                onChange={(e) => set("swift", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Country of destination" required>
              <input
                value={form.country ?? ""}
                onChange={(e) => set("country", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Currency" required>
              <select
                value={form.currency ?? ""}
                onChange={(e) => set("currency", e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </Field>
            <Field label="Purpose of transfer">
              <input
                value={form.purpose ?? ""}
                onChange={(e) => set("purpose", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Intermediary bank info">
              <input
                value={form.intermediary ?? ""}
                onChange={(e) => set("intermediary", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Who pays fees" required>
              <select
                value={form.fee_option ?? ""}
                onChange={(e) => set("fee_option", e.target.value)}
                className="input"
              >
                <option value="">Select…</option>
                <option value="OUR">OUR (you pay all fees)</option>
                <option value="SHA">SHA (shared)</option>
                <option value="BEN">BEN (recipient pays)</option>
              </select>
            </Field>
          </>
        )}

        {kind === "wire" && (
          <Field label="Routing number (domestic) or SWIFT/BIC (international)" required>
            <input
              value={form.routing_or_swift ?? ""}
              onChange={(e) => set("routing_or_swift", e.target.value)}
              className="input"
            />
          </Field>
        )}

        <Field label="Transfer date" required>
          <input
            type="date"
            value={form.transfer_date ?? ""}
            onChange={(e) => set("transfer_date", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Memo / description">
          <input
            value={form.memo ?? ""}
            onChange={(e) => set("memo", e.target.value)}
            className="input"
            placeholder="Optional note"
          />
        </Field>
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
        <Field label="Transfer PIN" required>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter your 4–6 digit PIN"
            className="input tracking-widest"
            disabled={!transferPin}
          />
        </Field>
        <p className="text-[12px] text-neutral-600 mt-2">
          For your security, every transfer requires your PIN. Don't share it with anyone.
        </p>
      </div>

      {msg && (
        <p
          className={`mt-4 text-[14px] ${
            msg.kind === "ok" ? "text-green-700" : "text-red-700"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        onClick={submit}
        disabled={busy || !transferPin}
        className="mt-6 w-full sm:w-auto px-6 py-3 text-white text-[15px] font-semibold rounded-lg disabled:opacity-60"
        style={{ backgroundColor: CHASE_BLUE }}
      >
        {busy ? "Submitting…" : "Submit transfer"}
      </button>

      <style>{`
        .input {
          margin-top: 4px;
          width: 100%;
          border: 1px solid #d4d4d4;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
          outline: none;
          background: white;
        }
        .input:focus { border-color: ${CHASE_BLUE}; box-shadow: 0 0 0 3px rgba(17,122,202,0.15); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] text-neutral-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
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

type ReceiptData = {
  kind: TransferKind;
  label: string;
  referenceNo: string;
  date: Date;
  amountCents: number;
  sourceAccount: Account;
  newBalanceCents: number;
  status: "pending" | "completed";
  fields: Record<string, string>;
};

const FIELD_LABELS: Record<string, string> = {
  recipient_name: "Recipient name",
  recipient_address: "Recipient address",
  recipient_account: "Recipient account / IBAN",
  bank_name: "Recipient bank",
  bank_address: "Bank address",
  routing_number: "Routing number (ABA)",
  routing_or_swift: "Routing / SWIFT",
  swift: "SWIFT / BIC",
  account_type: "Account type",
  transfer_speed: "Transfer speed",
  transfer_date: "Transfer date",
  country: "Destination country",
  currency: "Currency",
  purpose: "Purpose",
  intermediary: "Intermediary bank",
  fee_option: "Fees",
  memo: "Memo",
};

function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const handlePrint = () => window.print();
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8 print:bg-white print:p-0 print:block"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-xl print:shadow-none print:rounded-none">
        <div
          id="transfer-receipt"
          className="px-6 py-7 sm:px-10 sm:py-9 print:px-12 print:py-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-neutral-200 pb-5">
            <div className="flex items-center gap-3">
              <ChaseLogo />
              <div>
                <div className="text-[18px] font-semibold text-neutral-900 leading-tight">Chase Bank</div>
                <div className="text-[12px] text-neutral-500">Transfer receipt</div>
              </div>
            </div>
            <div className="text-right">
              <span
                className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: data.status === "completed" ? "#e6f4ea" : "#fff4e0",
                  color: data.status === "completed" ? "#0a7d3e" : "#8a5a00",
                }}
              >
                {data.status === "completed" ? "Completed" : "Pending"}
              </span>
              <div className="text-[11px] text-neutral-500 mt-2">
                {data.date.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Success line */}
          <div className="mt-6 flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#e6f4ea" }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0a7d3e" strokeWidth="3">
                <polyline points="5 12 10 17 19 8" />
              </svg>
            </div>
            <div>
              <div className="text-[20px] font-semibold text-neutral-900 leading-tight">
                Transfer submitted
              </div>
              <div className="text-[13px] text-neutral-600 mt-1">
                Your {data.label.toLowerCase()} has been submitted successfully.
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="mt-6 rounded-xl border border-neutral-200 p-5 bg-neutral-50">
            <div className="text-[11px] uppercase tracking-wider text-neutral-500">Amount</div>
            <div className="text-[34px] font-semibold text-neutral-900 leading-tight mt-1">
              {usd(data.amountCents)}
            </div>
            <div className="text-[12px] text-neutral-500 mt-1">
              From {data.sourceAccount.name} ••• {data.sourceAccount.account_number.slice(-4)}
            </div>
          </div>

          {/* Details */}
          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
            <ReceiptRow label="Reference no." value={data.referenceNo} />
            <ReceiptRow label="Transfer type" value={data.label} />
            <ReceiptRow
              label="From account"
              value={`${data.sourceAccount.name} ••• ${data.sourceAccount.account_number.slice(-4)}`}
            />
            <ReceiptRow label="New balance" value={usd(data.newBalanceCents)} />
            {Object.entries(data.fields)
              .filter(([, v]) => v && v.trim())
              .map(([k, v]) => (
                <ReceiptRow key={k} label={FIELD_LABELS[k] ?? k} value={v} />
              ))}
          </dl>

          <div className="mt-7 border-t border-neutral-200 pt-4 text-[11px] text-neutral-500 leading-relaxed">
            Keep this receipt for your records. For questions about this transfer, contact Chase
            customer support and reference the number above. JPMorgan Chase Bank, N.A. Member FDIC.
          </div>
        </div>

        <div className="px-6 sm:px-10 py-4 border-t border-neutral-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-[14px] font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: CHASE_BLUE }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7" />
              <rect x="4" y="9" width="16" height="9" rx="1" />
              <path d="M6 14h12v8H6z" />
            </svg>
            Print receipt
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #transfer-receipt, #transfer-receipt * { visibility: visible !important; }
          #transfer-receipt { position: absolute; inset: 0; margin: 0; padding: 32px; }
        }
      `}</style>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-neutral-200 pb-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-900 font-medium text-right break-words">{value}</dd>
    </div>
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
