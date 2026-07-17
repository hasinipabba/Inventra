import type {
  Product,
  Category,
  Warehouse,
  Supplier,
  AppUser,
  AIInsight,
  NotificationItem,
  PurchaseRequest,
  StaffMember,
} from "./types";

export const categories: Category[] = [
  { id: "cat-1", name: "Dairy & Chilled", productCount: 84, totalStock: 12480, color: "#3B82F6" },
  { id: "cat-2", name: "Pharmaceuticals", productCount: 156, totalStock: 34210, color: "#22C55E" },
  { id: "cat-3", name: "Packaged Foods", productCount: 210, totalStock: 58920, color: "#F59E0B" },
  { id: "cat-4", name: "Beverages", productCount: 97, totalStock: 21050, color: "#F97316" },
  { id: "cat-5", name: "Produce", productCount: 63, totalStock: 8720, color: "#22C1C3" },
  { id: "cat-6", name: "Household", productCount: 128, totalStock: 19640, color: "#8B5CF6" },
];

export const warehouses: Warehouse[] = [
  { id: "wh-1", name: "Warehouse A — Hyderabad", location: "Hyderabad, TG", capacity: 50000, used: 41200, products: 412, manager: "Rahul Mehta", transfersPending: 3 },
  { id: "wh-2", name: "Warehouse B — Pune", location: "Pune, MH", capacity: 38000, used: 35800, products: 356, manager: "Sneha Kulkarni", transfersPending: 5 },
  { id: "wh-3", name: "Warehouse C — Chennai", location: "Chennai, TN", capacity: 42000, used: 19400, products: 298, manager: "Arun Prakash", transfersPending: 1 },
  { id: "wh-4", name: "Warehouse D — Delhi NCR", location: "Gurugram, HR", capacity: 60000, used: 52900, products: 501, manager: "Priya Nair", transfersPending: 7 },
];

export const suppliers: Supplier[] = [
  { id: "sup-1", name: "Amul Distribution Co.", contact: "Vikram Rao", email: "vikram@amuldist.example", productsSupplied: 62, reliability: 96, lastOrder: "2026-06-28", status: "active" },
  { id: "sup-2", name: "Cipla Wholesale Ltd.", contact: "Neha Joshi", email: "neha@ciplawholesale.example", productsSupplied: 140, reliability: 91, lastOrder: "2026-07-01", status: "active" },
  { id: "sup-3", name: "ITC Foods Supply", contact: "Manoj Tiwari", email: "manoj@itcfoods.example", productsSupplied: 88, reliability: 88, lastOrder: "2026-06-20", status: "active" },
  { id: "sup-4", name: "Coastal Farms Produce", contact: "Lakshmi Iyer", email: "lakshmi@coastalfarms.example", productsSupplied: 34, reliability: 74, lastOrder: "2026-06-11", status: "pending" },
  { id: "sup-5", name: "Reckitt Home Essentials", contact: "Sameer Khan", email: "sameer@reckitthome.example", productsSupplied: 51, reliability: 82, lastOrder: "2026-05-30", status: "inactive" },
];

export const users: AppUser[] = [
  { id: "u-1", name: "Ananya Sharma", email: "ananya@inventra.example", role: "Administrator", warehouse: "All Warehouses", status: "active", lastActive: "2026-07-05T08:12:00" },
  { id: "u-2", name: "Rahul Mehta", email: "rahul@inventra.example", role: "Inventory Manager", warehouse: "Warehouse A — Hyderabad", status: "active", lastActive: "2026-07-05T07:40:00" },
  { id: "u-3", name: "Sneha Kulkarni", email: "sneha@inventra.example", role: "Inventory Manager", warehouse: "Warehouse B — Pune", status: "active", lastActive: "2026-07-04T18:05:00" },
  { id: "u-4", name: "Arjun Verma", email: "arjun@inventra.example", role: "Warehouse Staff", warehouse: "Warehouse A — Hyderabad", status: "active", lastActive: "2026-07-05T09:02:00" },
  { id: "u-5", name: "Divya Reddy", email: "divya@inventra.example", role: "Warehouse Staff", warehouse: "Warehouse D — Delhi NCR", status: "invited", lastActive: "—" },
  { id: "u-6", name: "Karthik Iyer", email: "karthik@inventra.example", role: "Warehouse Staff", warehouse: "Warehouse C — Chennai", status: "suspended", lastActive: "2026-06-22T14:30:00" },
];

