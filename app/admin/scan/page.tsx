import { Topbar } from "@/components/topbar";
import dynamic from "next/dynamic";

const ScanWorkflow = dynamic(
  () => import("@/components/products/scan-workflow").then((m) => ({ default: m.ScanWorkflow })),
  { ssr: false, loading: () => null }
);

export default function ScanPage() {
  return (
    <>
      <Topbar title="AI Product Scanner" />
      <main className="animate-fade-in flex-1 p-4 md:p-6">
        <ScanWorkflow />
      </main>
    </>
  );
}
