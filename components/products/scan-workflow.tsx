"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, PackageSearch, RotateCcw, Save, ScanBarcode, Camera as CameraIcon, ImageUp, Keyboard, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Product } from "@/lib/types";
import { BarcodeScanner, type ScannerErrorKind } from "./barcode-scanner";
import { BarcodeImageUpload } from "./barcode-image-upload";
import { ManualBarcodeEntry } from "./manual-barcode-entry";
import { OcrCapture } from "./ocr-capture";
import { runOcr, LOW_CONFIDENCE_THRESHOLD, type OcrExtraction } from "./ocr-extract";
import { calculateProductHealth } from "@/lib/product-health";

type Stage =
  | { kind: "scanning" }
  | { kind: "looking_up"; barcode: string }
  | { kind: "existing_product"; product: Product; barcode: string }
  | { kind: "new_product"; barcode: string; draft: Partial<Product>; sourceLabel: string }
  | { kind: "manual_entry"; barcode: string; reason: string }
  | { kind: "saved"; message: string }
  | { kind: "error"; message: string; canRetry: boolean };

const emptyBatch = { quantity: "1", batchNumber: "", lotNumber: "", mfgDate: "", expiryDate: "", warehouse: "", mrp: "", netWeight: "" };
const emptyDraft: Partial<Product> = { name: "", brand: "", category: "", description: "", packageSize: "", weight: "", manufacturer: "", image: "" };