const names = [
  "Amul Toned Milk 1L", "Paracetamol 500mg Strip", "Britannia Marie Gold 200g", "Coca-Cola 750ml",
  "Fresh Tomatoes 1kg", "Surf Excel 1kg", "Amoxicillin 250mg", "Maggi Noodles 70g",
  "Tata Salt 1kg", "Dettol Handwash 200ml", "Basmati Rice 5kg", "Cadbury Dairy Milk 55g",
  "Insulin Vial 10ml", "Onions 1kg", "Aashirvaad Atta 5kg", "Colgate Toothpaste 150g",
  "Sprite 750ml", "Bananas 1 dozen", "Azithromycin 500mg", "Nescafe Classic 100g",
];
const cats = categories.map((c) => c.name);
const brands = ["Amul", "Cipla", "Britannia", "Coca-Cola", "Fresh Farms", "Hindustan Unilever", "Cadbury", "ITC", "Tata", "Reckitt"];
const shelves = ["A1-03", "A2-11", "B3-05", "B4-02", "C1-08", "C2-14", "D1-01", "D3-09"];
const statusCycle: Product["status"][] = ["healthy", "healthy", "healthy", "low", "out", "expiring", "expired"];

function seedProducts(): Product[] {
  const list: Product[] = [];
  for (let i = 0; i < 60; i++) {
    const name = names[i % names.length];
    const status = statusCycle[i % statusCycle.length];
    const stock = status === "out" ? 0 : status === "low" ? Math.floor(Math.random() * 20) + 3 : Math.floor(Math.random() * 400) + 60;
    const min = 40;
    const max = 500;
    const health = status === "healthy" ? 85 + Math.floor(Math.random() * 15) : status === "low" ? 45 + Math.floor(Math.random() * 15) : status === "expiring" ? 30 + Math.floor(Math.random() * 15) : status === "expired" ? Math.floor(Math.random() * 15) : 0;
    list.push({
      id: `prod-${1000 + i}`,
      name: `${name}${i >= names.length ? " " + (Math.floor(i / names.length) + 1) : ""}`,
      sku: `SKU-${(1000 + i).toString().padStart(5, "0")}`,
      barcode: `8901${(200000 + i * 7).toString()}`,
      category: cats[i % cats.length],
      brand: brands[i % brands.length],
      batch: `BATCH-${(i % 12) + 1}-${2026}`,
      supplier: suppliers[i % suppliers.length].name,
      warehouse: warehouses[i % warehouses.length].name,
      shelf: shelves[i % shelves.length],
      stock,
      minStock: min,
      maxStock: max,
      unit: i % 3 === 0 ? "pcs" : i % 3 === 1 ? "kg" : "box",
      mfgDate: "2026-03-15",
      expiryDate: status === "expired" ? "2026-06-01" : status === "expiring" ? "2026-07-10" : "2027-01-20",
      lastRestocked: "2026-06-29",
      lastUpdated: "2026-07-04",
      healthScore: health,
      status,
      image: "",
    });
  }
  return list;
}

export const products: Product[] = seedProducts();

export const aiInsights: AIInsight[] = [
  { id: "ai-1", type: "restock", title: "Amul Toned Milk 1L will run out in 2 days", detail: "Current velocity suggests stockout by Jul 7. Recommend restocking 150 units from Amul Distribution Co.", urgency: "high", product: "Amul Toned Milk 1L" },
  { id: "ai-2", type: "transfer", title: "Transfer 80 units from Warehouse A", detail: "Warehouse D is trending toward a stockout on Paracetamol 500mg while Warehouse A holds surplus.", urgency: "medium", product: "Paracetamol 500mg Strip" },
  { id: "ai-3", type: "expiry", title: "42 products expire this week", detail: "Concentrated in Pharmaceuticals and Dairy & Chilled. Prioritize markdown or supplier return.", urgency: "high" },
  { id: "ai-4", type: "slow-moving", title: "Cadbury Dairy Milk 55g hasn't moved in 90 days", detail: "Consider a bundle promotion or redistributing stock to a higher-footfall warehouse.", urgency: "low", product: "Cadbury Dairy Milk 55g" },
  { id: "ai-5", type: "excess", title: "Warehouse B has excess inventory", detail: "Utilization is at 94% with 12 slow-moving SKUs. Recommend redistribution to Warehouse C.", urgency: "medium" },
  { id: "ai-6", type: "restock", title: "Insulin Vial 10ml projected to breach minimum stock", detail: "Demand forecast shows a 23% spike next week. Recommend a purchase request for 200 units.", urgency: "high", product: "Insulin Vial 10ml" },
];

