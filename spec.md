# KrishnaBhaktiStore

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- Full ecommerce store for incense sticks and ISKCON books
- Homepage with hero section, featured products, categories
- Product listing page with filters (category, price)
- Product detail page with add-to-cart
- Shopping cart with quantity management
- Checkout flow (name, address, order summary)
- Admin panel (login-gated) to manage products and view orders
- Pre-loaded sample products: incense sticks varieties + ISKCON books
- Role-based access: admin vs. customer

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Select `authorization` component for role-based access (admin/customer)
2. Generate Motoko backend with:
   - Product catalog (CRUD for admin, read for all)
   - Order management (create order, list orders for admin)
   - Cart state (client-side, no backend needed)
   - Sample seed data for products
3. Build frontend:
   - Homepage with hero, featured products, category browse
   - Product listing with category filter
   - Product detail page
   - Cart (local state)
   - Checkout form submitting order to backend
   - Admin panel: product management (add/edit/delete), order list
   - Navigation with cart icon showing item count
