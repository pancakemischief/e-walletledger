import React, { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ImageIcon,
} from "lucide-react";


// ---- Mock OCR data generators (new values on every portal load) ----
const FIRST_NAMES = ["Mark", "Angela", "Juan", "Maria", "Paolo", "Bea", "Carlo", "Kristine", "Miguel", "Jasmine", "Rafael", "Denise"];
const LAST_NAMES = ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Ramos", "Aquino", "Villanueva", "Castillo", "Navarro"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generatePayerName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

// 12-digit reference number, first digit never 0
const generateRefNo = () => {
  let ref = String(Math.floor(Math.random() * 9) + 1);
  for (let i = 0; i < 11; i++) ref += Math.floor(Math.random() * 10);
  return ref;
};

// Defaults used when a URL query parameter is missing or invalid
const DEFAULT_TITLE = "Annual Gala Ticket Payment";
const DEFAULT_CATEGORY = "Annual Gala Ticket";
const DEFAULT_AMOUNT = "450.00";

// Turns "1,250.50", "₱450", or "450.00" into a number; returns null if unusable
const parseAmount = (raw) => {
  if (raw == null) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const formatPeso = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

/**
 * E-WalletLedger — Mobile-First Payer Upload Portal
 *
 * Flow: upload -> scanning -> review -> success
 * Drop this component into a mobile-width route. Tailwind + lucide-react + Supabase required.
 */
export default function PayerPortal() {
  const [view, setView] = useState("upload"); // 'upload' | 'scanning' | 'review' | 'success'
  const [screenshotName, setScreenshotName] = useState(null);
  const fileInputRef = useRef(null);

  // Extracted / editable transaction fields
  // Lazy initializers: generated once per load, not on every re-render
  const [refNo, setRefNo] = useState(generateRefNo);
  const [paymentMethod] = useState("GCash");
  const [payerName, setPayerName] = useState(generatePayerName);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const ORG_NAME = "UP ComSci Council 2026";

  // Payment details from the URL, e.g. ?title=Org%20Shirt&category=Merch&amount=350
  const [searchParams] = useSearchParams();
  const PAYMENT_TITLE = searchParams.get("title")?.trim() || DEFAULT_TITLE;
  const CATEGORY = searchParams.get("category")?.trim() || DEFAULT_CATEGORY;
  const amount = parseAmount(searchParams.get("amount")) ?? parseAmount(DEFAULT_AMOUNT); // number, for the DB
  const AMOUNT_DISPLAY = formatPeso(amount); // "₱450.00", for the UI

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setScreenshotName(file.name);
    setView("scanning");
    // Simulate OCR extraction latency
    setTimeout(() => setView("review"), 2000);
  };

  const handleDropzoneClick = () => fileInputRef.current?.click();

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);

    const payload = {
      payer_name: payerName,
      category: CATEGORY,
      amount,
      payment_method: paymentMethod,
      ref_number: refNo,
      status: "Pending",
    };

    const { error } = await supabase.from("transactions").insert([payload]);

    setSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setSubmitError("Something went wrong. Please try again.");
      return;
    }

    setView("success");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col">
        {/* Sticky Header */}
        {view !== "success" && (
          <header className="sticky top-0 z-10 bg-slate-800 text-white px-5 pt-5 pb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              {view === "review" && (
                <button
                  onClick={() => setView("upload")}
                  aria-label="Back"
                  className="-ml-1 mr-1 p-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-medium tracking-wide text-slate-300 truncate">
                {ORG_NAME}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm text-slate-300 leading-snug">{PAYMENT_TITLE}</p>
            </div>
            <p className="text-3xl font-semibold text-white mt-1 tabular-nums">
              {AMOUNT_DISPLAY}
            </p>
          </header>
        )}

        {/* Body */}
        <main className="flex-1 px-5 py-6 flex flex-col">
          {view === "upload" && (
            <UploadView
              onPick={handleDropzoneClick}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
            />
          )}

          {view === "scanning" && (
            <ScanningView screenshotName={screenshotName} />
          )}

          {view === "review" && (
            <ReviewView
              refNo={refNo}
              setRefNo={setRefNo}
              amount={AMOUNT_DISPLAY}
              paymentMethod={paymentMethod}
              payerName={payerName}
              setPayerName={setPayerName}
              submitting={submitting}
              submitError={submitError}
              onSubmit={handleSubmit}
            />
          )}

          {view === "success" && <SuccessView />}
        </main>

        {view !== "success" && (
          <footer className="px-5 pb-6 pt-2 text-center">
            <p className="text-xs text-slate-400">
              Secured by E-WalletLedger · Your proof is reviewed manually
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}

function UploadView({ onPick, fileInputRef, onFileSelect }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-800">
          Submit your payment proof
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload a screenshot of your GCash or Maya payment confirmation.
        </p>
      </div>

      <button
        onClick={onPick}
        className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center transition-colors hover:border-slate-400 active:bg-slate-50"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-800 group-hover:text-white transition-colors">
          <UploadCloud size={26} />
        </span>
        <span className="text-sm font-medium text-slate-700">
          Tap to Upload GCash / Maya Screenshot
        </span>
        <span className="text-xs text-slate-400">PNG or JPG, up to 10MB</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelect}
      />

      <div className="flex items-start gap-2 rounded-xl bg-slate-200/60 px-4 py-3">
        <ImageIcon size={16} className="mt-0.5 text-slate-500 shrink-0" />
        <p className="text-xs text-slate-500 leading-relaxed">
          Make sure the reference number, amount, and timestamp are clearly
          visible in your screenshot.
        </p>
      </div>
    </div>
  );
}

