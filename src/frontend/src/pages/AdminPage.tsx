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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Order, Product } from "../backend";
import { OrderStatus, ProductCategory } from "../backend";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

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

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

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
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!actor) return;
    setSaving(true);
    try {
      const productData: Product = {
        id: editingProduct?.id ?? 0n,
        name: formData.name,
        description: formData.description,
        priceCents: BigInt(Math.round(Number(formData.priceCents) * 100)),
        category: formData.category,
        imageUrl: formData.imageUrl,
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
        >
          Login with Internet Identity
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-primary mb-8">
        Admin Panel
      </h1>

      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="products">
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Product Catalog</h2>
            <Button
              onClick={openAddDialog}
              size="sm"
              className="bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </div>
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <Table>
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
                {products.map((product) => (
                  <TableRow key={product.id.toString()}>
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
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product)}
                          className="text-destructive hover:text-destructive"
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
            <div className="text-center py-12 text-muted-foreground">
              No orders yet.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <Table>
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              />
            </div>
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
              />
            </div>
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
                />
              </div>
            </div>
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
                <SelectTrigger className="mt-1">
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
            <div>
              <Label htmlFor="p-image">Image URL</Label>
              <Input
                id="p-image"
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, imageUrl: e.target.value }))
                }
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-primary-foreground"
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
