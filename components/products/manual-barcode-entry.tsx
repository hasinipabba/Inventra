"use client";

import { useState } from "react";
import { Keyboard, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSubmit: (barcode: string) => void;
}

export function ManualBarcodeEntry({ onSubmit }: Props) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <div className="relative flex-1">
        <Keyboard size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type or paste a barcode number…"
          className="h-9 w-full rounded-lg border border-border bg-surface2 pl-8 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <Button type="submit" size="sm" disabled={!value.trim()}>
        <Search size={13} /> Look up
      </Button>
    </form>
  );
}