export function ScanWorkflow() {
  const [stage, setStage] = useState<Stage>({ kind: "scanning" });
  const [inputMethod, setInputMethod] = useState<"camera" | "upload" | "ocr" | "manual">("camera");
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [warehouseNames, setWarehouseNames] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/warehouses").then((r) => r.json()).then((ws: { name: string }[]) => setWarehouseNames(ws.map((w) => w.name))).catch(() => {});
  }, []);
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
        setStage({ kind: "manual_entry", barcode, reason: "External product lookup limit reached. You can enter details and save." });
        return;
      }
      if (res.status === 504) {
        setStage({ kind: "manual_entry", barcode, reason: "Lookup timed out. You can enter details and save." });
        return;
      }
      setStage({ kind: "manual_entry", barcode, reason: data.error || "Enter details to save to inventory." });
    } catch {
      setStage({ kind: "manual_entry", barcode, reason: "Network lookup skipped. Enter details to save to inventory." });
    }
  }

  function handleScanError(kind: ScannerErrorKind, message: string) {
    setStage({ kind: "error", message, canRetry: kind !== "no_camera" });
  }

  async function saveNewProductWithBatch(barcode: string, draft: Partial<Product>, sourceLabel: string) {
    const rawQty = Number(batchForm.quantity);
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const warehouse = batchForm.warehouse || warehouseNames[0] || "Warehouse A — Hyderabad";
    setSaving(true);
    try {
      const sku = `SKU-${barcode.slice(-6)}-${Date.now().toString().slice(-4)}`;
      const name = draft.name?.trim() || `Product ${batchForm.batchNumber || barcode}`;
      const initialHealth = calculateProductHealth({
        stock: 0,
        minStock: 10,
        expiryDate: batchForm.expiryDate,
      });
      const payload: Product = {
        id: `prod-${Date.now()}`,
        name,
        sku,
        barcode,
        category: draft.category || "Uncategorized",
        brand: draft.brand || "",
        batch: batchForm.batchNumber,
        supplier: "",
        warehouse,
        shelf: "",
        stock: 0,
        minStock: 10,
        maxStock: 1000,
        unit: "pcs",
        mfgDate: batchForm.mfgDate,
        expiryDate: batchForm.expiryDate,
        lastRestocked: new Date().toISOString().slice(0, 10),
        lastUpdated: new Date().toISOString().slice(0, 10),
        healthScore: initialHealth.healthScore,
        status: initialHealth.status,
        image: draft.image || "",
        description: draft.description || "",
        packageSize: draft.packageSize || "",
        weight: draft.weight || batchForm.netWeight || "",
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
          mrp: batchForm.mrp,
          netWeight: batchForm.netWeight,
          warehouse,
          scannedBy: "Ananya Sharma",
        }),
      });
      if (!batchRes.ok) {
        const err = await batchRes.json();
        throw new Error(err.error || "Product saved, but the batch couldn't be recorded.");
      }
      const updatedHealth = calculateProductHealth({
        stock: quantity,
        minStock: created.minStock || 10,
        expiryDate: batchForm.expiryDate || created.expiryDate,
      });
      await fetch(`/api/products/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...created,
          stock: quantity,
          status: updatedHealth.status,
          healthScore: updatedHealth.healthScore,
          expiryDate: batchForm.expiryDate || created.expiryDate,
          batch: batchForm.batchNumber || created.batch,
        }),
      });

      setStage({ kind: "saved", message: `Added ${created.name} to the database — ${quantity} units logged to inventory.` });
    } catch (err: any) {
      setStage({ kind: "error", message: err.message || "Couldn't save the product.", canRetry: true });
    } finally {
      setSaving(false);
    }
  }

  async function saveBatch(product: Product, barcode: string) {
    const rawQty = Number(batchForm.quantity);
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;
    const warehouse = batchForm.warehouse || product.warehouse || warehouseNames[0] || "Warehouse A — Hyderabad";
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
          mrp: batchForm.mrp,
          netWeight: batchForm.netWeight,
          warehouse,
          scannedBy: "Ananya Sharma",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save batch");
      }
      const updatedStock = (product.stock || 0) + quantity;
      const updatedExpiry = batchForm.expiryDate || product.expiryDate;
      const updatedHealth = calculateProductHealth({
        stock: updatedStock,
        minStock: product.minStock || 10,
        expiryDate: updatedExpiry,
      });
      // Reflect the new stock and calculated health on the product record itself.
      await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...product,
          stock: updatedStock,
          batch: batchForm.batchNumber || product.batch,
          mfgDate: batchForm.mfgDate || product.mfgDate,
          expiryDate: updatedExpiry,
          warehouse,
          status: updatedHealth.status,
          healthScore: updatedHealth.healthScore,
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

  function applyOcr(extraction: OcrExtraction) {
    const low = new Set<string>();
    const map: Record<string, keyof typeof batchForm> = {
      expiryDate: "expiryDate",
      mfgDate: "mfgDate",
      batchNumber: "batchNumber",
      lotNumber: "lotNumber",
      quantity: "quantity",
      mrp: "mrp",
      netWeight: "netWeight",
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

  async function handleDirectOcrExtracted(extraction: OcrExtraction) {
    const cleanedDigits = extraction.rawText.match(/\b(?:\d[\s-]?){8,14}\b/);
    const barcode = cleanedDigits ? cleanedDigits[0].replace(/[\s-]/g, "") : `OCR-${Date.now().toString().slice(-6)}`;

    applyOcr(extraction);
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
            weight: extraction.fields.netWeight?.value || data.product.weight || "",
            manufacturer: data.product.manufacturer,
            image: data.product.image,
            barcode,
          },
        });
        return;
      }
      setStage({
        kind: "manual_entry",
        barcode,
        reason: "Packaging label scanned via OCR. Review details and enter product name.",
      });
    } catch {
      setStage({
        kind: "manual_entry",
        barcode,
        reason: "Packaging label scanned via OCR. Review details and enter product name.",
      });
    }
  }

  async function handleOcrFallback(canvas: HTMLCanvasElement) {
    setStage({ kind: "looking_up", barcode: "Reading label via OCR…" });
    try {
      const extraction = await runOcr(canvas);
      await handleDirectOcrExtracted(extraction);
    } catch {
      setStage({
        kind: "error",
        message: "Failed to read text from this crop. Try a clearer photo with high contrast.",
        canRetry: true,
      });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
          <ScanBarcode size={16} /> Scan a Barcode or Label
        </h3>

        <div className="mb-3 flex gap-1 rounded-lg bg-surface2 p-1">
          {[
            { id: "camera" as const, label: "Camera", icon: CameraIcon },
            { id: "upload" as const, label: "Upload Barcode", icon: ImageUp },
            { id: "ocr" as const, label: "Label OCR", icon: ScanText },
            { id: "manual" as const, label: "Manual Entry", icon: Keyboard },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setInputMethod(tab.id);
                if (stage.kind === "error") {
                  setStage({ kind: "scanning" });
                }
              }}
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
          <BarcodeImageUpload
            onDetected={(barcode) => handleDetected(barcode)}
            onOcrFallback={handleOcrFallback}
          />
        )}
        {inputMethod === "ocr" && stage.kind === "scanning" && (
          <div className="space-y-3 rounded-lg border border-border bg-surface2/60 p-4">
            <div>
              <h4 className="text-xs font-semibold text-text">Direct Packaging Label OCR</h4>
              <p className="text-[11px] text-muted">
                Scan or upload packaging photos to automatically read Expiry Date, Manufacturing Date, Batch Number, MRP, and Net Weight.
              </p>
            </div>
            <OcrCapture onExtracted={handleDirectOcrExtracted} />
          </div>
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
          <div className="flex h-full flex-col items-center justify-center gap-4 py-8 text-center text-sm text-muted">
            <div className="flex flex-col items-center gap-2">
              <PackageSearch size={32} className="text-primary/70" />
              <p className="font-medium text-text">Scan a barcode or product label</p>
              <p className="max-w-xs text-xs text-muted">
                Scan or upload a barcode on the left, or use direct Label OCR to scan printed expiry dates and batch codes.
              </p>
            </div>
            <div className="w-full max-w-sm rounded-lg border border-border bg-surface2/70 p-3 text-left">
              <p className="mb-0.5 text-xs font-semibold text-text">Quick Label OCR</p>
              <p className="mb-2 text-[11px] text-muted">Have a packaging photo with expiry date or batch number?</p>
              <OcrCapture onExtracted={handleDirectOcrExtracted} />
            </div>
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
            warehouseNames={warehouseNames}
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
  warehouseNames,
  onSaveNewProduct,
  onSaveBatch,
}: {
  stage: Extract<Stage, { kind: "existing_product" | "manual_entry" | "new_product" }>;
  batchForm: typeof emptyBatch;
  setBatchForm: (v: typeof emptyBatch) => void;
  ocrLowConfidence: Set<string>;
  applyOcr: (extraction: OcrExtraction) => void;
  saving: boolean;
  warehouseNames: string[];
  onSaveNewProduct: (draft: Partial<Product>) => void;
  onSaveBatch: (product: Product) => void;
}) {
  const [draft, setDraft] = useState<Partial<Product>>(stage.kind === "new_product" ? stage.draft : emptyDraft);
  const isNewOrManual = stage.kind === "new_product" || stage.kind === "manual_entry";

  const inputClass = (field: string) =>
    `h-9 w-full rounded-lg border bg-surface2 px-3 text-sm outline-none focus:border-primary ${
      ocrLowConfidence.has(field) ? "border-low ring-1 ring-low/50" : "border-border"
    }`;

  const handleOcrExtracted = (extraction: OcrExtraction) => {
    applyOcr(extraction);
    if (isNewOrManual && extraction.fields.netWeight?.value && !draft.weight) {
      setDraft((d) => ({ ...d, weight: extraction.fields.netWeight?.value }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action header with immediate Save button */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
        <div>
          <h4 className="text-sm font-semibold text-text">
            {stage.kind === "existing_product" ? "Product & Batch Details" : "New Scanned Item"}
          </h4>
          <p className="text-xs text-muted">
            {stage.kind === "existing_product"
              ? "Review and click Save to log batch."
              : "Review details and click Save to add to inventory."}
          </p>
        </div>
        {stage.kind === "existing_product" ? (
          <Button
            size="sm"
            variant="primary"
            className="font-semibold shadow-sm"
            disabled={saving}
            onClick={() => onSaveBatch(stage.product)}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save to Inventory
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="font-semibold shadow-sm"
            disabled={saving}
            onClick={() => {
              const nameToSave = draft.name?.trim() || `Product ${batchForm.batchNumber || stage.barcode}`;
              onSaveNewProduct({ ...draft, name: nameToSave });
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save to Inventory
          </Button>
        )}
      </div>

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
          <OcrCapture onExtracted={handleOcrExtracted} barcode={stage.barcode} />
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
              {warehouseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
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
          <label className="space-y-1">
            <span className="text-xs text-muted">MRP (₹)</span>
            <input
              type="text"
              placeholder="e.g. 199.00"
              className={inputClass("mrp")}
              value={batchForm.mrp}
              onChange={(e) => setBatchForm({ ...batchForm, mrp: e.target.value })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Net Weight / Volume</span>
            <input
              type="text"
              placeholder="e.g. 500g, 1L"
              className={inputClass("netWeight")}
              value={batchForm.netWeight}
              onChange={(e) => setBatchForm({ ...batchForm, netWeight: e.target.value })}
            />
          </label>
        </div>

        {(() => {
          if (!batchForm.expiryDate) return null;
          const health = calculateProductHealth({
            stock: Number(batchForm.quantity) || 1,
            minStock: 10,
            expiryDate: batchForm.expiryDate,
          });
          if (health.isExpired) {
            return (
              <div className="flex items-center gap-2 rounded-lg border border-out/40 bg-out/10 p-2.5 text-xs text-out font-medium">
                <AlertCircle size={15} className="shrink-0" />
                <span>CRITICAL: {health.reason}. This product will be flagged as Expired (0% health).</span>
              </div>
            );
          }
          if (health.isExpiringSoon) {
            return (
              <div className="flex items-center gap-2 rounded-lg border border-expiring/40 bg-expiring/10 p-2.5 text-xs text-expiring font-medium">
                <AlertCircle size={15} className="shrink-0" />
                <span>WARNING: {health.reason}. This product will be flagged as Expiring Soon ({health.healthScore}% health).</span>
              </div>
            );
          }
          return null;
        })()}

        {ocrLowConfidence.size > 0 && (
          <p className="flex items-center gap-1 text-xs text-low">
            <AlertCircle size={12} /> Highlighted fields had low OCR confidence — please verify.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted">
            {stage.kind === "existing_product"
              ? "Ready to log this delivery batch to stock."
              : "Product name will auto-default if left blank."}
          </p>
          {stage.kind === "existing_product" ? (
            <Button
              size="lg"
              variant="primary"
              className="min-w-48 font-semibold shadow-md"
              disabled={saving}
              onClick={() => onSaveBatch(stage.product)}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save to Inventory
            </Button>
          ) : (
            <Button
              size="lg"
              variant="primary"
              className="min-w-56 font-semibold shadow-md"
              disabled={saving}
              onClick={() => {
                const nameToSave = draft.name?.trim() || `Product ${batchForm.batchNumber || stage.barcode}`;
                onSaveNewProduct({ ...draft, name: nameToSave });
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Product & Batch
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
