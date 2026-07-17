"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, PackageSearch, RotateCcw, Save, ScanBarcode, Camera as CameraIcon, ImageUp, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { warehouses } from "@/lib/mock-data";
import type { Product } from "@/lib/types";
import { BarcodeScanner, type ScannerErrorKind } from "./barcode-scanner";
import { BarcodeImageUpload } from "./barcode-image-upload";
import { ManualBarcodeEntry } from "./manual-barcode-entry";
import { OcrCapture } from "./ocr-capture";
import { LOW_CONFIDENCE_THRESHOLD, type OcrExtraction } from "./ocr-extract";

type Stage =
  | { kind: "scanning" }
  | { kind: "looking_up"; barcode: string }
  | { kind: "existing_product"; product: Product; barcode: string }
  | { kind: "new_product"; barcode: string; draft: Partial<Product>; sourceLabel: string }
  | { kind: "manual_entry"; barcode: string; reason: string }
  | { kind: "saved"; message: string }
  | { kind: "error"; message: string; canRetry: boolean };

const emptyBatch = { quantity: "", batchNumber: "", lotNumber: "", mfgDate: "", expiryDate: "", warehouse: "" };
const emptyDraft: Partial<Product> = { name: "", brand: "", category: "", description: "", packageSize: "", weight: "", manufacturer: "", image: "" };

