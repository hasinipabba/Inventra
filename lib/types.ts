export type ProductStatus = "healthy" | "low" | "out" | "expiring" | "expired";

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  batch: string;
  supplier: string;
  warehouse: string;
  shelf: string;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  mfgDate: string;
  expiryDate: string;
  lastRestocked: string;
  lastUpdated: string;
  healthScore: number;
  status: ProductStatus;
  image: string;
  // Catalog fields captured once, at first scan, and reused on every future scan.
  description?: string;
  packageSize?: string;
  weight?: string;
  manufacturer?: string;
  modelNumber?: string;
  qrCode?: string;
  /** Where the catalog data originally came from (audit trail). */
  source?: "manual" | "database" | "openfoodfacts" | "upcitemdb" | "barcodelookup" | "eansearch";
}

/**
 * A single received batch/lot of a product. Product master data (name, brand,
 * image, category...) is stored once on the Product. Everything that varies
 * per delivery — quantity, dates, lot/batch numbers, warehouse — lives here.
 */
export interface ProductBatch {
  id: string;
  productId: string;
  barcode: string;
  batchNumber: string;
  lotNumber: string;
  quantity: number;
  mfgDate: string;
  expiryDate: string;
  mrp: string;
  netWeight: string;
  warehouse: string;
  scannedBy: string;
  scannedAt: string;
  ocrConfidence?: Partial<Record<"expiryDate" | "mfgDate" | "batchNumber" | "lotNumber" | "mrp" | "netWeight" | "quantity", number>>;
}

export interface Category {
  id: string;
  name: string;
  productCount: number;
  totalStock: number;
  color: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  used: number;
  products: number;
  manager: string;
  transfersPending: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  productsSupplied: number;
  reliability: number;
  lastOrder: string;
  status: "active" | "pending" | "inactive";
}

export type UserRole = "Administrator" | "Inventory Manager" | "Warehouse Staff";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouse: string;
  status: "active" | "invited" | "suspended";
  lastActive: string;
}

export interface AIInsight {
  id: string;
  type: "restock" | "transfer" | "expiry" | "slow-moving" | "excess";
  title: string;
  detail: string;
  urgency: "low" | "medium" | "high";
  product?: string;
}

export interface NotificationItem {
  id: string;
  category:
  | "Low Stock"
  | "Out of Stock"
  | "Expiry"
  | "Warehouse"
  | "Shipment"
  | "Purchase Request"
  | "Transfer"
  | "AI Recommendation"
  | "Task"
  | "Leave Request";
  message: string;
  time: string;
  read: boolean;
}

export interface PurchaseRequest {
  id: string;
  product: string;
  quantity: number;
  requestedBy: string;
  warehouse: string;
  status: "pending" | "approved" | "rejected";
  date: string;
  estCost: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  shiftStart: string;
  shiftEnd: string;
  status: "active" | "on-leave" | "inactive";
  joinDate: string;
  avatarColor: string;
}

// ---------- Tasks ----------
export type TaskCategory =
  | "Inventory Update"
  | "Barcode Scanning"
  | "Stock Verification"
  | "Product Restocking"
  | "Warehouse Inspection"
  | "Shelf Arrangement"
  | "Expiry Check"
  | "Product Audit"
  | "Custom";

/** How time-sensitive the task is. */
export type TaskUrgency = "low" | "medium" | "high" | "urgent";
/** How important the task is, independent of urgency. */
export type TaskPriority = "normal" | "high" | "critical";
export type TaskStatus = "pending" | "in-progress" | "partially-completed" | "completed" | "overdue";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

/** A completion image uploaded by staff while working a task. */
export interface TaskImage {
  id: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  /** "completion" images come from staff; "reference" is the admin's attached example. */
  kind: "reference" | "completion";
}

/** One entry in a task's activity timeline (assignment, status changes, uploads…). */
export interface TaskActivityEntry {
  id: string;
  message: string;
  actor: string;
  at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  urgency: TaskUrgency;
  priority: TaskPriority;
  dueDate: string;
  estimatedDuration?: string;
  instructions?: string;
  /** Optional single reference image the admin attaches at creation time (data URL). */
  referenceImage?: string | null;
  status: TaskStatus;
  progress: number;
  checklist: ChecklistItem[];
  notes: string;
  warehouse: string;
  createdBy: string;
  createdAt: string;
  /** Staff-uploaded completion images (data URLs). */
  completionImages: TaskImage[];
  /** Full activity/audit timeline for the admin task-detail view. */
  activity: TaskActivityEntry[];
  completedAt?: string | null;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  staffId: string;
  assignedAt: string;
}

/** A task joined with its assignees — what the UI actually renders. */
export interface TaskWithAssignees extends Task {
  assignees: { id: string; name: string; avatarColor: string }[];
}

