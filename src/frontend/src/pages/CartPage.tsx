import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import React from "react";
import { ProductCategory } from "../backend";
import { useCart } from "../context/CartContext";

export function CartPage() {
  const { items, removeFromCart, updateQuantity, totalCents } = useCart();
  const navigate = useNavigate();

  const total = (Number(totalCents) / 100).toFixed(2);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Your cart is empty
        </h2>
        <p className="text-muted-foreground mb-8">
          Explore our sacred collection of books and incense.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium uppercase tracking-wider text-sm hover:bg-primary/90 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-primary mb-8">
        Your Cart
      </h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="md:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.productId.toString()}
              className="bg-card rounded-lg border border-border p-4 flex items-center gap-4"
            >
              {/* Image/Placeholder */}
              <div className="w-16 h-16 rounded-md border border-border overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">
                    {item.category === ProductCategory.book ? "📖" : "🪔"}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-semibold text-foreground truncate">
                  {item.name}
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {item.category === ProductCategory.book ? "Book" : "Incense"}
                </p>
                <p className="text-sm font-bold text-foreground mt-1">
                  ₹{(Number(item.priceCents) / 100).toFixed(2)}
                </p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(item.productId, item.quantity - 1)
                  }
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(item.productId, item.quantity + 1)
                  }
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {/* Subtotal */}
              <div className="text-right min-w-[60px]">
                <div className="text-sm font-bold text-foreground">
                  ₹
                  {(
                    Number(item.priceCents * BigInt(item.quantity)) / 100
                  ).toFixed(2)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeFromCart(item.productId)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="md:col-span-1">
          <div className="bg-card rounded-lg border border-border p-5 sticky top-20">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">
              Order Summary
            </h2>
            <Separator className="mb-4" />

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Items ({items.reduce((s, i) => s + i.quantity, 0)})
                </span>
                <span className="font-medium">₹{total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-accent font-medium">Free</span>
              </div>
            </div>

            <Separator className="mb-4" />

            <div className="flex justify-between font-bold text-base mb-5">
              <span>Total</span>
              <span>₹{total}</span>
            </div>

            <Button
              onClick={() => navigate({ to: "/checkout" })}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-wider text-sm"
            >
              Proceed to Checkout
            </Button>

            <Link
              to="/products"
              className="block text-center mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
