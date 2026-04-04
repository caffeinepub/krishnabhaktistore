import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend";
import { ProductCategory } from "../backend";
import { useCart } from "../context/CartContext";
import { useActor } from "../hooks/useActor";

export function ProductDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { actor } = useActor();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!actor || !id) return;
    actor
      .getProduct(BigInt(id))
      .then((p) => {
        setProduct(p);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [actor, id]);

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addToCart({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        category: product.category,
      });
    }
    toast.success(`${quantity} x ${product.name} added to cart`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-10">
        <Skeleton className="h-96 rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Product not found.</p>
        <Button
          onClick={() => navigate({ to: "/products" })}
          variant="outline"
          className="mt-4"
        >
          Back to Products
        </Button>
      </div>
    );
  }

  const price = (Number(product.priceCents) / 100).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => navigate({ to: "/products" })}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Image */}
        <div
          className="aspect-square rounded-xl border border-border overflow-hidden flex items-center justify-center bg-muted"
          style={{ borderColor: "#C8A45A" }}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="text-8xl mb-3">
                {product.category === ProductCategory.book ? "📖" : "🪔"}
              </div>
              <div className="text-sm text-muted-foreground uppercase tracking-wider">
                {product.category === ProductCategory.book
                  ? "ISKCON Book"
                  : "Incense Stick"}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <span
            className={`self-start text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full mb-3 ${
              product.category === ProductCategory.book
                ? "bg-primary/10 text-primary"
                : "bg-accent/10 text-accent"
            }`}
          >
            {product.category === ProductCategory.book
              ? "ISKCON Book"
              : "Incense"}
          </span>

          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {product.name}
          </h1>

          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className="text-yellow-500">
                ★
              </span>
            ))}
            <span className="text-sm text-muted-foreground ml-1">(5.0)</span>
          </div>

          <p className="text-muted-foreground leading-relaxed mb-6">
            {product.description}
          </p>

          <div className="text-3xl font-bold text-foreground mb-6">
            ₹{price}
          </div>

          <div className="text-sm text-muted-foreground mb-6">
            In stock: {product.stockQuantity.toString()} units
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-8 text-center font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) =>
                  Math.min(Number(product.stockQuantity), q + 1),
                )
              }
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            onClick={handleAddToCart}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase tracking-wider"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
