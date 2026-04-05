// Admin WhatsApp number in international format (no + sign)
// ⚠️ UPDATE THIS to your real WhatsApp number before going live!
// Example: "919876543210" for +91 98765 43210
export const ADMIN_WHATSAPP_NUMBER = "918391020810"; // <-- UPDATE THIS

export interface WhatsAppOrderDetails {
  name: string;
  phone: string;
  address: string;
  products: Array<{ name: string; quantity: number; price: string }>;
  total: string;
}

export function buildAdminOrderMessage(details: WhatsAppOrderDetails): string {
  const productList = details.products
    .map((p) => `  - ${p.name} x${p.quantity} = \u20b9${p.price}`)
    .join("\n");
  return `\ud83d\udecd\ufe0f *New Order!*\n\n*Customer Name:* ${details.name}\n*Phone:* ${details.phone}\n*Address:* ${details.address}\n\n*Products:*\n${productList}\n\n*Total Price:* \u20b9${details.total}`;
}

export function openWhatsAppMessage(
  phoneNumber: string,
  message: string,
): void {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, "_blank");
}

export function openAdminWhatsAppNotification(
  details: WhatsAppOrderDetails,
): void {
  const message = buildAdminOrderMessage(details);
  openWhatsAppMessage(ADMIN_WHATSAPP_NUMBER, message);
}
