import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@dfinity/principal";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MessageCircle } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { Order } from "../backend";
import { OrderStatus } from "../backend";
import { useCart } from "../context/CartContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  ADMIN_WHATSAPP_NUMBER,
  type WhatsAppOrderDetails,
  buildAdminOrderMessage,
  openAdminWhatsAppNotification,
} from "../utils/whatsapp";

type PaymentMethod = "cod" | "upi";

export function CheckoutPage() {
  const { actor } = useActor();
  const { items, totalCents, clearCart } = useCart();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [upiTxnId, setUpiTxnId] = useState("");
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

  const buildWhatsAppDetails = (): WhatsAppOrderDetails => ({
    name: form.name,
    phone: form.phone,
    address: form.address,
    products: items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: (Number(i.priceCents * BigInt(i.quantity)) / 100).toFixed(2),
    })),
    total,
  });

  const sendWhatsAppSilently = (details: WhatsAppOrderDetails) => {
    const message = buildAdminOrderMessage(details);
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encoded}`;
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 5000);
    } catch {
      // Silently ignore
    }
  };

  const placeOrderWithStatus = async (
    status: OrderStatus,
    upiTransactionId = "",
  ) => {
    if (!actor || items.length === 0) return;
    setLoading(true);
    try {
      const customerId =
        identity && !identity.getPrincipal().isAnonymous()
          ? identity.getPrincipal()
          : Principal.anonymous();

      const order = {
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
        status,
        createdAt: 0n,
        upiTransactionId: upiTransactionId,
      } satisfies Order;

      await actor.placeOrder(order);
      sendWhatsAppSilently(buildWhatsAppDetails());
      clearCart();
      setOrderPlaced(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCODSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await placeOrderWithStatus(OrderStatus.pending);
  };

  const handleUPIPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill in your Name, Phone, and Address.");
      return;
    }
    if (!upiTxnId.trim()) {
      toast.error("Please enter your UPI Transaction ID.");
      return;
    }
    await placeOrderWithStatus(OrderStatus.pending, upiTxnId.trim());
  };

  const handleOrderOnWhatsApp = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill Name, Phone, and Address first.");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    openAdminWhatsAppNotification(buildWhatsAppDetails());
  };

  if (orderPlaced) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-6">\uD83D\uDE4F</div>
        <h2 className="font-display text-2xl font-bold text-primary mb-3">
          {paymentMethod === "upi"
            ? "Payment Pending Verification"
            : "Order Placed Successfully!"}
        </h2>
        <p className="text-muted-foreground text-lg mb-8">
          {paymentMethod === "upi"
            ? "Your UPI payment is being verified. We will confirm your order shortly."
            : "We will contact you soon."}
        </p>
        <Button
          onClick={() => navigate({ to: "/products" })}
          variant="outline"
          className="mt-2"
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

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
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="space-y-5">
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
                data-ocid="checkout.name.input"
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
                data-ocid="checkout.email.input"
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
                data-ocid="checkout.phone.input"
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
                data-ocid="checkout.address.textarea"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("cod")}
                className={`border-2 rounded-lg p-3 text-sm font-medium transition-colors ${
                  paymentMethod === "cod"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                Cash on Delivery
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("upi")}
                className={`border-2 rounded-lg p-3 text-sm font-medium transition-colors ${
                  paymentMethod === "upi"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-border text-muted-foreground hover:border-orange-300"
                }`}
              >
                UPI Payment
              </button>
            </div>
          </div>

          {/* COD */}
          {paymentMethod === "cod" && (
            <form onSubmit={handleCODSubmit} className="space-y-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground uppercase tracking-wider text-sm"
                data-ocid="checkout.place_order.submit_button"
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

              <p className="text-xs text-center text-muted-foreground">
                — or —
              </p>

              <Button
                type="button"
                onClick={handleOrderOnWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-sm uppercase tracking-wider py-3 h-auto flex items-center justify-center gap-2"
                data-ocid="checkout.whatsapp_order.button"
              >
                <MessageCircle className="h-5 w-5" />
                Order on WhatsApp
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Opens WhatsApp with your order details.
              </p>
            </form>
          )}

          {/* UPI */}
          {paymentMethod === "upi" && (
            <form onSubmit={handleUPIPaid} className="space-y-4">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Send payment via any UPI app
                </p>
                <p className="text-lg font-bold text-orange-700">
                  Pay using UPI: 918391020810
                </p>
                <p className="text-xs text-muted-foreground">
                  (PhonePe, GPay, Paytm, or any UPI app)
                </p>
              </div>

              <div>
                <Label htmlFor="upiTxnId">UPI Transaction ID *</Label>
                <Input
                  id="upiTxnId"
                  value={upiTxnId}
                  onChange={(e) => setUpiTxnId(e.target.value)}
                  placeholder="Enter your UPI Transaction ID"
                  className="mt-1"
                  required
                  data-ocid="checkout.upi_txn_id.input"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the transaction ID from your UPI payment confirmation.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-wider text-sm py-3 h-auto"
                data-ocid="checkout.upi_paid.button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Processing...
                  </>
                ) : (
                  "I have paid"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Click after completing UPI payment. Order will be marked as
                Paid.
              </p>
            </form>
          )}
        </div>

        {/* Order Summary */}
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
                  \u20B9
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
            <span>\u20B9{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
