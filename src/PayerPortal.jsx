import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ChevronLeft,
  ImageIcon,
} from "lucide-react";

/**
 * E-WalletLedger — Mobile-First Payer Upload Portal
 *
 * Flow: upload -> scanning -> review
 * Drop this component into a mobile-width route. Tailwind + lucide-react required.
 */
export default function PayerUploadPortal() {
  const [view, setView] = useState("upload"); // 'upload' | 'scanning' | 'review'
  const [screenshotName, setScreenshotName] = useState(null);
  const [refNo, setRefNo] = useState("1002 9384 7123");
  const fileInputRef = useRef(null);

  const ORG_NAME = "UP ComSci Council 2026";
  const PAYMENT_TITLE = "Annual Gala Ticket Payment";
  const AMOUNT = "₱450.00";

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setScreenshotName(file.name);
    setView("scanning");
    // Simulate OCR extraction latency
    setTimeout(() => setView("review"), 2000);
  };

  const handleDropzoneClick = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-md mx-auto min-h-screen bg-slate-100 flex flex-col">
        {/* Sticky Header */}
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
            {AMOUNT}
          </p>
        </header>

        {/* Body */}
        <main className="flex-1 px-5 py-6">
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
              amount={AMOUNT}
            />
          )}
        </main>

        <footer className="px-5 pb-6 pt-2 text-center">
          <p className="text-xs text-slate-400">
            Secured by E-WalletLedger · Your proof is reviewed manually
          </p>
        </footer>
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

function ReviewView({ refNo, setRefNo, amount }) {
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
            Transaction Reference No.
          </label>
          <input
            type="text"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            className="mt-1 w-full bg-transparent text-sm font-medium text-slate-800 tabular-nums outline-none border-b border-transparent focus:border-slate-300 pb-1"
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
            GCash
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

      <button className="w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold py-4 shadow-sm transition-colors">
        Confirm &amp; Send Proof
      </button>
    </div>
  );
}
