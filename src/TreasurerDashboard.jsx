import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Clock,
  SlidersHorizontal,
  Filter,
  Plus,
  Copy,
  Link2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "./supabaseClient";

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
 * Expected `transactions` table columns:
 *   id, created_at, payer_name, category, amount, payment_method, ref_number, status
 *   status: 'Pending' | 'Verified' | 'Flagged' | 'Rejected'
 * Optional OCR columns (fall back to the ledger values if absent):
 *   ocr_ref, ocr_amount, ocr_date
 * Optional: screenshot_url (shown in the drawer if present)
 */

const STATUS_META = {
  Verified: {
    label: "Verified",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    dotClass: "bg-emerald-500",
  },
  Pending: {
    label: "Pending Review",
    icon: Clock,
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-500/20",
    dotClass: "bg-slate-400",
  },
  Flagged: {
    label: "Flagged",
    icon: AlertTriangle,
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    dotClass: "bg-amber-500",
  },
  Rejected: {
    label: "Rejected",
    icon: XCircle,
    badgeClass: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    dotClass: "bg-red-500",
  },
};

const FALLBACK_META = STATUS_META.Pending;

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

function peso(n) {
  const value = Number(n);
  return pesoFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso ?? "—";
  return d.toLocaleString("en-PH", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? FALLBACK_META;
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

const STATUS_FILTERS = ["All", "Verified", "Flagged", "Pending"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const normalize = (v) => (v ?? "").toString().trim().toLowerCase();

// OCR amount disagrees with the ledger amount
function hasAmountMismatch(tx) {
  return tx.ocr_amount != null && Number(tx.ocr_amount) !== Number(tx.amount);
}

// Another transaction shares this reference number
function isDuplicateTx(tx, duplicateRefs) {
  return !!tx.ref_number && duplicateRefs.has(tx.ref_number);
}

function SortHeader({ label, columnKey, sortKey, sortDir, onSort, className }) {
  const active = sortKey === columnKey && sortDir !== null;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`font-medium ${className}`}
      aria-sort={!active ? "none" : sortDir === "asc" ? "ascending" : "descending"}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`inline-flex items-center gap-1 rounded-md py-0.5 transition-colors hover:text-[#1E2A45] ${
          active ? "text-[#1E2A45]" : ""
        }`}
      >
        {label}
        <Icon
          className={`h-3.5 w-3.5 ${active ? "text-[#1E2A45]" : "text-slate-400"}`}
          strokeWidth={2.25}
        />
      </button>
    </th>
  );
}

