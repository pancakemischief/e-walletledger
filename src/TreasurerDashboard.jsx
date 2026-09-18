import React, { useState } from "react";
import {
  Search,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wallet,
  Image as ImageIcon,
  Check,
  X,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

/**
 * E-WalletLedger — Treasurer Admin Dashboard
 * UP ComSci Council 2026
 *
 * Palette:
 *   Navy (primary/accent)  #1E2A45 / #141C2F
 *   Surfaces               #F4F5F7 (soft gray) / #FFFFFF (white)
 *   Verified                #0F9D6D (emerald)
 *   Flagged / Error         #D97706 (amber) / #DC2626 (red)
 *
 * Font stack assumes Inter for UI text and Space Grotesk for large
 * numerals (KPI figures). If these aren't already loaded in your app,
 * add them via Google Fonts or swap for your project's type stack —
 * the classes below fall back gracefully to system sans-serif.
 */

const LEDGER_ROWS = [
  {
    id: "TXN-2031",
    date: "Sep 15, 2026",
    payer: "Marielle Zapanta",
    category: "Membership Fee",
    amount: 350.0,
    method: "GCash",
    ref: "GC-88213409",
    status: "verified",
    ocr: {
      ref: "GC-88213409",
      amount: "₱350.00",
      date: "09/15/2026, 3:42 PM",
    },
  },
  {
    id: "TXN-2032",
    date: "Sep 15, 2026",
    payer: "Josh Ilagan",
    category: "Org T-Shirt",
    amount: 480.0,
    method: "Maya",
    ref: "MY-55210987",
    status: "duplicate",
    ocr: {
      ref: "MY-55210987",
      amount: "₱480.00",
      date: "09/15/2026, 11:07 AM",
    },
  },
  {
    id: "TXN-2033",
    date: "Sep 14, 2026",
    payer: "Andrea Buenaventura",
    category: "Event Registration",
    amount: 150.0,
    method: "GCash",
    ref: "GC-88209912",
    status: "verified",
    ocr: {
      ref: "GC-88209912",
      amount: "₱150.00",
      date: "09/14/2026, 6:58 PM",
    },
  },
  {
    id: "TXN-2034",
    date: "Sep 14, 2026",
    payer: "Rafael Concepcion",
    category: "Membership Fee",
    amount: 300.0,
    method: "Maya",
    ref: "MY-55198744",
    status: "mismatch",
    ocr: {
      ref: "MY-55198744",
      amount: "₱350.00",
      date: "09/14/2026, 2:15 PM",
    },
  },
  {
    id: "TXN-2035",
    date: "Sep 13, 2026",
    payer: "Kim Oreta",
    category: "Sponsorship — Print Ad",
    amount: 2500.0,
    method: "Bank Transfer",
    ref: "BT-70041152",
    status: "verified",
    ocr: {
      ref: "BT-70041152",
      amount: "₱2,500.00",
      date: "09/13/2026, 9:30 AM",
    },
  },
];

const STATUS_META = {
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    dotClass: "bg-emerald-500",
  },
  duplicate: {
    label: "Duplicate Alert",
    icon: XCircle,
    badgeClass: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    dotClass: "bg-red-500",
  },
  mismatch: {
    label: "Mismatched Amount",
    icon: AlertTriangle,
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    dotClass: "bg-amber-500",
  },
};

function peso(n) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badgeClass}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

export default function EWalletLedgerDashboard() {
  const [rows] = useState(LEDGER_ROWS);
  const [selectedId, setSelectedId] = useState(LEDGER_ROWS[0].id);
  const [query, setQuery] = useState("");

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0];

  const filteredRows = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.payer.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.ref.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#F4F5F7] font-sans text-[#1E2A45] antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E2A45]">
              <Wallet className="h-4.5 w-4.5 text-white" strokeWidth={2} />
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight text-[#1E2A45]">
                E-WalletLedger
              </p>
              <p className="text-xs text-slate-500">UP ComSci Council 2026</p>
            </div>
          </div>

          <div className="ml-2 hidden flex-1 max-w-md sm:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Search payer, category, or ref no."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-[#1E2A45] placeholder:text-slate-400 focus:border-[#1E2A45] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A45]/10"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-[#1E2A45]">Bea</p>
              <p className="text-xs text-slate-500">Treasurer</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E2A45] text-sm font-semibold text-white">
              B
            </div>
          </div>
        </div>

        {/* Mobile search */}
        <div className="border-t border-slate-100 px-4 py-2 sm:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search ledger"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-[#1E2A45] focus:outline-none"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* KPI Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Revenue Collected</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight text-[#1E2A45]">
                {peso(45200)}
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                8.2%
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">vs. last collection cycle</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Verified Receipts</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight text-[#1E2A45]">
                112
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.25} />
                97% match rate
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">auto-reconciled this term</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-sm text-amber-800">Flagged for Review</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight text-amber-900">
                3
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} />
                pending alerts
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-700/80">needs treasurer action</p>
          </div>
        </section>

        {/* Split Main Layout */}
        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Ledger Table — 2/3 */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#1E2A45]">
                  Transaction Ledger
                </h2>
                <p className="text-xs text-slate-500">
                  Select a row to open its audit review
                </p>
              </div>
              <span className="text-xs text-slate-400">
                {filteredRows.length} of {rows.length} shown
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-3 py-3 font-medium">Payer</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Method</th>
                    <th className="px-3 py-3 font-medium">Ref No.</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const isSelected = row.id === selectedId;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedId(row.id)}
                        className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                          isSelected
                            ? "bg-[#1E2A45]/[0.04]"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                          {row.date}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 font-medium text-[#1E2A45]">
                          {row.payer}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                          {row.category}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 font-medium text-[#1E2A45]">
                          {peso(row.amount)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                          {row.method}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 font-mono text-xs text-slate-500">
                          {row.ref}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Drawer — 1/3 */}
          <aside className="rounded-2xl border border-slate-200 bg-white lg:col-span-1">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-[#1E2A45]">
                Review Drawer
              </h2>
              <span
                className={`h-2 w-2 rounded-full ${STATUS_META[selected.status].dotClass}`}
              />
            </div>

            <div className="px-5 py-4">
              <p className="text-xs text-slate-500">Reviewing</p>
              <p className="text-base font-semibold text-[#1E2A45]">
                {selected.payer}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {selected.category} · {selected.method}
              </p>

              {/* Screenshot placeholder */}
              <div className="mt-4 flex h-40 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                <p className="text-xs">Uploaded e-wallet screenshot</p>
              </div>

              {/* OCR extracted fields */}
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Extracted from receipt
                </p>

                <div>
                  <label className="text-xs text-slate-500">
                    Reference Number
                  </label>
                  <input
                    readOnly
                    value={selected.ocr.ref}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Amount</label>
                    <input
                      readOnly
                      value={selected.ocr.amount}
                      className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                        selected.status === "mismatch"
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Date</label>
                    <input
                      readOnly
                      value={selected.ocr.date}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                {selected.status === "mismatch" && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} />
                    OCR amount differs from ledger entry ({peso(selected.amount)})
                  </p>
                )}
                {selected.status === "duplicate" && (
                  <p className="flex items-center gap-1.5 text-xs text-red-700">
                    <XCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                    Matches ref no. already recorded this term
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-5 space-y-2">
                <button className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  Approve Payment
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">
                    <X className="h-4 w-4" strokeWidth={2.5} />
                    Reject
                  </button>
                  <button className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50">
                    <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
                    Re-upload
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