export const notifications: NotificationItem[] = [
  { id: "n-1", category: "Out of Stock", message: "Paracetamol 500mg Strip is out of stock at Warehouse D.", time: "8 min ago", read: false },
  { id: "n-2", category: "Expiry", message: "Insulin Vial 10ml batch BATCH-3-2026 expires in 4 days.", time: "22 min ago", read: false },
  { id: "n-3", category: "Purchase Request", message: "Rahul Mehta submitted a request for 150 units of Amul Toned Milk 1L.", time: "1 hr ago", read: false },
  { id: "n-4", category: "Transfer", message: "Transfer of 80 units approved: Warehouse A → Warehouse D.", time: "2 hr ago", read: true },
  { id: "n-5", category: "Warehouse", message: "Warehouse B utilization crossed 94% capacity.", time: "5 hr ago", read: true },
  { id: "n-6", category: "Shipment", message: "Incoming shipment from ITC Foods Supply arriving tomorrow, 9 AM.", time: "6 hr ago", read: true },
  { id: "n-7", category: "AI Recommendation", message: "AI suggests redistributing slow-moving stock from Warehouse B.", time: "1 day ago", read: true },
  { id: "n-8", category: "Low Stock", message: "Britannia Marie Gold 200g fell below minimum stock threshold.", time: "1 day ago", read: true },
];

export const purchaseRequests: PurchaseRequest[] = [
  { id: "pr-1", product: "Amul Toned Milk 1L", quantity: 150, requestedBy: "Rahul Mehta", warehouse: "Warehouse A — Hyderabad", status: "pending", date: "2026-07-05", estCost: 9750 },
  { id: "pr-2", product: "Insulin Vial 10ml", quantity: 200, requestedBy: "Sneha Kulkarni", warehouse: "Warehouse B — Pune", status: "pending", date: "2026-07-04", estCost: 84000 },
  { id: "pr-3", product: "Tata Salt 1kg", quantity: 300, requestedBy: "Priya Nair", warehouse: "Warehouse D — Delhi NCR", status: "approved", date: "2026-07-02", estCost: 6600 },
  { id: "pr-4", product: "Basmati Rice 5kg", quantity: 100, requestedBy: "Arun Prakash", warehouse: "Warehouse C — Chennai", status: "rejected", date: "2026-06-29", estCost: 32000 },
  { id: "pr-5", product: "Dettol Handwash 200ml", quantity: 250, requestedBy: "Rahul Mehta", warehouse: "Warehouse A — Hyderabad", status: "approved", date: "2026-06-27", estCost: 21250 },
];

export const staff: StaffMember[] = [
  { id: "st-1", name: "Ravi Kumar", role: "Warehouse Supervisor", department: "Warehouse A — Hyderabad", phone: "+91 98480 11223", email: "ravi.kumar@inventra.example", shiftStart: "09:00", shiftEnd: "18:00", status: "active", joinDate: "2023-02-14", avatarColor: "#3B82F6" },
  { id: "st-2", name: "Meera Pillai", role: "Picker", department: "Warehouse A — Hyderabad", phone: "+91 90000 22334", email: "meera.pillai@inventra.example", shiftStart: "09:00", shiftEnd: "18:00", status: "active", joinDate: "2023-08-01", avatarColor: "#22C55E" },
  { id: "st-3", name: "Suresh Babu", role: "Forklift Operator", department: "Warehouse B — Pune", phone: "+91 91234 55667", email: "suresh.babu@inventra.example", shiftStart: "08:00", shiftEnd: "17:00", status: "active", joinDate: "2022-11-20", avatarColor: "#F59E0B" },
  { id: "st-4", name: "Anjali Deshmukh", role: "Packer", department: "Warehouse B — Pune", phone: "+91 98765 44556", email: "anjali.d@inventra.example", shiftStart: "10:00", shiftEnd: "19:00", status: "active", joinDate: "2024-01-09", avatarColor: "#F97316" },
  { id: "st-5", name: "Vikram Singh", role: "Quality Checker", department: "Warehouse C — Chennai", phone: "+91 99887 66554", email: "vikram.singh@inventra.example", shiftStart: "09:00", shiftEnd: "18:00", status: "on-leave", joinDate: "2023-05-17", avatarColor: "#22C1C3" },
  { id: "st-6", name: "Lakshmi Narayan", role: "Picker", department: "Warehouse D — Delhi NCR", phone: "+91 97654 32109", email: "lakshmi.n@inventra.example", shiftStart: "09:00", shiftEnd: "18:00", status: "active", joinDate: "2024-03-22", avatarColor: "#8B5CF6" },
];

export const inventoryTrend = [
  { month: "Jan", inStock: 62000, lowStock: 4200, outOfStock: 900 },
  { month: "Feb", inStock: 64500, lowStock: 3900, outOfStock: 750 },
  { month: "Mar", inStock: 66200, lowStock: 4600, outOfStock: 1100 },
  { month: "Apr", inStock: 65800, lowStock: 5100, outOfStock: 1300 },
  { month: "May", inStock: 68900, lowStock: 3800, outOfStock: 820 },
  { month: "Jun", inStock: 71200, lowStock: 3500, outOfStock: 640 },
  { month: "Jul", inStock: 73450, lowStock: 3120, outOfStock: 480 },
];

