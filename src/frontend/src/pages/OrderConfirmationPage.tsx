import { Link, useParams } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Order } from "../backend";
import { useActor } from "../hooks/useActor";

export function OrderConfirmationPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const { actor } = useActor();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!actor || !id) return;
    actor
      .getOrder(BigInt(id))
      .then(setOrder)
      .catch(() => {});
  }, [actor, id]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="flex justify-center mb-6">
        <CheckCircle2 className="h-20 w-20 text-accent" />
      </div>
      <h1 className="font-display text-3xl font-bold text-primary uppercase tracking-wider mb-3">
        Order Confirmed!
      </h1>
      <p className="text-muted-foreground mb-6">
        Hare Krishna! Your order has been placed successfully.
      </p>

      <div className="bg-card rounded-xl border border-border p-6 text-left mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Order ID</span>
          <span className="font-bold text-foreground font-mono">#{id}</span>
        </div>
        {order && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold">
                ₹{(Number(order.totalAmount) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                {order.status}
              </span>
            </div>
          </>
        )}
      </div>

      <Link
        to="/products"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium uppercase tracking-wider text-sm hover:bg-primary/90 transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