export default function EWalletLedgerDashboard() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState(null);
  const [query, setQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Sorting (default: Date, newest first)
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc' | null

  // Filters
  const [showFilters, setShowFilters] = useState(false); // advanced panel
  const [showCategoryFilter, setShowCategoryFilter] = useState(false); // column popover
  const [monthFilter, setMonthFilter] = useState(""); // "" = all, otherwise 0-11
  const [yearFilter, setYearFilter] = useState(""); // "" = all
  const [statusFilter, setStatusFilter] = useState("All");
  // One category value shared by the advanced panel and the column popover
  const [categoryFilter, setCategoryFilter] = useState("");

  // Close the panel / popover on outside click or Escape
  useEffect(() => {
    if (!showFilters && !showCategoryFilter) return;
    const onMouseDown = (e) => {
      if (!e.target.closest("[data-filter-root]")) setShowFilters(false);
      if (!e.target.closest("[data-cat-root]")) setShowCategoryFilter(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowFilters(false);
        setShowCategoryFilter(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showFilters, showCategoryFilter]);

  // New Collection modal
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionCategory, setCollectionCategory] = useState("");
  const [collectionAmount, setCollectionAmount] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [copied, setCopied] = useState(false);
  const linkInputRef = useRef(null);
  const copyTimer = useRef(null);

  // Escape closes the modal; lock page scroll while it's open
  useEffect(() => {
    if (!showNewCollection) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowNewCollection(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showNewCollection]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // Fetch all transactions, newest first
  useEffect(() => {
    let cancelled = false;

    async function fetchTransactions() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("Failed to load transactions:", error);
        setError("Couldn't load transactions. Check your connection and try again.");
      } else {
        setTransactions(data ?? []);
        setSelectedTx((data ?? [])[0] ?? null);
        setError(null);
      }
      setIsLoading(false);
    }

    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reference numbers that appear on more than one transaction (drawer warning)
  const duplicateRefs = useMemo(() => {
    const counts = new Map();
    for (const tx of transactions) {
      if (tx.ref_number) counts.set(tx.ref_number, (counts.get(tx.ref_number) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n > 1).map(([ref]) => ref));
  }, [transactions]);

  // Suggestions for the category comboboxes (browser datalist handles the matching)
  const categoryOptions = useMemo(
    () =>
      [...new Set(transactions.map((tx) => (tx.category ?? "").trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [transactions]
  );

  const yearOptions = useMemo(() => {
    const years = new Set();
    for (const tx of transactions) {
      const d = new Date(tx.created_at);
      if (!Number.isNaN(d.getTime())) years.add(d.getFullYear());
    }
    return [...years].sort((a, b) => b - a);
  }, [transactions]);

  // Unified filtering: main search + advanced panel + inline category filter
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cat = normalize(categoryFilter);

    return transactions.filter((tx) => {
      if (
        q &&
        !(
          (tx.payer_name ?? "").toLowerCase().includes(q) ||
          (tx.ref_number ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }

      if (cat && !normalize(tx.category).includes(cat)) return false;

      if (monthFilter !== "" || yearFilter !== "") {
        const d = new Date(tx.created_at);
        if (Number.isNaN(d.getTime())) return false;
        if (monthFilter !== "" && d.getMonth() !== Number(monthFilter)) return false;
        if (yearFilter !== "" && d.getFullYear() !== Number(yearFilter)) return false;
      }

      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [transactions, query, categoryFilter, monthFilter, yearFilter, statusFilter]);

  // Dynamic KPIs — calculated from the currently filtered rows
  const { totalRevenue, verifiedCount, flaggedCount } = useMemo(() => {
    let revenue = 0;
    let verified = 0;
    let flagged = 0;
    for (const tx of filteredRows) {
      if (tx.status === "Verified") {
        revenue += Number(tx.amount) || 0;
        verified += 1;
      } else if (tx.status === "Flagged" || tx.status === "Pending") {
        flagged += 1;
      }
    }
    return { totalRevenue: revenue, verifiedCount: verified, flaggedCount: flagged };
  }, [filteredRows]);

  const matchRate = filteredRows.length
    ? Math.round((verifiedCount / filteredRows.length) * 100)
    : 0;

  // Sorting (null = original order from the database, newest first)
  const visibleRows = useMemo(() => {
    if (!sortDir) return filteredRows;

    const dir = sortDir === "asc" ? 1 : -1;
    const time = (tx) => new Date(tx.created_at).getTime() || 0;
    return [...filteredRows].sort((a, b) => {
      let result = 0;
      if (sortKey === "date") result = time(a) - time(b);
      else if (sortKey === "payer") {
        result = (a.payer_name ?? "").localeCompare(b.payer_name ?? "", undefined, {
          sensitivity: "base",
        });
      } else if (sortKey === "amount") {
        result = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      } else if (sortKey === "status") {
        result = (a.status ?? "").localeCompare(b.status ?? "");
      }
      return result !== 0 ? result * dir : time(b) - time(a);
    });
  }, [filteredRows, sortKey, sortDir]);

  // Cycle: ascending -> descending -> none. A new column starts ascending.
  function handleSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
  }

  const activeFilterCount =
    (monthFilter !== "" ? 1 : 0) +
    (yearFilter !== "" ? 1 : 0) +
    (categoryFilter.trim() !== "" ? 1 : 0) +
    (statusFilter !== "All" ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0 || query.trim() !== "";

  // Clears search text and every filter (sorting is kept)
  function resetFilters() {
    setQuery("");
    setMonthFilter("");
    setYearFilter("");
    setStatusFilter("All");
    setCategoryFilter("");
  }

  // ---- New Collection link generator ----
  function openNewCollection() {
    setCollectionTitle("");
    setCollectionCategory("");
    setCollectionAmount("");
    setGeneratedLink("");
    setCollectionError("");
    setCopied(false);
    setShowNewCollection(true);
  }

  // Editing an input invalidates any previously generated link
  const handleCollectionField = (setter) => (e) => {
    setter(e.target.value);
    setGeneratedLink("");
    setCollectionError("");
    setCopied(false);
  };

  function handleGenerateLink(e) {
    e.preventDefault();
    const title = collectionTitle.trim();
    const category = collectionCategory.trim();
    const amount = Number(collectionAmount.replace(/[,\s\u20B1]/g, ""));

    if (!title || !category) {
      setCollectionError("Enter a payment title and a category.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setCollectionError("Enter an amount greater than zero.");
      return;
    }

    const params = new URLSearchParams({ title, category, amount: String(amount) });
    setGeneratedLink(`${window.location.origin}/?${params.toString()}`);
    setCollectionError("");
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedLink);
    } catch {
      // Fallback for non-secure contexts / blocked clipboard access
      linkInputRef.current?.select();
      if (!document.execCommand("copy")) {
        setCollectionError("Couldn't copy automatically. Select the link and copy it manually.");
        return;
      }
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  // Update a transaction's status in Supabase, then sync local state
  async function updateStatus(newStatus) {
    if (!selectedTx || isUpdating) return;
    setIsUpdating(true);
    setError(null);

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: newStatus })
      .eq("id", selectedTx.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update status:", error);
      setError("Couldn't update this transaction. Try again.");
    } else {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === data.id ? { ...tx, ...data } : tx))
      );
      setSelectedTx((prev) => (prev && prev.id === data.id ? { ...prev, ...data } : prev));
    }
    setIsUpdating(false);
  }

  // Derived audit signals for the drawer
  const ocr = selectedTx
    ? {
        ref: selectedTx.ocr_ref ?? selectedTx.ref_number ?? "—",
        amount: selectedTx.ocr_amount ?? selectedTx.amount,
        date: selectedTx.ocr_date ?? selectedTx.created_at,
      }
    : null;

  const amountMismatch = !!selectedTx && hasAmountMismatch(selectedTx);
  const isDuplicate = !!selectedTx && isDuplicateTx(selectedTx, duplicateRefs);

  const selectedMeta = selectedTx
    ? STATUS_META[selectedTx.status] ?? FALLBACK_META
    : FALLBACK_META;

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#1E2A45] placeholder:text-slate-400 focus:border-[#1E2A45] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A45]/10";
  const selectClass = `mt-1 ${fieldClass}`;

  const newCollectionButton = (
    <button
      type="button"
      onClick={openNewCollection}
      aria-label="New collection"
      className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-[#1E2A45] px-3 text-sm font-medium text-white transition-colors hover:bg-[#141C2F] focus:outline-none focus:ring-2 focus:ring-[#1E2A45]/30 sm:px-3.5"
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} />
      <span className="hidden sm:inline">New Collection</span>
    </button>
  );

  const filterButton = (
    <button
      type="button"
      onClick={() => setShowFilters((v) => !v)}
      aria-expanded={showFilters}
      aria-label="Toggle advanced filters"
      className={`flex h-[38px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
        showFilters
          ? "border-[#1E2A45] bg-[#1E2A45] text-white"
          : activeFilterCount > 0
          ? "border-[#1E2A45] bg-white text-[#1E2A45]"
          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
      }`}
    >
      <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
      Filters
      {activeFilterCount > 0 && (
        <span
          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
            showFilters ? "bg-white text-[#1E2A45]" : "bg-[#1E2A45] text-white"
          }`}
        >
          {activeFilterCount}
        </span>
      )}
    </button>
  );

  const filterPanel = showFilters && (
    <div className="absolute left-0 top-full z-30 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[#1E2A45]">Advanced filters</p>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#1E2A45]"
        >
          <RotateCcw className="h-3 w-3" strokeWidth={2.25} />
          Reset filters
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-slate-500">
          Month
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-500">
          Year
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs text-slate-500">
        Category
        <div className="relative mt-1">
          <input
            type="text"
            list="category-options"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Type to find a category"
            className={`${fieldClass} pr-8`}
          />
          {categoryFilter && (
            <button
              type="button"
              onClick={() => setCategoryFilter("")}
              aria-label="Clear category filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-[#1E2A45]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </label>

      <label className="mt-3 block text-xs text-slate-500">
        Status
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          {STATUS_FILTERS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F4F5F7] font-sans text-[#1E2A45] antialiased">
      <datalist id="category-options">
        {categoryOptions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

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

          <div data-filter-root className="relative ml-2 hidden flex-1 max-w-md sm:block">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder="Search payer or ref no."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-[#1E2A45] placeholder:text-slate-400 focus:border-[#1E2A45] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E2A45]/10"
                />
              </div>
              {filterButton}
            </div>
            {filterPanel}
          </div>

          <div className="hidden sm:block">{newCollectionButton}</div>

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
        <div data-filter-root className="relative border-t border-slate-100 px-4 py-2 sm:hidden">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Search payer or ref no."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-[#1E2A45] focus:outline-none"
              />
            </div>
            {filterButton}
            {newCollectionButton}
          </div>
          {filterPanel}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <XCircle className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            {error}
          </div>
        )}

        {/* KPI Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Revenue Collected</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight text-[#1E2A45]">
                {peso(totalRevenue)}
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                {verifiedCount} paid
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">from verified receipts</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Verified Receipts</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight text-[#1E2A45]">
                {verifiedCount}
              </p>
              <span className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.25} />
                {matchRate}% verified
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              of {filteredRows.length} {hasActiveFilters ? "filtered" : "total"} receipts
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <p className="text-sm text-amber-800">Flagged for Review</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-semibold tracking-tight text-amber-900">
                {flaggedCount}
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
                {visibleRows.length} of {transactions.length} shown
              </span>
            </div>

            <div className={`overflow-x-auto ${showCategoryFilter ? "min-h-[10rem]" : ""}`}>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-500">
                    <SortHeader label="Date" columnKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-5 py-3" />
                    <SortHeader label="Payer" columnKey="payer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-3 py-3" />
                    <th data-cat-root className="relative px-3 py-3 font-medium">
                      <div className="inline-flex items-center gap-1">
                        Category
                        <button
                          type="button"
                          onClick={() => setShowCategoryFilter((v) => !v)}
                          aria-label="Filter by category"
                          aria-expanded={showCategoryFilter}
                          className={`rounded-md p-1 transition-colors ${
                            categoryFilter.trim()
                              ? "bg-[#1E2A45] text-white"
                              : "text-slate-400 hover:bg-slate-100 hover:text-[#1E2A45]"
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </button>
                      </div>

                      {showCategoryFilter && (
                        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 text-left font-normal shadow-lg">
                          <label className="block text-xs text-slate-500">
                            Category contains
                            <div className="relative mt-1">
                              <input
                                autoFocus
                                type="text"
                                list="category-options"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setShowCategoryFilter(false);
                                }}
                                placeholder="Search category"
                                className={`${fieldClass} pr-8`}
                              />
                              {categoryFilter && (
                                <button
                                  type="button"
                                  onClick={() => setCategoryFilter("")}
                                  aria-label="Clear category filter"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-[#1E2A45]"
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </label>
                        </div>
                      )}
                    </th>
                    <SortHeader label="Amount" columnKey="amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-3 py-3" />
                    <th className="px-3 py-3 font-medium">Method</th>
                    <th className="px-3 py-3 font-medium">Ref No.</th>
                    <SortHeader label="Status" columnKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                        Loading transactions…
                      </td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                        {transactions.length === 0
                          ? "No transactions yet."
                          : "No transactions match your filters."}
                        {transactions.length > 0 && hasActiveFilters && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="ml-2 font-medium text-[#1E2A45] underline underline-offset-2"
                          >
                            Clear filters
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row) => {
                      const isSelected = row.id === selectedTx?.id;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedTx(row)}
                          className={`cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                            isSelected
                              ? "bg-[#1E2A45]/[0.04]"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                            {formatDate(row.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-medium text-[#1E2A45]">
                            {row.payer_name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                            {row.category}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-medium text-[#1E2A45]">
                            {peso(row.amount)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                            {row.payment_method}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5 font-mono text-xs text-slate-500">
                            {row.ref_number}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3.5">
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
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
              <span className={`h-2 w-2 rounded-full ${selectedMeta.dotClass}`} />
            </div>

            {!selectedTx ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                Select a transaction to review it.
              </div>
            ) : (
              <div className="px-5 py-4">
                <p className="text-xs text-slate-500">Reviewing</p>
                <p className="text-base font-semibold text-[#1E2A45]">
                  {selectedTx.payer_name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedTx.category} · {selectedTx.payment_method}
                </p>

                {/* Screenshot */}
                {selectedTx.screenshot_url ? (
                  <img
                    src={selectedTx.screenshot_url}
                    alt={`Receipt uploaded by ${selectedTx.payer_name}`}
                    className="mt-4 h-40 w-full rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="mt-4 flex h-40 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                    <p className="text-xs">Uploaded e-wallet screenshot</p>
                  </div>
                )}

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
                      value={ocr.ref}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Amount</label>
                      <input
                        readOnly
                        value={peso(ocr.amount)}
                        className={`mt-1 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                          amountMismatch
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Date</label>
                      <input
                        readOnly
                        value={formatDateTime(ocr.date)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {amountMismatch && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} />
                      OCR amount differs from ledger entry ({peso(selectedTx.amount)})
                    </p>
                  )}
                  {isDuplicate && (
                    <p className="flex items-center gap-1.5 text-xs text-red-700">
                      <XCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                      Matches ref no. already recorded this term
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => updateStatus("Verified")}
                    disabled={isUpdating || selectedTx.status === "Verified"}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Approve Payment
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateStatus("Rejected")}
                      disabled={isUpdating || selectedTx.status === "Rejected"}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                      Reject
                    </button>
                    <button
                      onClick={() => updateStatus("Flagged")}
                      disabled={isUpdating || selectedTx.status === "Flagged"}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-400 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
                      Re-upload
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      {/* New Collection modal */}
      {showNewCollection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E2A45]/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowNewCollection(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-collection-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2
                  id="new-collection-title"
                  className="text-base font-semibold text-[#1E2A45]"
                >
                  New Collection
                </h2>
                <p className="text-xs text-slate-500">
                  Generate a payment link to share with payers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCollection(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#1E2A45]"
              >
                <X className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>

            <form onSubmit={handleGenerateLink} noValidate className="px-5 py-4">
              <div className="space-y-3">
                <label className="block text-xs text-slate-500">
                  Payment Title
                  <input
                    autoFocus
                    type="text"
                    value={collectionTitle}
                    onChange={handleCollectionField(setCollectionTitle)}
                    placeholder="e.g. Org Shirt"
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Category
                  <input
                    type="text"
                    list="category-options"
                    value={collectionCategory}
                    onChange={handleCollectionField(setCollectionCategory)}
                    placeholder="e.g. Merch"
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Amount
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₱
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={collectionAmount}
                      onChange={handleCollectionField(setCollectionAmount)}
                      placeholder="350"
                      className={`${fieldClass} pl-7`}
                    />
                  </div>
                </label>
              </div>

              {collectionError && (
                <p role="alert" className="mt-3 flex items-center gap-1.5 text-xs text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                  {collectionError}
                </p>
              )}

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1E2A45] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#141C2F]"
              >
                <Link2 className="h-4 w-4" strokeWidth={2.25} />
                Generate Link
              </button>
            </form>

            {generatedLink && (
              <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Shareable link
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={linkInputRef}
                    readOnly
                    value={generatedLink}
                    onFocus={(e) => e.target.select()}
                    aria-label="Generated collection link"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:border-[#1E2A45] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-[#1E2A45] hover:bg-slate-100"
                    }`}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={2.25} />
                    )}
                    {copied ? "Copied" : "Copy to Clipboard"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
