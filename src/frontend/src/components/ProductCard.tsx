import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import type React from "react";
import { toast } from "sonner";
import type { Product } from "../backend";
import { ProductCategory } from "../backend";
import { useCart } from "../context/CartContext";

interface ProductCardProps {
  product: Product;
}

function ProductPlaceholder({ category }: { category: ProductCategory }) {
  if (category === ProductCategory.book) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10 rounded-t">
        <div className="text-4xl mb-2">📖</div>
        <div className="text-xs text-primary/60 uppercase tracking-wider font-medium">
          ISKCON Book
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-accent/10 rounded-t">
      <div className="text-4xl mb-2">🪔</div>
      <div className="text-xs text-accent/70 uppercase tracking-wider font-medium">
        Incense
      </div>
    </div>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      category: product.category,
    });
    toast.success(`${product.name} added to cart`);
  };

  const price = (Number(product.priceCents) / 100).toFixed(2);

  return (
    <Link
      to="/products/$id"
      params={{ id: product.id.toString() }}
      className="block group"
    >
      <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow flex flex-col">
        {/* Image */}
        <div className="relative h-48 w-full overflow-hidden bg-muted border-b border-border">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <ProductPlaceholder category={product.category} />
          )}
          <div className="absolute top-2 right-2">
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                product.category === ProductCategory.book
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {product.category === ProductCategory.book ? "Book" : "Incense"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          <h3 className="font-display text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className="text-yellow-500 text-xs">
                ★
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-auto pt-1">
            <span className="font-bold text-foreground text-sm">₹{price}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            size="sm"
            className="w-full text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <ShoppingCart className="h-3 w-3 mr-1" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Link>
  );
}
