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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Order, Product } from "../backend";
import { OrderStatus, ProductCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { uploadImageFile, validateImageFile } from "../utils/imageUpload";

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

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const resetImageState = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview("");
    setUploadProgress(0);
    setUploading(false);
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
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [actor]);

  const openAddDialog = () => {
    setEditingProduct(null);
    setFormData(defaultForm);
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
    resetImageState();
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetImageState();
    }
    setDialogOpen(open);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size before accepting
    try {
      validateImageFile(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid image file");
      // Reset the input so the same file can be re-selected after fix
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }

    // Revoke previous blob URL if any
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrl);
    setUploadProgress(0);
  };

  const handleClearImage = () => {
    resetImageState();
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
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
      let finalImageUrl = formData.imageUrl;

      // If a file is staged, upload it first
      if (imageFile) {
        setUploading(true);
        try {
          if (!identity) {
            toast.error("Please log in before uploading an image.");
            setSaving(false);
            setUploading(false);
            return;
          }
          finalImageUrl = await uploadImageFile(imageFile, identity, (pct) => {
            setUploadProgress(pct);
          });
        } catch (uploadErr) {
          const msg =
            uploadErr instanceof Error
              ? uploadErr.message
              : "Image upload failed";
          toast.error(`Image upload failed: ${msg}`);
          setSaving(false);
          setUploading(false);
          return;
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
        toast.success("Product updated");
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

  const handleDelete = async (product: Product) => {
    if (!actor || !confirm(`Delete "${product.name}"?`)) return;
    try {
      await actor.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete");
    }
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

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="font-display text-2xl font-bold text-primary mb-3">
          Admin Access
        </h2>
        <p className="text-muted-foreground mb-6">
          Please log in with Internet Identity to access the admin panel.
        </p>
        <Button
          onClick={login}
          className="bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider"
          data-ocid="admin.login.button"
        >
          Login with Internet Identity
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        data-ocid="admin.loading_state"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="font-display text-2xl font-bold text-destructive mb-3">
          Access Denied
        </h2>
        <p className="text-muted-foreground mb-6">
          You do not have admin privileges.
        </p>
        <Button onClick={() => navigate({ to: "/" })} variant="outline">
          Go Home
        </Button>
      </div>
    );
  }

  const displayPreview =
    imagePreview || (editingProduct ? formData.imageUrl : "");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-primary mb-8">
        Admin Panel
      </h1>

      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="products" data-ocid="admin.products.tab">
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="orders" data-ocid="admin.orders.tab">
            Orders ({orders.length})
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Product Catalog</h2>
            <Button
              onClick={openAddDialog}
              size="sm"
              className="bg-primary text-primary-foreground"
              data-ocid="admin.add_product.button"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <Table data-ocid="admin.products.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow
                    key={product.id.toString()}
                    data-ocid={`admin.products.row.${index + 1}`}
                  >
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          product.category === ProductCategory.book
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {product.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      ₹{(Number(product.priceCents) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>{product.stockQuantity.toString()}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs uppercase tracking-wider font-bold ${
                          product.isActive
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(product)}
                          data-ocid={`admin.products.edit_button.${index + 1}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product)}
                          className="text-destructive hover:text-destructive"
                          data-ocid={`admin.products.delete_button.${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <h2 className="text-lg font-semibold mb-4">All Orders</h2>
          {orders.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="admin.orders.empty_state"
            >
              No orders yet.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <Table data-ocid="admin.orders.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id.toString()}>
                      <TableCell className="font-mono text-sm">
                        #{order.id.toString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {order.customerEmail}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        ₹{(Number(order.totalAmount) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>{order.items.length} item(s)</TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(val) =>
                            handleStatusChange(order.id, val as OrderStatus)
                          }
                        >
                          <SelectTrigger className="w-[130px] text-xs h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(OrderStatus).map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <Label htmlFor="p-name">Name *</Label>
              <Input
                id="p-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Product name"
                className="mt-1"
                data-ocid="admin.product.name.input"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Product description"
                className="mt-1"
                rows={3}
                data-ocid="admin.product.description.textarea"
              />
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="p-price">Price (₹) *</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  value={formData.priceCents}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, priceCents: e.target.value }))
                  }
                  placeholder="0.00"
                  className="mt-1"
                  data-ocid="admin.product.price.input"
                />
              </div>
              <div>
                <Label htmlFor="p-stock">Stock</Label>
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
                  className="mt-1"
                  data-ocid="admin.product.stock.input"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="p-category">Category</Label>
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
                  className="mt-1"
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

            {/* Image Upload Section */}
            <div>
              <Label>Product Image</Label>

              {/* Hidden file input */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleImageFileChange}
              />

              {/* Image preview area */}
              {displayPreview ? (
                <div className="mt-2 relative rounded-lg overflow-hidden border border-border bg-muted">
                  <img
                    src={displayPreview}
                    alt="Product preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 py-8 cursor-pointer hover:bg-muted/60 transition-colors"
                  onClick={() => imageInputRef.current?.click()}
                  data-ocid="admin.product.image.dropzone"
                >
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload image
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    JPG, PNG, GIF, WebP supported
                  </p>
                </button>
              )}

              {/* Upload button row */}
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || saving}
                  data-ocid="admin.product.image.upload_button"
                >
                  <ImagePlus className="h-4 w-4 mr-1.5" />
                  {imageFile ? "Change Image" : "Upload Image"}
                </Button>
                {imageFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {imageFile.name}
                  </span>
                )}
              </div>

              {/* Upload progress bar */}
              {uploading && (
                <div
                  className="mt-2 space-y-1"
                  data-ocid="admin.product.image.loading_state"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading image…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}

              {/* Optional image URL fallback */}
              <div className="mt-3">
                <Label
                  htmlFor="p-image"
                  className="text-xs text-muted-foreground"
                >
                  Or paste an image URL (optional)
                </Label>
                <Input
                  id="p-image"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="mt-1 text-sm"
                  disabled={!!imageFile}
                  data-ocid="admin.product.image_url.input"
                />
                {imageFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded image will be used instead of the URL.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              data-ocid="admin.product.dialog.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-primary text-primary-foreground"
              data-ocid="admin.product.dialog.submit_button"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingProduct ? "Update" : "Add"} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
