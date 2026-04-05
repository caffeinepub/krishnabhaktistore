# KrishnaBhaktiStore

## Current State
Full-stack ecommerce app with checkout form (name, email, phone, address), order placement via backend `placeOrder()`, and order confirmation page. No WhatsApp integration exists.

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/whatsapp.ts`: utility to build WhatsApp `wa.me` deep-link URLs for both admin notification and customer ordering
- Admin WhatsApp number constant (hardcoded, admin must update)
- `openAdminWhatsAppNotification(orderDetails)`: called automatically after successful order placement — opens WhatsApp with pre-filled message to admin
- "Order on WhatsApp" button on CheckoutPage: builds WhatsApp message from current cart + form data and opens it without placing a backend order (alternative path for customers who prefer WhatsApp)

### Modify
- `CheckoutPage.tsx`: 
  - After successful `placeOrder()`, call `openAdminWhatsAppNotification()` with order details
  - Add "Order on WhatsApp" button below the "Place Order" button as an alternative ordering method

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/utils/whatsapp.ts` with:
   - `ADMIN_WHATSAPP_NUMBER` constant (e.g. `919876543210` — user should update)
   - `buildAdminOrderMessage(name, phone, address, products, total)` → formatted string
   - `openWhatsAppMessage(phone, message)` → opens `https://wa.me/{phone}?text={encoded}`
   - `openAdminWhatsAppNotification(...)` → convenience wrapper for admin notification
   - `openCustomerWhatsAppOrder(...)` → builds message from cart items and opens WhatsApp to admin
2. Update `CheckoutPage.tsx`:
   - Import whatsapp utils
   - After `clearCart()` + `toast.success()`, call `openAdminWhatsAppNotification()`
   - Add "Order on WhatsApp" button that builds the WhatsApp message from the filled form + cart items and opens WhatsApp (no backend call required)
