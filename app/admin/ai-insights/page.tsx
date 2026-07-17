import { Topbar } from "@/components/topbar";
import { Card, StatCard } from "@/components/ui/card";
import { AIInsightCard } from "@/components/ui/ai-insight-card";
import { aiInsights } from "@/lib/mock-data";
import { Sparkles, TrendingUp, ArrowLeftRight, CalendarClock } from "lucide-react";

export default function AIInsightsPage() {
  const byUrgency = { high: aiInsights.filter((i) => i.urgency === "high"), medium: aiInsights.filter((i) => i.urgency === "medium"), low: aiInsights.filter((i) => i.urgency === "low") };

  return (
    <>
      <Topbar title="AI Insights" />
      <main className="animate-fade-in flex-1 space-y-6 p-4 md:p-6">
        <Card className="flex items-center gap-4 border-primary/20 bg-primary/5 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="font-display text-sm font-semibold">Inventra AI is watching {aiInsights.length * 47} data points across 4 warehouses</p>
            <p className="text-xs text-muted">Recommendations refresh every 15 minutes based on sales velocity, expiry dates, and warehouse capacity.</p>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="High Urgency" value={byUrgency.high.length} icon={TrendingUp} accent="out" />
          <StatCard label="Medium Urgency" value={byUrgency.medium.length} icon={ArrowLeftRight} accent="low" />
          <StatCard label="Monitoring" value={byUrgency.low.length} icon={CalendarClock} accent="primary" />
        </div>

        <div>
          <h2 className="mb-3 font-display text-sm font-semibold">All Recommendations</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {aiInsights.map((i) => (
              <AIInsightCard key={i.id} insight={i} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