function ScanningView({ screenshotName }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-slate-800/10 animate-ping" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-white">
          <Loader2 size={24} className="animate-spin" />
        </span>
      </span>
      <div>
        <p className="text-sm font-medium text-slate-700">
          Extracting transaction details via OCR...
        </p>
        {screenshotName && (
          <p className="text-xs text-slate-400 mt-1 truncate max-w-[220px] mx-auto">
            {screenshotName}
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewView({
  refNo,
  setRefNo,
  amount,
  paymentMethod,
  payerName,
  setPayerName,
  submitting,
  submitError,
  onSubmit,
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className="text-emerald-500" />
        <h2 className="text-base font-semibold text-slate-800">
          Review before sending
        </h2>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        <div className="px-4 py-4">
          <label className="text-xs font-medium text-slate-400">
            Your Name
          </label>
          <input
            type="text"
            value={payerName}
            onChange={(e) => setPayerName(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full bg-transparent text-sm font-medium text-slate-800 outline-none border-b border-transparent focus:border-slate-300 pb-1 disabled:opacity-60"
          />
        </div>

        <div className="px-4 py-4">
          <label className="text-xs font-medium text-slate-400">
            Transaction Reference No.
          </label>
          <input
            type="text"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full bg-transparent text-sm font-medium text-slate-800 tabular-nums outline-none border-b border-transparent focus:border-slate-300 pb-1 disabled:opacity-60"
          />
        </div>

        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Amount Detected
            </p>
            <p className="text-sm font-medium text-slate-800 mt-1 tabular-nums">
              {amount}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1">
            {paymentMethod}
          </span>
        </div>

        <div className="px-4 py-4">
          <p className="text-xs font-medium text-slate-400">Date &amp; Time</p>
          <p className="text-sm font-medium text-slate-800 mt-1">
            Sept 18, 2026 - 02:15 PM
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed px-1">
        Double-check the reference number matches your app before confirming.
        You can edit it above if the scan got it wrong.
      </p>

      {submitError && (
        <p className="text-xs font-medium text-red-600 px-1">{submitError}</p>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-600/60 disabled:cursor-not-allowed text-white text-sm font-semibold py-4 shadow-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Submitting..." : "Confirm & Send Proof"}
      </button>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={64} className="text-emerald-600" strokeWidth={1.75} />
      </span>
      <div className="px-6">
        <h2 className="text-lg font-semibold text-slate-800">
          Payment Proof Submitted!
        </h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          The treasurer will review your transaction.
        </p>
      </div>
    </div>
  );
}