export const expiryTimeline = [
  { week: "This Week", count: 42 },
  { week: "Next Week", count: 28 },
  { week: "Week 3", count: 19 },
  { week: "Week 4", count: 11 },
];

export const warehouseDistribution = warehouses.map((w) => ({ name: w.name.split("—")[1]?.trim() ?? w.name, value: w.products }));

// --- Additive dashboard-only data below. Nothing above this line was changed. ---

export type ActivityKind = "scan" | "add" | "update" | "alert" | "report";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  meta: string;
  time: string;
  status: "success" | "warning" | "danger" | "neutral";
}

export const activityFeed: ActivityEvent[] = [
  { id: "act-1", kind: "scan", title: "Scanned Amul Toned Milk 1L", meta: "Batch BATCH-3-2026 · Warehouse A", time: "3 min ago", status: "success" },
  { id: "act-2", kind: "alert", title: "Expiry alert generated", meta: "Insulin Vial 10ml expires in 4 days", time: "22 min ago", status: "danger" },
  { id: "act-3", kind: "update", title: "Inventory updated", meta: "Paracetamol 500mg Strip restocked · +150 units", time: "41 min ago", status: "success" },
  { id: "act-4", kind: "add", title: "Product added", meta: "Cadbury Dairy Milk 55g · new batch logged", time: "1 hr ago", status: "neutral" },
  { id: "act-5", kind: "report", title: "Report created", meta: "Weekly waste summary · exported PDF", time: "2 hr ago", status: "neutral" },
  { id: "act-6", kind: "alert", title: "Expiry alert generated", meta: "42 SKUs flagged for this week", time: "5 hr ago", status: "warning" },
];

export const weeklyScanActivity = [
  { day: "Mon", scans: 128 },
  { day: "Tue", scans: 164 },
  { day: "Wed", scans: 142 },
  { day: "Thu", scans: 188 },
  { day: "Fri", scans: 210 },
  { day: "Sat", scans: 96 },
  { day: "Sun", scans: 74 },
];

export interface ExpiryAlertItem {
  id: string;
  product: string;
  category: string;
  batch: string;
  expiryDate: string;
  daysRemaining: number;
  severity: "safe" | "warning" | "critical";
}

export const expiryAlerts: ExpiryAlertItem[] = products
  .filter((p) => p.status === "expiring" || p.status === "expired")
  .slice(0, 6)
  .map((p, i) => ({
    id: p.id,
    product: p.name,
    category: p.category,
    batch: p.batch,
    expiryDate: p.expiryDate,
    daysRemaining: p.status === "expired" ? -Math.abs((i % 4) + 1) : (i % 5) + 1,
    severity: p.status === "expired" ? "critical" : i % 3 === 0 ? "critical" : "warning",
  }));

export const aiPrediction = {
  confidence: 91,
  headline: "18 SKUs are likely to expire within 7 days",
  reasoning:
    "Sell-through velocity for Dairy & Chilled and Pharmaceuticals has slowed 12% week-over-week while incoming batches keep the same cadence, concentrating risk in short-shelf-life stock.",
  suggestedAction: "Push a markdown on Dairy & Chilled today, prioritize FEFO picking, and hold the next Pharmaceuticals purchase order.",
  estimatedSavings: 48200,
  itemsAtRisk: 18,
};

const _healthy = products.filter((p) => p.status === "healthy").length;
const _expired = products.filter((p) => p.status === "expired").length;
const _expiring = products.filter((p) => p.status === "expiring").length;
const _low = products.filter((p) => p.status === "low").length;
const _outOfStock = products.filter((p) => p.stock === 0).length;
const _total = products.length;

export const inventoryHealthScore = _total > 0 ? Math.round((_healthy / _total) * 100) : 0;

export const aiSummary = {
  recommendation: "Redistribute slow-moving stock from Warehouse B and clear Pharmaceuticals nearing expiry before Friday.",
  productsAtRisk: _expired + _expiring,
  estimatedWaste: 62400,
  moneySaved: 214800,
  confidence: 91,
};

export const footerStats = {
  todaysScans: 342,
  productsSaved: 128,
  wastePrevented: 96400,
  revenueSaved: 214800,
  aiAccuracy: 94,
};

export const kpis = {
  totalProducts: _total,
  inStock: _healthy,
  lowStock: _low,
  outOfStock: _outOfStock,
  expired: _expired,
  expiringSoon: _expiring,
  incoming: 12,
  outgoing: 9,
  transfers: 16,
  restockedToday: products.filter((p) => p.lastRestocked === new Date().toISOString().slice(0, 10)).length,
  pendingRequests: purchaseRequests.filter((p) => p.status === "pending").length,
};
