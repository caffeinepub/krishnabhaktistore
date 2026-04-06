import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Camera,
  CheckCircle,
  CheckCircle2,
  Clock,
  Home,
  ImagePlus,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  Menu,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Order, Product } from "../backend";
import { OrderStatus, ProductCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { uploadImageFile, validateImageFile } from "../utils/imageUpload";

interface SiteContent {
  homepageTitle: string;
  bannerText: string;
  aboutSection: string;
  contactInfo: string;
}

interface ProductFormData {
  name: string;
  description: string;
  priceCents: string;
  category: ProductCategory;
  imageUrl: string;
  stockQuantity: string;
  isActive: boolean;
}

const defaultForm: ProductFormData = {
  name: "",
  description: "",
  priceCents: "",
  category: ProductCategory.book,
  imageUrl: "",
  stockQuantity: "100",
  isActive: true,
};

type ActiveSection = "dashboard" | "products" | "orders" | "content";

// ── Order status helpers ──────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  classes: string;
}

function getStatusConfig(status: OrderStatus): StatusConfig {
  switch (status) {
    case OrderStatus.pending:
      return {
        label: "Pending",
        classes: "bg-orange-100 text-orange-700 border border-orange-300",
      };
    case OrderStatus.processing:
      return {
        label: "Paid",
        classes: "bg-green-100 text-green-700 border border-green-300",
      };
    case OrderStatus.shipped:
      return {
        label: "Shipped",
        classes: "bg-purple-100 text-purple-700 border border-purple-300",
      };
    case OrderStatus.delivered:
      return {
        label: "Delivered",
        classes: "bg-green-100 text-green-700 border border-green-300",
      };
    case OrderStatus.cancelled:
      return {
        label: "Cancelled",
        classes: "bg-red-100 text-red-700 border border-red-300",
      };
    default:
      return {
        label: String(status),
        classes: "bg-gray-100 text-gray-700 border border-gray-300",
      };
  }
}

