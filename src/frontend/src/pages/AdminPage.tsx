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
  ShoppingCart,
  Store,
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
  dotColor: string;
}

function getStatusConfig(status: OrderStatus): StatusConfig {
  switch (status) {
    case OrderStatus.pending:
      return {
        label: "Pending",
        classes: "bg-amber-50 text-amber-700 border border-amber-200",
        dotColor: "bg-amber-500",
      };
    case OrderStatus.processing:
      return {
        label: "Confirmed",
        classes: "bg-blue-50 text-blue-700 border border-blue-200",
        dotColor: "bg-blue-500",
      };
    case OrderStatus.shipped:
      return {
        label: "Confirmed",
        classes: "bg-blue-50 text-blue-700 border border-blue-200",
        dotColor: "bg-blue-500",
      };
    case OrderStatus.delivered:
      return {
        label: "Delivered",
        classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        dotColor: "bg-emerald-500",
      };
    case OrderStatus.cancelled:
      return {
        label: "Cancelled",
        classes: "bg-red-50 text-red-700 border border-red-200",
        dotColor: "bg-red-500",
      };
    default:
      return {
        label: String(status),
        classes: "bg-gray-50 text-gray-700 border border-gray-200",
        dotColor: "bg-gray-400",
      };
  }
}

function getNextStatus(current: OrderStatus): OrderStatus | null {
  switch (current) {
    case OrderStatus.pending:
      return OrderStatus.processing;
    case OrderStatus.processing:
      return OrderStatus.delivered;
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
];

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  borderClass,
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border ${borderClass} flex items-center gap-4 group hover:shadow-md transition-shadow duration-200`}
    >
      <div
        className={`${bgClass} rounded-xl p-3.5 flex items-center justify-center shrink-0`}
      >
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 truncate">
          {label}
        </p>
        <p className="text-3xl font-bold text-gray-900 leading-none">{value}</p>
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
      <div
        className="px-5 py-6 border-b"
        style={{ borderColor: "oklch(35% 0.14 264)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight truncate">
              KrishnaBhaktiStore
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "oklch(75% 0.04 264 / 0.7)" }}
            >
              Seller Panel
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Admin navigation">
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
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-white text-[oklch(27%_0.12_264)] shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              data-ocid={`admin.nav.${item.id}.link`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  isActive ? "text-[oklch(27%_0.12_264)]" : "text-white/70"
                }`}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[oklch(27%_0.12_264)] opacity-60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Go to Store */}
      <div
        className="px-3 py-4 border-t"
        style={{ borderColor: "oklch(35% 0.14 264)" }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
          data-ocid="admin.nav.store.link"
        >
          <Home className="h-[18px] w-[18px] shrink-0 text-white/50" />
          Go to Store
        </button>
      </div>
    </div>
  );

  // ── Not logged in ──────────────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 max-w-sm w-full text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "oklch(27% 0.12 264)" }}
          >
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Admin Access
          </h2>
          <p className="text-gray-500 text-sm mb-7">
            Log in with Internet Identity to access the seller panel.
          </p>
          <Button
            onClick={login}
            className="w-full h-12 text-white font-semibold rounded-xl text-base"
            style={{ backgroundColor: "oklch(27% 0.12 264)" }}
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
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f8fafc" }}
        data-ocid="admin.loading_state"
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "oklch(27% 0.12 264)" }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Loading panel…</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#f8fafc" }}
      >
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 max-w-sm w-full text-center">
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
            className="w-full h-12 rounded-xl text-base"
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
    <div className="min-h-screen flex" style={{ backgroundColor: "#f1f5f9" }}>
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 fixed top-0 left-0 h-full z-20"
        style={{ backgroundColor: "oklch(27% 0.12 264)" }}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE SIDEBAR DRAWER ────────────────────────────────────────── */}
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
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed top-0 left-0 h-full w-72 z-50 md:hidden flex flex-col"
              style={{ backgroundColor: "oklch(27% 0.12 264)" }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
                aria-label="Close menu"
                data-ocid="admin.sidebar.close_button"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent onItemClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN AREA (offset by sidebar on desktop) ─────────────────────── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* ── TOP HEADER ────────────────────────────────────────────────── */}
        <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center px-4 md:px-6 gap-4 sticky top-0 z-30">
          {/* Hamburger (mobile only) */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            data-ocid="admin.header.menu.button"
          >
            <Menu size={22} />
          </button>

          {/* Section breadcrumb */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-base font-bold text-gray-900">
              {activeSection === "dashboard" && "Dashboard"}
              {activeSection === "products" && "Products"}
              {activeSection === "orders" && "Orders"}
              {activeSection === "content" && "Website Settings"}
            </span>
          </div>

          {/* Right: admin badge */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500 font-medium">
              Admin
            </span>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{ backgroundColor: "oklch(27% 0.12 264)" }}
            >
              {adminInitial}
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {/* ── DASHBOARD ────────────────────────────────────────── */}
              {activeSection === "dashboard" && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Welcome back 👋
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Here&apos;s what&apos;s happening in your store today.
                    </p>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Products"
                      value={products.length}
                      icon={Package}
                      colorClass="text-indigo-600"
                      bgClass="bg-indigo-50"
                      borderClass="border-indigo-100"
                    />
                    <StatCard
                      label="Total Orders"
                      value={orders.length}
                      icon={ShoppingCart}
                      colorClass="text-violet-600"
                      bgClass="bg-violet-50"
                      borderClass="border-violet-100"
                    />
                    <StatCard
                      label="Pending Orders"
                      value={pendingCount}
                      icon={Clock}
                      colorClass="text-amber-600"
                      bgClass="bg-amber-50"
                      borderClass="border-amber-100"
                    />
                    <StatCard
                      label="Revenue"
                      value={`₹${(totalRevenue / 100).toFixed(0)}`}
                      icon={IndianRupee}
                      colorClass="text-emerald-600"
                      bgClass="bg-emerald-50"
                      borderClass="border-emerald-100"
                    />
                  </div>

                  {/* Recent Orders */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                      <div>
                        <h2 className="font-bold text-gray-900 text-base">
                          Recent Orders
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Latest {recentOrders.length} orders
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection("orders")}
                        className="text-sm font-semibold flex items-center gap-1.5 px-4 py-2 rounded-xl transition-colors hover:bg-gray-50"
                        style={{ color: "oklch(27% 0.12 264)" }}
                        data-ocid="admin.dashboard.view_orders.button"
                      >
                        View All
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {recentOrders.length === 0 ? (
                      <div
                        className="py-12 text-center text-gray-400 text-sm"
                        data-ocid="admin.dashboard.orders.empty_state"
                      >
                        <ShoppingBag className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        No orders yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Order ID
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Customer
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {recentOrders.map((order, i) => {
                              const statusCfg = getStatusConfig(order.status);
                              return (
                                <tr
                                  key={order.id.toString()}
                                  className="hover:bg-gray-50/70 transition-colors"
                                  data-ocid={`admin.dashboard.orders.item.${i + 1}`}
                                >
                                  <td className="px-6 py-4">
                                    <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                      #{order.id.toString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-gray-900">
                                    {order.customerName}
                                  </td>
                                  <td className="px-6 py-4 font-bold text-gray-900">
                                    ₹
                                    {(Number(order.totalAmount) / 100).toFixed(
                                      2,
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.classes}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`}
                                      />
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

              {/* ── PRODUCTS ──────────────────────────────────────────── */}
              {activeSection === "products" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        Products
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        {products.length}{" "}
                        {products.length === 1 ? "product" : "products"} in
                        catalog
                      </p>
                    </div>
                    <Button
                      onClick={openAddDialog}
                      className="h-11 px-5 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow-md transition-shadow"
                      style={{ backgroundColor: "oklch(27% 0.12 264)" }}
                      data-ocid="admin.add_product.button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>

                  {products.length === 0 ? (
                    <div
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-3"
                      data-ocid="admin.products.empty_state"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">
                        No products yet.
                      </p>
                      <Button
                        onClick={openAddDialog}
                        className="mt-2 h-11 px-5 text-white font-semibold rounded-xl"
                        style={{ backgroundColor: "oklch(27% 0.12 264)" }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Product
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {products.map((product, index) => (
                        <div
                          key={product.id.toString()}
                          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-200"
                          data-ocid={`admin.products.card.${index + 1}`}
                        >
                          {/* Product Image */}
                          <div className="w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden relative">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            ) : (
                              <Package className="h-14 w-14 text-gray-200" />
                            )}
                            {/* Active badge */}
                            <span
                              className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                                product.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {product.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 flex flex-col flex-1 gap-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
                                {product.name}
                              </h3>
                              <span
                                className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                  product.category === ProductCategory.book
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {product.category}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span
                                className="text-xl font-bold"
                                style={{ color: "oklch(27% 0.12 264)" }}
                              >
                                ₹{(Number(product.priceCents) / 100).toFixed(2)}
                              </span>
                              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                                Stock: {product.stockQuantity.toString()}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2.5 mt-auto pt-3 border-t border-gray-100">
                              <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 transition-all cursor-pointer"
                                onClick={() => openEditDialog(product)}
                                data-ocid={`admin.products.edit_button.${index + 1}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-red-200 bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-300 active:scale-95 transition-all cursor-pointer"
                                onClick={() => triggerDelete(product)}
                                data-ocid={`admin.products.delete_button.${index + 1}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ORDERS ────────────────────────────────────────────── */}
              {activeSection === "orders" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-gray-900">
                        Orders
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        {orders.length} total orders
                        {pendingCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-amber-700 font-semibold">
                            · {pendingCount} pending
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {orders.length === 0 ? (
                    <div
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 py-20 flex flex-col items-center gap-3"
                      data-ocid="admin.orders.empty_state"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">
                        No orders yet.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile: card list */}
                      <div className="md:hidden space-y-3">
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
                            <div
                              key={order.id.toString()}
                              className={`bg-white rounded-2xl border shadow-sm p-4 space-y-3 ${
                                isNew
                                  ? "border-amber-200 bg-amber-50/30"
                                  : "border-gray-100"
                              }`}
                              data-ocid={`admin.orders.row.${index + 1}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                    #{order.id.toString()}
                                  </span>
                                  {isNew && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.classes}`}
                                  data-ocid={`admin.orders.status_badge.${index + 1}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`}
                                  />
                                  {statusCfg.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-gray-400 font-medium mb-0.5">
                                    Customer
                                  </p>
                                  <p className="font-bold text-gray-900">
                                    {order.customerName}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-medium mb-0.5">
                                    Phone
                                  </p>
                                  <p className="font-mono text-gray-600">
                                    {order.customerPhone || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-medium mb-0.5">
                                    Total
                                  </p>
                                  <p className="font-bold text-gray-900">
                                    ₹
                                    {(Number(order.totalAmount) / 100).toFixed(
                                      2,
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 font-medium mb-0.5">
                                    Items
                                  </p>
                                  <p className="text-gray-700">
                                    {order.items.length} item(s)
                                  </p>
                                </div>
                              </div>
                              {order.shippingAddress && (
                                <div className="text-sm">
                                  <p className="text-xs text-gray-400 font-medium mb-0.5">
                                    Address
                                  </p>
                                  <p className="text-gray-600 truncate">
                                    {order.shippingAddress}
                                  </p>
                                </div>
                              )}
                              {order.upiTransactionId && (
                                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                                  <p className="text-xs text-blue-500 font-medium mb-1">
                                    UPI Transaction ID
                                  </p>
                                  <p className="font-mono text-xs text-blue-800 font-semibold break-all">
                                    {order.upiTransactionId}
                                  </p>
                                  {order.status === OrderStatus.pending && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStatusChange(
                                          order.id,
                                          OrderStatus.processing,
                                        )
                                      }
                                      className="mt-2 w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                                      data-ocid={`admin.orders.verify_payment.${index + 1}`}
                                    >
                                      ✓ Verify Payment
                                    </button>
                                  )}
                                </div>
                              )}
                              {nextStatus && nextStatusCfg && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusChange(order.id, nextStatus)
                                  }
                                  className={`w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                    nextStatus === OrderStatus.processing
                                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  }`}
                                  data-ocid={`admin.orders.advance_button.${index + 1}`}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                  Mark {nextStatusCfg.label}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop: table */}
                      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 border-b border-gray-100 hover:bg-gray-50">
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Order ID
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Customer
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Phone
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Address
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Items
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Total
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                                  Transaction ID
                                </TableHead>
                                <TableHead className="text-gray-400 text-xs font-bold uppercase tracking-wider px-5 py-4 whitespace-nowrap">
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
                                        ? "bg-amber-50/50 hover:bg-amber-50"
                                        : "hover:bg-gray-50/70"
                                    }`}
                                    data-ocid={`admin.orders.row.${index + 1}`}
                                  >
                                    <TableCell className="px-5 py-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-md whitespace-nowrap">
                                          #{order.id.toString()}
                                        </span>
                                        {isNew && (
                                          <span
                                            className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full whitespace-nowrap"
                                            data-ocid={`admin.orders.new_badge.${index + 1}`}
                                          >
                                            NEW
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>

                                    <TableCell className="px-5 py-4 font-semibold text-gray-900 whitespace-nowrap">
                                      {order.customerName}
                                    </TableCell>

                                    <TableCell className="px-5 py-4 whitespace-nowrap">
                                      <span className="text-sm font-mono text-gray-500">
                                        {order.customerPhone || "—"}
                                      </span>
                                    </TableCell>

                                    <TableCell className="px-5 py-4">
                                      <span
                                        className="block max-w-[160px] truncate text-sm text-gray-500"
                                        title={order.shippingAddress}
                                      >
                                        {order.shippingAddress || "—"}
                                      </span>
                                    </TableCell>

                                    <TableCell className="px-5 py-4 whitespace-nowrap">
                                      <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                                        {order.items.length} item
                                        {order.items.length !== 1 ? "s" : ""}
                                      </span>
                                    </TableCell>

                                    <TableCell className="px-5 py-4 whitespace-nowrap">
                                      <span className="font-bold text-gray-900">
                                        ₹
                                        {(
                                          Number(order.totalAmount) / 100
                                        ).toFixed(2)}
                                      </span>
                                    </TableCell>

                                    <TableCell className="px-5 py-4">
                                      <div className="flex flex-col gap-2">
                                        {order.upiTransactionId ? (
                                          <>
                                            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 break-all">
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
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap"
                                                data-ocid={`admin.orders.verify_payment.${index + 1}`}
                                              >
                                                ✓ Verify Payment
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-xs text-gray-300">
                                            —
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>

                                    <TableCell className="px-5 py-4">
                                      <div className="flex flex-col gap-2">
                                        <span
                                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusCfg.classes}`}
                                          data-ocid={`admin.orders.status_badge.${index + 1}`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`}
                                          />
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
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                              nextStatus ===
                                              OrderStatus.processing
                                                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                            }`}
                                            data-ocid={`admin.orders.advance_button.${index + 1}`}
                                          >
                                            <ArrowRight className="h-3 w-3" />
                                            Mark {nextStatusCfg.label}
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
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── WEBSITE SETTINGS ────────────────────────────────── */}
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
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl"
                    data-ocid="admin.content.panel"
                  >
                    <div className="space-y-6">
                      {/* Homepage Title */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-homepage-title"
                          className="text-sm font-bold text-gray-700"
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
                          className="h-12 text-base border-gray-200 focus:border-indigo-400 rounded-xl"
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
                          htmlFor="content-banner"
                          className="text-sm font-bold text-gray-700"
                        >
                          Banner Text
                        </Label>
                        <Input
                          id="content-banner"
                          value={siteContent.bannerText}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              bannerText: e.target.value,
                            }))
                          }
                          placeholder="Free shipping on orders above ₹500"
                          className="h-12 text-base border-gray-200 focus:border-indigo-400 rounded-xl"
                          data-ocid="admin.content.banner.input"
                        />
                        <p className="text-xs text-gray-400">
                          Short promotional text shown in the site banner.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* About Section */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-about"
                          className="text-sm font-bold text-gray-700"
                        >
                          About Section
                        </Label>
                        <Textarea
                          id="content-about"
                          value={siteContent.aboutSection}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              aboutSection: e.target.value,
                            }))
                          }
                          placeholder="We bring the divine experience of ISKCON closer to you…"
                          className="min-h-24 text-base border-gray-200 focus:border-indigo-400 rounded-xl resize-none"
                          data-ocid="admin.content.about.textarea"
                        />
                        <p className="text-xs text-gray-400">
                          About your store, shown on the homepage.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* Contact Info */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="content-contact"
                          className="text-sm font-bold text-gray-700"
                        >
                          Contact Info
                        </Label>
                        <Textarea
                          id="content-contact"
                          value={siteContent.contactInfo}
                          onChange={(e) =>
                            setSiteContent((prev) => ({
                              ...prev,
                              contactInfo: e.target.value,
                            }))
                          }
                          placeholder="Phone: +91 83910 20810 · Email: info@example.com"
                          className="min-h-20 text-base border-gray-200 focus:border-indigo-400 rounded-xl resize-none"
                          data-ocid="admin.content.contact.textarea"
                        />
                        <p className="text-xs text-gray-400">
                          Contact details shown in the footer or contact page.
                        </p>
                      </div>

                      <Separator className="bg-gray-100" />

                      {/* Save Button */}
                      <Button
                        onClick={handleSaveContent}
                        disabled={contentSaving}
                        className="w-full h-12 text-base text-white font-semibold rounded-xl shadow-sm"
                        style={{ backgroundColor: "oklch(27% 0.12 264)" }}
                        data-ocid="admin.content.save_button"
                      >
                        {contentSaving ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <Save className="h-5 w-5 mr-2" />
                        )}
                        {contentSaving ? "Saving…" : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="py-4 px-6 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-400 text-center">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Built with ❤️ using caffeine.ai
            </a>
          </p>
        </footer>
      </div>

      {/* ── PRODUCT FORM DIALOG ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ── IMAGE UPLOAD ZONE ── */}
            <div>
              <Label className="text-sm font-bold text-gray-700 mb-2 block">
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
                  className="relative rounded-2xl overflow-hidden border-2 border-dashed transition-all duration-150 cursor-pointer group"
                  style={{
                    borderColor: isDragging ? "oklch(27% 0.12 264)" : "#e2e8f0",
                  }}
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
                    className="w-full h-48 object-cover"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-150 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-white/95 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-gray-700 shadow-sm">
                      <RefreshCw className="h-4 w-4" />
                      Change image
                    </div>
                  </div>
                  {/* X button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearImage();
                    }}
                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
                    aria-label="Remove image"
                    data-ocid="admin.product.image.close_button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {/* Success indicator */}
                  {uploadedImageUrl && !uploading && (
                    <div className="absolute bottom-3 left-3 bg-emerald-600/95 text-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold shadow">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready to save
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`w-full flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-10 cursor-pointer transition-all duration-150 ${
                    isDragging
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40"
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
                    className={`rounded-2xl p-4 transition-all duration-150 ${
                      isDragging ? "bg-indigo-100" : "bg-gray-100"
                    }`}
                  >
                    <UploadCloud
                      className={`h-8 w-8 transition-colors duration-150 ${
                        isDragging ? "text-indigo-500" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-sm font-semibold transition-colors duration-150 ${
                        isDragging ? "text-indigo-700" : "text-gray-600"
                      }`}
                    >
                      {isDragging
                        ? "Drop to upload"
                        : "Drag & drop or click to upload"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      JPG, PNG, WebP · max 2 MB
                    </p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {uploading && (
                <div
                  className="mt-3 space-y-1.5"
                  data-ocid="admin.product.image.loading_state"
                >
                  <div className="flex justify-between text-xs text-gray-400 font-medium">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress
                    value={uploadProgress}
                    className="h-2 rounded-full"
                  />
                </div>
              )}

              {/* URL fallback on failure */}
              {uploadFailed && (
                <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 font-semibold mb-2 flex items-center gap-1.5">
                    <span>⚠</span> Upload failed — paste an image URL:
                  </p>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    placeholder="https://example.com/image.jpg"
                    className="h-11 text-sm border-amber-300 focus:border-amber-500 rounded-xl"
                    data-ocid="admin.product.image_url.input"
                  />
                </div>
              )}

              {/* Optional URL input (non-failure) */}
              {!uploadFailed && !imageFile && (
                <div className="mt-3">
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    placeholder="Or paste image URL…"
                    className="h-11 text-sm border-gray-200 focus:border-indigo-400 rounded-xl"
                    data-ocid="admin.product.image_url.input"
                  />
                </div>
              )}
            </div>

            <Separator className="bg-gray-100" />

            {/* ── PRODUCT FIELDS ── */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="product-name"
                  className="text-sm font-bold text-gray-700"
                >
                  Product Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Govinda Incense Sticks"
                  className="h-12 text-base border-gray-200 focus:border-indigo-400 rounded-xl"
                  data-ocid="admin.product.name.input"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="product-desc"
                  className="text-sm font-bold text-gray-700"
                >
                  Description
                </Label>
                <Textarea
                  id="product-desc"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Describe the product…"
                  className="min-h-20 text-base border-gray-200 focus:border-indigo-400 rounded-xl resize-none"
                  data-ocid="admin.product.description.textarea"
                />
              </div>

              {/* Price + Category row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="product-price"
                    className="text-sm font-bold text-gray-700"
                  >
                    Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.priceCents}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, priceCents: e.target.value }))
                    }
                    placeholder="0.00"
                    className="h-12 text-base border-gray-200 focus:border-indigo-400 rounded-xl"
                    data-ocid="admin.product.price.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="product-category"
                    className="text-sm font-bold text-gray-700"
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
                      id="product-category"
                      className="h-12 text-base border-gray-200 rounded-xl"
                      data-ocid="admin.product.category.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value={ProductCategory.book}>
                        Books
                      </SelectItem>
                      <SelectItem value={ProductCategory.incense}>
                        Incense
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stock */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="product-stock"
                  className="text-sm font-bold text-gray-700"
                >
                  Stock Quantity
                </Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  value={formData.stockQuantity}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      stockQuantity: e.target.value,
                    }))
                  }
                  placeholder="100"
                  className="h-12 text-base border-gray-200 focus:border-indigo-400 rounded-xl"
                  data-ocid="admin.product.stock.input"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-700">Active</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Show this product in the store
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isActive}
                  onClick={() =>
                    setFormData((p) => ({ ...p, isActive: !p.isActive }))
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                    formData.isActive ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                  data-ocid="admin.product.active.switch"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                      formData.isActive ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex-col sm:flex-row gap-2">
            {editingProduct && (
              <Button
                type="button"
                variant="outline"
                className="h-12 px-5 text-red-600 border-red-200 hover:bg-red-50 font-semibold rounded-xl sm:mr-auto"
                onClick={() => triggerDelete(editingProduct)}
                disabled={saving}
                data-ocid="admin.product.delete_button"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-12 px-5 font-semibold rounded-xl border-gray-200"
              onClick={() => {
                setFormData(defaultForm);
                resetImageState();
              }}
              disabled={saving}
              data-ocid="admin.product.clear_button"
            >
              Clear
            </Button>
            <Button
              type="button"
              className="h-12 px-6 text-white font-semibold rounded-xl shadow-sm"
              style={{ backgroundColor: "oklch(27% 0.12 264)" }}
              onClick={handleSave}
              disabled={saving || uploading}
              data-ocid="admin.product.save_button"
            >
              {saving || uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ImagePlus className="h-4 w-4 mr-2" />
              )}
              {saving
                ? "Saving…"
                : uploading
                  ? "Uploading…"
                  : editingProduct
                    ? "Update Product"
                    : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ──────────────────────────────────────── */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-gray-900">
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500">
              This will permanently delete{" "}
              <strong className="text-gray-900">{productToDelete?.name}</strong>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="h-11 rounded-xl font-semibold"
              data-ocid="admin.delete.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-red-600 hover:bg-red-700 font-semibold"
              onClick={confirmDelete}
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