export function ScanWorkflow() {
  const [stage, setStage] = useState<Stage>({ kind: "scanning" });
  const [inputMethod, setInputMethod] = useState<"camera" | "upload" | "manual">("camera");
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [ocrLowConfidence, setOcrLowConfidence] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function reset() {
    setStage({ kind: "scanning" });
    setBatchForm(emptyBatch);
    setOcrLowConfidence(new Set());
  }

  async function handleDetected(barcode: string) {
    setStage({ kind: "looking_up", barcode });
    try {
      const res = await fetch(`/api/scan/lookup?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (res.ok && data.status === "database") {
        setStage({ kind: "existing_product", product: data.product, barcode });
        return;
      }
      if (res.ok && data.status === "external") {
        setStage({
          kind: "new_product",
          barcode,
          sourceLabel: data.provider,
          draft: {
            name: data.product.name,
            brand: data.product.brand,
            category: data.product.category,
            description: data.product.description,
            packageSize: data.product.packageSize,
            weight: data.product.weight,
            manufacturer: data.product.manufacturer,
            image: data.product.image,
            barcode,
          },
        });
        return;
      }
      if (res.status === 404) {
        setStage({ kind: "manual_entry", barcode, reason: "This barcode isn't in your database or any connected product API yet." });
        return;
      }
      if (res.status === 429) {
        setStage({ kind: "error", message: "Product API rate limit reached. Wait a moment and try again.", canRetry: true });
        return;
      }
      if (res.status === 504) {
        setStage({ kind: "error", message: "Lookup timed out — check your network connection.", canRetry: true });
        return;
      }
      setStage({ kind: "error", message: data.error || "Lookup failed unexpectedly.", canRetry: true });
    } catch {
      setStage({ kind: "error", message: "Network error while looking up this barcode.", canRetry: true });
    }
  }

  function handleScanError(kind: ScannerErrorKind, message: string) {
    setStage({ kind: "error", message, canRetry: kind !== "no_camera" });
  }

  async function saveNewProductWithBatch(barcode: string, draft: Partial<Product>, sourceLabel: string) {
    const quantity = Number(batchForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStage({ kind: "error", message: "Enter a valid quantity received before saving.", canRetry: true });
      return;
    }
    setSaving(true);
    try {
      const sku = `SKU-${barcode.slice(-6)}-${Date.now().toString().slice(-4)}`;
      const payload: Product = {
        id: `prod-${Date.now()}`,
        name: draft.name || "",
        sku,
        barcode,
        category: draft.category || "Uncategorized",
        brand: draft.brand || "",
        batch: batchForm.batchNumber,
        supplier: "",
        warehouse: batchForm.warehouse,
        shelf: "",
        stock: 0,
        minStock: 10,
        maxStock: 1000,
        unit: "pcs",
        mfgDate: batchForm.mfgDate,
        expiryDate: batchForm.expiryDate,
        lastRestocked: new Date().toISOString().slice(0, 10),
        lastUpdated: new Date().toISOString().slice(0, 10),
        healthScore: 100,
        status: "healthy",
        image: draft.image || "",
        description: draft.description || "",
        packageSize: draft.packageSize || "",
        weight: draft.weight || "",
        manufacturer: draft.manufacturer || "",
        source: (sourceLabel as Product["source"]) || "manual",
      };
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save product");
      const created: Product = await res.json();

      const batchRes = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: created.id,
          barcode,
          quantity,
          batchNumber: batchForm.batchNumber,
          lotNumber: batchForm.lotNumber,
          mfgDate: batchForm.mfgDate,
          expiryDate: batchForm.expiryDate,
          warehouse: batchForm.warehouse,
          scannedBy: "Ananya Sharma",
        }),
      });
      if (!batchRes.ok) {
        const err = await batchRes.json();
        throw new Error(err.error || "Product saved, but the batch couldn't be recorded.");
      }
      await fetch(`/api/products/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...created, stock: quantity }),
      });

      setStage({ kind: "saved", message: `Added ${created.name} to the database — ${quantity} units logged to inventory.` });
    } catch (err: any) {
      setStage({ kind: "error", message: err.message || "Couldn't save the product.", canRetry: true });
    } finally {
      setSaving(false);
    }
  }

  async function saveBatch(product: Product, barcode: string) {
    const quantity = Number(batchForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStage({ kind: "error", message: "Enter a valid quantity before saving.", canRetry: true });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          barcode,
          quantity,
          batchNumber: batchForm.batchNumber,
          lotNumber: batchForm.lotNumber,
          mfgDate: batchForm.mfgDate,
          expiryDate: batchForm.expiryDate,
          warehouse: batchForm.warehouse,
          scannedBy: "Ananya Sharma",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save batch");
      }
      // Reflect the new stock on the product record itself.
      await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          stock: (product.stock || 0) + quantity,
          batch: batchForm.batchNumber || product.batch,
          mfgDate: batchForm.mfgDate || product.mfgDate,
          expiryDate: batchForm.expiryDate || product.expiryDate,
          warehouse: batchForm.warehouse || product.warehouse,
          lastRestocked: new Date().toISOString().slice(0, 10),
          lastUpdated: new Date().toISOString().slice(0, 10),
        }),
      });
      setStage({ kind: "saved", message: `Received ${quantity} units of ${product.name} logged to inventory.` });
    } catch (err: any) {
      setStage({ kind: "error", message: err.message || "Couldn't save the batch.", canRetry: true });
    } finally {
      setSaving(false);
    }
  }

  function applyOcr(extraction: OcrExtraction, setDraftField?: (field: string, value: string) => void) {
    const low = new Set<string>();
    const map: Record<string, keyof typeof batchForm> = {
      expiryDate: "expiryDate",
      mfgDate: "mfgDate",
      batchNumber: "batchNumber",
      lotNumber: "lotNumber",
      quantity: "quantity",
    };
    const next = { ...batchForm };
    for (const [ocrKey, formKey] of Object.entries(map)) {
      const f = (extraction.fields as any)[ocrKey];
      if (f?.value) {
        (next as any)[formKey] = f.value;
        if (f.confidence < LOW_CONFIDENCE_THRESHOLD) low.add(formKey);
      }
    }
    setBatchForm(next);
    setOcrLowConfidence(low);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
          <ScanBarcode size={16} /> Scan a Barcode
        </h3>

        <div className="mb-3 flex gap-1 rounded-lg bg-surface2 p-1">
          {[
            { id: "camera" as const, label: "Camera", icon: CameraIcon },
            { id: "upload" as const, label: "Upload Image", icon: ImageUp },
            { id: "manual" as const, label: "Manual Entry", icon: Keyboard },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInputMethod(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
                inputMethod === tab.id ? "bg-surface text-text shadow-card" : "text-muted hover:text-text"
              }`}
            >
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {inputMethod === "camera" && (
          <BarcodeScanner
            active={stage.kind === "scanning" && inputMethod === "camera"}
            onDetected={(barcode) => handleDetected(barcode)}
            onError={handleScanError}
          />
        )}
        {inputMethod === "upload" && stage.kind === "scanning" && (
          <BarcodeImageUpload onDetected={(barcode) => handleDetected(barcode)} />
        )}
        {inputMethod === "manual" && stage.kind === "scanning" && (
          <ManualBarcodeEntry onSubmit={(barcode) => handleDetected(barcode)} />
        )}

        {stage.kind === "looking_up" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Loader2 size={14} className="animate-spin" /> Looking up {stage.barcode}…
          </div>
        )}
        {stage.kind !== "scanning" && (
          <Button className="mt-3" size="sm" variant="secondary" onClick={reset}>
            <RotateCcw size={13} /> Scan another
          </Button>
        )}
      </Card>

      <Card className="p-4">
        {stage.kind === "scanning" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted">
            <PackageSearch size={28} />
            Point the camera at a barcode or QR code to begin.
          </div>
        )}

        {stage.kind === "error" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-out/30 bg-out/10 p-3 text-sm text-out">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {stage.message}
            </div>
            {stage.canRetry && (
              <Button size="sm" onClick={reset}>
                <RotateCcw size={13} /> Try again
              </Button>
            )}
          </div>
        )}

        {stage.kind === "saved" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 size={32} className="text-healthy" />
            <p className="text-sm">{stage.message}</p>
            <Button size="sm" onClick={reset}>
              <RotateCcw size={13} /> Scan next item
            </Button>
          </div>
        )}

        {(stage.kind === "existing_product" || stage.kind === "manual_entry" || stage.kind === "new_product") && (
          <BatchAndProductForm
            stage={stage}
            batchForm={batchForm}
            setBatchForm={setBatchForm}
            ocrLowConfidence={ocrLowConfidence}
            applyOcr={applyOcr}
            saving={saving}
            onSaveNewProduct={(draft) => saveNewProductWithBatch(stage.kind === "new_product" ? stage.barcode : (stage as any).barcode, draft, stage.kind === "new_product" ? stage.sourceLabel : "manual")}
            onSaveBatch={(product) => saveBatch(product, (stage as any).barcode)}
          />
        )}
      </Card>
    </div>
  );
}

function BatchAndProductForm({
  stage,
  batchForm,
  setBatchForm,
  ocrLowConfidence,
  applyOcr,
  saving,
  onSaveNewProduct,
  onSaveBatch,
}: {
  stage: Extract<Stage, { kind: "existing_product" | "manual_entry" | "new_product" }>;
  batchForm: typeof emptyBatch;
  setBatchForm: (v: typeof emptyBatch) => void;
  ocrLowConfidence: Set<string>;
  applyOcr: (extraction: OcrExtraction) => void;
  saving: boolean;
  onSaveNewProduct: (draft: Partial<Product>) => void;
  onSaveBatch: (product: Product) => void;
}) {
  const [draft, setDraft] = useState<Partial<Product>>(stage.kind === "new_product" ? stage.draft : emptyDraft);
  const isNewOrManual = stage.kind === "new_product" || stage.kind === "manual_entry";

  const inputClass = (field: string) =>
    `h-9 w-full rounded-lg border bg-surface2 px-3 text-sm outline-none focus:border-primary ${
      ocrLowConfidence.has(field) ? "border-low ring-1 ring-low/50" : "border-border"
    }`;

  return (
    <div className="space-y-4">
      {stage.kind === "existing_product" && (
        <div className="flex items-center gap-2 rounded-lg border border-healthy/30 bg-healthy/10 p-2.5 text-sm text-healthy">
          <CheckCircle2 size={15} /> Found in database — {stage.product.name}
        </div>
      )}
      {stage.kind === "new_product" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-sm text-primary">
          Not in your database. Auto-filled from {stage.sourceLabel === "openfoodfacts" ? "Open Food Facts" : "UPCitemdb"} — review before saving.
        </div>
      )}
      {stage.kind === "manual_entry" && (
        <div className="rounded-lg border border-low/30 bg-low/10 p-2.5 text-sm text-low">{stage.reason} Enter details manually.</div>
      )}

      {isNewOrManual && (
        <div className="grid grid-cols-2 gap-2">
          {[
            ["name", "Product Name"],
            ["brand", "Brand"],
            ["category", "Category"],
            ["manufacturer", "Manufacturer"],
            ["packageSize", "Package Size"],
            ["weight", "Weight"],
          ].map(([key, label]) => (
            <label key={key} className="col-span-1 space-y-1">
              <span className="text-xs text-muted">{label}</span>
              <input
                className="h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
                value={(draft as any)[key] || ""}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-muted">Description</span>
            <textarea
              className="w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary"
              rows={2}
              value={draft.description || ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
        </div>
      )}

      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">
            {stage.kind === "existing_product" ? "Batch details for this delivery" : "Batch details (dates, batch/lot, quantity)"}
          </p>
          <OcrCapture onExtracted={applyOcr} barcode={stage.barcode} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted">Quantity received</span>
            <input
              type="number"
              min={1}
              className={inputClass("quantity")}
              value={batchForm.quantity}
              onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Warehouse</span>
            <select
              className={inputClass("warehouse")}
              value={batchForm.warehouse}
              onChange={(e) => setBatchForm({ ...batchForm, warehouse: e.target.value })}
            >
              <option value="">Select…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Batch number</span>
            <input className={inputClass("batchNumber")} value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Lot number</span>
            <input className={inputClass("lotNumber")} value={batchForm.lotNumber} onChange={(e) => setBatchForm({ ...batchForm, lotNumber: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Manufacturing date</span>
            <input type="date" className={inputClass("mfgDate")} value={batchForm.mfgDate} onChange={(e) => setBatchForm({ ...batchForm, mfgDate: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Expiry date</span>
            <input type="date" className={inputClass("expiryDate")} value={batchForm.expiryDate} onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })} />
          </label>
        </div>
        {ocrLowConfidence.size > 0 && (
          <p className="flex items-center gap-1 text-xs text-low">
            <AlertCircle size={12} /> Highlighted fields had low OCR confidence — please verify.
          </p>
        )}

        {stage.kind === "existing_product" ? (
          <Button size="sm" disabled={saving} onClick={() => onSaveBatch(stage.product)}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save to inventory
          </Button>
        ) : (
          <Button size="sm" disabled={saving || !draft.name} onClick={() => onSaveNewProduct(draft)}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save product & batch to inventory
          </Button>
        )}
      </div>
    </div>
  );
}