function getNextStatus(current: OrderStatus): OrderStatus | null {
  switch (current) {
    case OrderStatus.pending:
      return OrderStatus.processing;
    case OrderStatus.processing:
      return OrderStatus.shipped;
    case OrderStatus.shipped:
      return OrderStatus.delivered;
    case OrderStatus.delivered:
      return null;
    case OrderStatus.cancelled:
      return null;
    default:
      return null;
  }
}

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  id: ActiveSection;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "content", label: "Website Settings", icon: Settings },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`${bgClass} rounded-xl p-3`}>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function AdminPage() {
  const { actor } = useActor();
  const { identity, login } = useInternetIdentity();
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultForm);
  const [saving, setSaving] = useState(false);

  // Layout state
  const [activeSection, setActiveSection] =
    useState<ActiveSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Delete alert state
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Track original image URL for edit mode revert
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");

  // Website content state
  const [siteContent, setSiteContent] = useState<SiteContent>({
    homepageTitle: "",
    bannerText: "",
    aboutSection: "",
    contactInfo: "",
  });
  const [contentSaving, setContentSaving] = useState(false);

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const resetImageState = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview("");
    setUploadProgress(0);
    setUploading(false);
    setUploadFailed(false);
    setUploadedImageUrl("");
    setIsDragging(false);
  };

  useEffect(() => {
    if (!actor) return;
    actor
      .isCallerAdmin()
      .then((admin) => {
        setIsAdmin(admin);
        if (admin) {
          Promise.all([actor.getAllActiveProducts(), actor.getAllOrders()])
            .then(([prods, ords]) => {
              setProducts(prods);
              setOrders(ords);
              setLoading(false);
            })
            .catch(() => setLoading(false));
          const cached = localStorage.getItem("siteContent");
          if (cached) {
            try {
              setSiteContent(JSON.parse(cached));
            } catch {}
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData(defaultForm);
    setOriginalImageUrl("");
    resetImageState();
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      priceCents: (Number(product.priceCents) / 100).toFixed(2),
      category: product.category,
      imageUrl: product.imageUrl,
      stockQuantity: product.stockQuantity.toString(),
      isActive: product.isActive,
    });
    setOriginalImageUrl(product.imageUrl);
    resetImageState();
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetImageState();
    }
    setDialogOpen(open);
  };

  const triggerAutoUpload = async (file: File) => {
    if (!identity || identity.getPrincipal().isAnonymous()) return;
    setUploading(true);
    setUploadFailed(false);
    setUploadedImageUrl("");
    try {
      const url = await uploadImageFile(file, identity, (pct) =>
        setUploadProgress(pct),
      );
      setUploadedImageUrl(url);
      setUploading(false);
    } catch (err) {
      setUploading(false);
      setUploadFailed(true);
      console.error("[AutoUpload] failed:", err);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (validationErr) {
      toast.error(
        validationErr instanceof Error
          ? validationErr.message
          : "Invalid image",
      );
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setUploadProgress(0);
    triggerAutoUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid image");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setUploadProgress(0);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    triggerAutoUpload(file);
  };

  const handleClearImage = () => {
    resetImageState();
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    if (editingProduct) {
      setFormData((p) => ({ ...p, imageUrl: originalImageUrl }));
    }
  };

  const handleSave = async () => {
    if (!actor) return;
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.priceCents || Number(formData.priceCents) <= 0) {
      toast.error("A valid price is required");
      return;
    }

    setSaving(true);
    try {
      // Prefer already-uploaded URL from auto-upload; fall back to manual URL or retry upload
      let finalImageUrl = uploadedImageUrl || formData.imageUrl;

      if (!uploadedImageUrl && imageFile) {
        if (!identity || identity.getPrincipal().isAnonymous()) {
          toast.error(
            "Please log in with Internet Identity before uploading an image.",
          );
          setSaving(false);
          return;
        }
        setUploading(true);
        try {
          finalImageUrl = await uploadImageFile(imageFile, identity, (pct) => {
            setUploadProgress(pct);
          });
          setUploadedImageUrl(finalImageUrl);
        } catch (uploadErr) {
          console.error("[AdminPage] Image upload error:", uploadErr);
          toast.error(
            "Image upload failed. Saving product without image — paste a URL below if needed.",
          );
          setUploadFailed(true);
          setImageFile(null);
          finalImageUrl = formData.imageUrl;
        } finally {
          setUploading(false);
        }
      }

      const productData: Product = {
        id: editingProduct?.id ?? 0n,
        name: formData.name,
        description: formData.description,
        priceCents: BigInt(Math.round(Number(formData.priceCents) * 100)),
        category: formData.category,
        imageUrl: finalImageUrl,
        stockQuantity: BigInt(Number(formData.stockQuantity)),
        isActive: formData.isActive,
      };

      if (editingProduct) {
        const updated = await actor.updateProduct(
          editingProduct.id,
          productData,
        );
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? updated : p)),
        );
        toast.success("Product updated successfully");
      } else {
        const added = await actor.addProduct(productData);
        setProducts((prev) => [...prev, added]);
        toast.success("Product added");
      }
      setDialogOpen(false);
      resetImageState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!actor || !productToDelete) return;
    try {
      await actor.deleteProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteAlertOpen(false);
      setProductToDelete(null);
      setDialogOpen(false);
    }
  };

  const triggerDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteAlertOpen(true);
  };

  const handleStatusChange = async (orderId: bigint, status: OrderStatus) => {
    if (!actor) return;
    try {
      await actor.updateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveContent = async () => {
    setContentSaving(true);
    try {
      localStorage.setItem("siteContent", JSON.stringify(siteContent));
      toast.success("Changes saved successfully!");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setContentSaving(false);
    }
  };

  // Computed stats
  const pendingCount = orders.filter(
    (o) => o.status === OrderStatus.pending,
  ).length;
  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number(o.totalAmount),
    0,
  );
  const recentOrders = [...orders]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 5);

  const adminInitial = identity
    ? identity.getPrincipal().toString().slice(0, 2).toUpperCase()
    : "AD";

  // ── Sidebar component ───────────────────────────────────────────────────────

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">
              KrishnaBhakti
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Seller Panel</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id);
                onItemClick?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              data-ocid={`admin.nav.${item.id}.link`}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 ${
                  isActive ? "text-blue-600" : "text-gray-400"
                }`}
                size={18}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Go to Store */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
          data-ocid="admin.nav.store.link"
        >
          <Home className="text-gray-400" size={18} />
          Go to Store
        </button>
      </div>
    </div>
  );

  // ── Not logged in ──────────────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Admin Access
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Please log in with Internet Identity to access the admin panel.
          </p>
          <Button
            onClick={login}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            data-ocid="admin.login.button"
          >
            Login with Internet Identity
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        data-ocid="admin.loading_state"
      >
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading panel...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            You do not have admin privileges.
          </p>
          <Button
            onClick={() => navigate({ to: "/" })}
            variant="outline"
            className="w-full"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const displayPreview =
    imagePreview || (editingProduct ? formData.imageUrl : "");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
        {/* Hamburger (mobile only) */}
        <button
          type="button"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          data-ocid="admin.header.menu.button"
        >
          <Menu size={20} />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2 flex-1">
          <div className="hidden md:flex w-8 h-8 rounded-lg bg-blue-600 items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div className="hidden md:block">
            <span className="font-bold text-gray-900 text-base">
              KrishnaBhakti
            </span>
            <span className="text-gray-400 text-sm ml-2">Seller Panel</span>
          </div>
          <span className="md:hidden font-bold text-gray-900 text-base">
            Seller Panel
          </span>
        </div>

        {/* Right: user info */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-gray-500 truncate max-w-[140px]">
            Admin
          </span>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{adminInitial}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── DESKTOP SIDEBAR ────────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-gray-200 shadow-sm">
          <SidebarContent />
        </aside>

        {/* ── MOBILE SIDEBAR DRAWER ──────────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              {/* Overlay */}
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              {/* Drawer */}
              <motion.aside
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 md:hidden"
              >
                {/* Close button */}
                <button
                  type="button"
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
                <SidebarContent onItemClick={() => setSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {/* ── DASHBOARD ──────────────────────────────────────────── */}
              {activeSection === "dashboard" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Dashboard
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Overview of your store
                    </p>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Products"
                      value={products.length}
                      icon={Package}
                      colorClass="text-blue-600"
                      bgClass="bg-blue-50"
                    />
                    <StatCard
                      label="Total Orders"
                      value={orders.length}
                      icon={ShoppingBag}
                      colorClass="text-purple-600"
                      bgClass="bg-purple-50"
                    />
                    <StatCard
                      label="Pending Orders"
                      value={pendingCount}
                      icon={Clock}
                      colorClass="text-orange-600"
                      bgClass="bg-orange-50"
                    />
                    <StatCard
                      label="Revenue"
                      value={`₹${(totalRevenue / 100).toFixed(0)}`}
                      icon={IndianRupee}
                      colorClass="text-green-600"
                      bgClass="bg-green-50"
                    />
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h2 className="font-semibold text-gray-900">
                        Recent Orders
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection("orders")}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        data-ocid="admin.dashboard.view_orders.button"
                      >
                        View All Orders →
                      </button>
                    </div>
                    {recentOrders.length === 0 ? (
                      <div
                        className="py-10 text-center text-gray-400 text-sm"
                        data-ocid="admin.dashboard.orders.empty_state"
                      >
                        No orders yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                              <th className="text-left px-5 py-3 font-medium">
                                Order ID
                              </th>
                              <th className="text-left px-5 py-3 font-medium">
                                Customer
                              </th>
                              <th className="text-left px-5 py-3 font-medium">
                                Total
                              </th>
                              <th className="text-left px-5 py-3 font-medium">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {recentOrders.map((order, i) => {
                              const statusCfg = getStatusConfig(order.status);
                              return (
                                <tr
                                  key={order.id.toString()}
                                  className="hover:bg-gray-50 transition-colors"
                                  data-ocid={`admin.dashboard.orders.item.${i + 1}`}
                                >
                                  <td className="px-5 py-3 font-mono text-gray-600">
                                    #{order.id.toString()}
                                  </td>
                                  <td className="px-5 py-3 font-medium text-gray-900">
                                    {order.customerName}
                                  </td>
                                  <td className="px-5 py-3 text-gray-700">
                                    ₹
                                    {(Number(order.totalAmount) / 100).toFixed(
                                      2,
                                    )}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.classes}`}
                                    >
                                      {statusCfg.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── PRODUCTS ───────────────────────────────────────────── */}
              {activeSection === "products" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Products
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        {products.length} products in catalog
                      </p>
                    </div>
                    <Button
                      onClick={openAddDialog}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                      data-ocid="admin.add_product.button"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Product
                    </Button>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table data-ocid="admin.products.table">
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium">
                              Name
                            </TableHead>
                            <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium">
                              Category
                            </TableHead>
                            <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium">
                              Price
                            </TableHead>
                            <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium">
                              Stock
                            </TableHead>
                            <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium">
                              Status
                            </TableHead>
                            <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center py-12 text-gray-400 text-sm"
                                data-ocid="admin.products.empty_state"
                              >
                                No products yet. Click "Add Product" to get
                                started.
                              </TableCell>
                            </TableRow>
                          ) : (
                            products.map((product, index) => (
                              <TableRow
                                key={product.id.toString()}
                                className="hover:bg-gray-50 transition-colors divide-y divide-gray-100"
                                data-ocid={`admin.products.row.${index + 1}`}
                              >
                                <TableCell className="font-medium text-gray-900">
                                  {product.name}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                      product.category === ProductCategory.book
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {product.category}
                                  </span>
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  ₹
                                  {(Number(product.priceCents) / 100).toFixed(
                                    2,
                                  )}
                                </TableCell>
                                <TableCell className="text-gray-700">
                                  {product.stockQuantity.toString()}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`text-xs font-semibold ${
                                      product.isActive
                                        ? "text-green-600"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {product.isActive
                                      ? "● Active"
                                      : "○ Inactive"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
                                      onClick={() => openEditDialog(product)}
                                      data-ocid={`admin.products.edit_button.${index + 1}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 border-gray-200 hover:border-red-300 hover:text-red-600 transition-colors"
                                      onClick={() => triggerDelete(product)}
                                      data-ocid={`admin.products.delete_button.${index + 1}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ORDERS ─────────────────────────────────────────────── */}
              {activeSection === "orders" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Orders
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        {orders.length} total orders
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                      New (last 24h)
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {orders.length === 0 ? (
                      <div
                        className="py-16 text-center text-gray-400 text-sm"
                        data-ocid="admin.orders.empty_state"
                      >
                        No orders yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table data-ocid="admin.orders.table">
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Order ID
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Customer Name
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Phone
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Address
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Products
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Total Price
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Transaction ID
                              </TableHead>
                              <TableHead className="text-gray-500 text-xs uppercase tracking-wider font-medium whitespace-nowrap">
                                Status
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders.map((order, index) => {
                              const nowNs = BigInt(Date.now()) * 1_000_000n;
                              const isNew =
                                nowNs - order.createdAt < 86_400_000_000_000n;
                              const statusCfg = getStatusConfig(order.status);
                              const nextStatus = getNextStatus(order.status);
                              const nextStatusCfg = nextStatus
                                ? getStatusConfig(nextStatus)
                                : null;

                              return (
                                <TableRow
                                  key={order.id.toString()}
                                  className={`transition-colors ${
                                    isNew
                                      ? "bg-amber-50 hover:bg-amber-100/60"
                                      : "hover:bg-gray-50"
                                  }`}
                                  data-ocid={`admin.orders.row.${index + 1}`}
                                >
                                  <TableCell className="font-mono text-sm whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-400">#</span>
                                      <span className="font-semibold text-gray-900">
                                        {order.id.toString()}
                                      </span>
                                      {isNew && (
                                        <span
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900"
                                          data-ocid={`admin.orders.new_badge.${index + 1}`}
                                        >
                                          NEW
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell className="whitespace-nowrap font-medium text-gray-900">
                                    {order.customerName}
                                  </TableCell>

                                  <TableCell className="whitespace-nowrap">
                                    <span className="text-sm font-mono text-gray-600">
                                      {order.customerPhone || "—"}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    <span
                                      className="block max-w-[150px] truncate text-sm text-gray-500"
                                      title={order.shippingAddress}
                                    >
                                      {order.shippingAddress || "—"}
                                    </span>
                                  </TableCell>

                                  <TableCell className="whitespace-nowrap">
                                    <span className="text-sm font-medium text-gray-700">
                                      {order.items.length} item(s)
                                    </span>
                                  </TableCell>

                                  <TableCell className="whitespace-nowrap">
                                    <span className="font-bold text-gray-900">
                                      ₹
                                      {(
                                        Number(order.totalAmount) / 100
                                      ).toFixed(2)}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                      {order.upiTransactionId ? (
                                        <>
                                          <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded break-all">
                                            {order.upiTransactionId}
                                          </span>
                                          {order.status ===
                                            OrderStatus.pending && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleStatusChange(
                                                  order.id,
                                                  OrderStatus.processing,
                                                )
                                              }
                                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors whitespace-nowrap"
                                              data-ocid={`admin.orders.verify_payment.${index + 1}`}
                                            >
                                              ✓ Verify Payment
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-xs text-gray-400">
                                          —
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusCfg.classes}`}
                                        data-ocid={`admin.orders.status_badge.${index + 1}`}
                                      >
                                        {statusCfg.label}
                                      </span>
                                      {nextStatus && nextStatusCfg && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleStatusChange(
                                              order.id,
                                              nextStatus,
                                            )
                                          }
                                          title={`Advance to ${nextStatusCfg.label}`}
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors whitespace-nowrap text-gray-600"
                                          data-ocid={`admin.orders.advance_button.${index + 1}`}
                                        >
                                          <ArrowRight className="h-3 w-3" />
                                          {nextStatusCfg.label}
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── WEBSITE SETTINGS ───────────────────────────────────── */}
              {activeSection === "content" && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Website Settings
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Edit the text shown on your website. No coding needed.
                    </p>
                  </div>

                  <div
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl"
                    data-ocid="admin.content.panel"
                  >
                    <div className="space-y-6">
                      {/* Homepage Title */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-homepage-title"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Homepage Title
                        </Label>
                        <Input
                          id="content-homepage-title"
                          value={siteContent.homepageTitle}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              homepageTitle: e.target.value,
                            }))
                          }
                          placeholder="Divine Devotion Delivered"
                          className="h-12 text-base border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                          data-ocid="admin.content.homepage_title.input"
                        />
                        <p className="text-xs text-gray-400">
                          Shown as the main heading on the homepage hero
                          section.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* Banner Text */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-banner-text"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Banner Text
                        </Label>
                        <Textarea
                          id="content-banner-text"
                          value={siteContent.bannerText}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              bannerText: e.target.value,
                            }))
                          }
                          placeholder="Explore sacred ISKCON books and premium incense sticks..."
                          rows={3}
                          className="text-base resize-none border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                          data-ocid="admin.content.banner_text.textarea"
                        />
                        <p className="text-xs text-gray-400">
                          The subtitle shown below the main heading in the hero
                          banner.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* About Section */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-about-section"
                          className="text-sm font-semibold text-gray-700"
                        >
                          About Section
                        </Label>
                        <Textarea
                          id="content-about-section"
                          value={siteContent.aboutSection}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              aboutSection: e.target.value,
                            }))
                          }
                          placeholder="Spreading the teachings of Lord Krishna..."
                          rows={4}
                          className="text-base resize-none border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                          data-ocid="admin.content.about_section.textarea"
                        />
                        <p className="text-xs text-gray-400">
                          Shown in the "About ISKCON" section in the website
                          footer.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* Contact Info */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-contact-info"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Contact Info
                        </Label>
                        <Textarea
                          id="content-contact-info"
                          value={siteContent.contactInfo}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              contactInfo: e.target.value,
                            }))
                          }
                          placeholder="Phone: +91 XXXXXX XXXXXX"
                          rows={4}
                          className="text-base resize-none border-gray-200 focus:border-blue-400 focus:ring-blue-100"
                          data-ocid="admin.content.contact_info.textarea"
                        />
                        <p className="text-xs text-gray-400">
                          Shown in the "Contact" section in the website footer.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* Save Button */}
                      <Button
                        onClick={handleSaveContent}
                        disabled={contentSaving}
                        className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                        data-ocid="admin.content.save_button"
                      >
                        {contentSaving ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <Save className="h-5 w-5 mr-2" />
                        )}
                        {contentSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── PRODUCT FORM DIALOG ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ── UNIFIED DRAG & DROP IMAGE UPLOAD ZONE ── */}
            <div>
              <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                Product Image
              </Label>

              {/* Hidden file input */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleImageFileChange}
              />

              {/* Drop zone */}
              {displayPreview ? (
                <div
                  className="relative rounded-xl overflow-hidden border-2 border-dashed transition-all duration-150 cursor-pointer group"
                  style={{ borderColor: isDragging ? "#60a5fa" : "#e5e7eb" }}
                  onClick={() => imageInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && imageInputRef.current?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  data-ocid="admin.product.image.dropzone"
                >
                  <img
                    src={displayPreview}
                    alt="Product preview"
                    className="w-full h-44 object-cover"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-150 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/90 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Change image
                    </div>
                  </div>
                  {/* X button to clear */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearImage();
                    }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors z-10"
                    aria-label="Remove image"
                    data-ocid="admin.product.image.close_button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {/* Success indicator */}
                  {uploadedImageUrl && !uploading && (
                    <div className="absolute bottom-2 left-2 bg-green-600/90 text-white rounded-md px-2 py-1 flex items-center gap-1.5 text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready to save
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`w-full flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all duration-150 ${
                    isDragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                  onClick={() => imageInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && imageInputRef.current?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  data-ocid="admin.product.image.dropzone"
                >
                  <div
                    className={`rounded-full p-3 transition-all duration-150 ${isDragging ? "bg-blue-100" : "bg-gray-100"}`}
                  >
                    <UploadCloud
                      className={`h-7 w-7 transition-colors duration-150 ${isDragging ? "text-blue-500" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-medium transition-colors duration-150 ${isDragging ? "text-blue-600" : "text-gray-600"}`}
                    >
                      {isDragging
                        ? "Drop to upload"
                        : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      JPG, PNG, WebP · max 2 MB
                    </p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {uploading && (
                <div
                  className="mt-2.5 space-y-1"
                  data-ocid="admin.product.image.loading_state"
                >
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}

              {/* URL fallback on failure */}
              {uploadFailed && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700 font-medium mb-2 flex items-center gap-1.5">
                    <span>⚠</span> Upload failed — paste an image URL below:
                  </p>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    placeholder="https://example.com/image.jpg"
                    className="text-sm border-amber-300 focus:border-amber-500"
                    data-ocid="admin.product.image_url.input"
                  />
                </div>
              )}

              {/* Optional URL input (non-failure) */}
              {!uploadFailed && !imageFile && (
                <div className="mt-2.5">
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    placeholder="Or paste image URL (optional)"
                    className="text-sm border-gray-200 text-gray-500 placeholder:text-gray-400"
                    data-ocid="admin.product.image_url.input"
                  />
                </div>
              )}
            </div>

            <Separator className="my-1 bg-gray-100" />

            {/* Name */}
            <div>
              <Label
                htmlFor="p-name"
                className="text-sm font-semibold text-gray-700 mb-1 block"
              >
                Product Name *
              </Label>
              <Input
                id="p-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Product name"
                className="h-12 text-base border-gray-200"
                data-ocid="admin.product.name.input"
              />
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="p-price"
                  className="text-sm font-semibold text-gray-700 mb-1 block"
                >
                  Price (₹) *
                </Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  value={formData.priceCents}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, priceCents: e.target.value }))
                  }
                  placeholder="0.00"
                  className="h-12 text-base border-gray-200"
                  data-ocid="admin.product.price.input"
                />
              </div>
              <div>
                <Label
                  htmlFor="p-stock"
                  className="text-sm font-semibold text-gray-700 mb-1 block"
                >
                  Stock
                </Label>
                <Input
                  id="p-stock"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      stockQuantity: e.target.value,
                    }))
                  }
                  className="h-12 text-base border-gray-200"
                  data-ocid="admin.product.stock.input"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label
                htmlFor="p-category"
                className="text-sm font-semibold text-gray-700 mb-1 block"
              >
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(val) =>
                  setFormData((p) => ({
                    ...p,
                    category: val as ProductCategory,
                  }))
                }
              >
                <SelectTrigger
                  className="h-12 text-base border-gray-200"
                  data-ocid="admin.product.category.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProductCategory.book}>Book</SelectItem>
                  <SelectItem value={ProductCategory.incense}>
                    Incense
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            {editingProduct ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-12 sm:w-auto w-full"
                  onClick={() => triggerDelete(editingProduct)}
                  disabled={saving || uploading}
                  data-ocid="admin.product.dialog.delete_button"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Product
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  data-ocid="admin.product.dialog.submit_button"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Saving…" : "Save Product"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-200 text-gray-600 hover:bg-gray-50 h-12 sm:flex-none w-full sm:w-auto"
                  onClick={() => {
                    setFormData(defaultForm);
                    resetImageState();
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                  disabled={saving || uploading}
                  data-ocid="admin.product.dialog.cancel_button"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  data-ocid="admin.product.dialog.submit_button"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Saving…" : "Save Product"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteAlertOpen}
        onOpenChange={(open) => {
          setDeleteAlertOpen(open);
          if (!open) setProductToDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="admin.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">
                {productToDelete?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-200"
              data-ocid="admin.delete.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-ocid="admin.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
