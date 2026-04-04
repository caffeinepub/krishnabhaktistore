import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";
import { useCart } from "../context/CartContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function CheckoutPage() {
  const { actor } = useActor();
  const { items, totalCents, clearCart } = useCart();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const total = (Number(totalCents) / 100).toFixed(2);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor || items.length === 0) return;

    setLoading(true);
    try {
      const customerId =
        identity && !identity.getPrincipal().isAnonymous()
          ? identity.getPrincipal()
          : Principal.anonymous();

      const order: Order = {
        id: 0n,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        shippingAddress: form.address,
        customerId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: BigInt(i.quantity),
          priceAtOrder: i.priceCents,
        })),
        totalAmount: totalCents,
        status: OrderStatus.pending,
        createdAt: 0n,
      };

      const orderId = await actor.placeOrder(order);
      clearCart();
      toast.success("Order placed successfully!");
      navigate({ to: `/order/${orderId.toString()}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button
          onClick={() => navigate({ to: "/products" })}
          variant="outline"
          className="mt-4"
        >
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-primary mb-8">
        Checkout
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Your full name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
              placeholder="+91 XXXXXXXXXX"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address">Shipping Address *</Label>
            <Textarea
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              placeholder="Full delivery address..."
              className="mt-1"
              rows={4}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-wider text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing
                Order...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </form>

        {/* Summary */}
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            Order Summary
          </h2>
          <Separator className="mb-4" />
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div
                key={item.productId.toString()}
                className="flex justify-between text-sm"
              >
                <span className="text-foreground">
                  {item.name}{" "}
                  <span className="text-muted-foreground">
                    x{item.quantity}
                  </span>
                </span>
                <span className="font-medium">
                  ₹
                  {(
                    Number(item.priceCents * BigInt(item.quantity)) / 100
                  ).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="mb-3" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
