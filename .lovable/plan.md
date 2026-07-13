# G.K Bazaar — 10-min Grocery MVP

A Blinkit-style clone with customer storefront, admin panel, delivery agent app, and real-time 2-way location tracking. Cash on Delivery only.

## Stack
- TanStack Start + Tailwind + shadcn (existing)
- Lovable Cloud (auth, Postgres, RLS, Realtime) for backend
- Leaflet + OpenStreetMap for maps (no API key needed)
- Design: bright yellow/green Blinkit-like palette, bold, mobile-first

## Data model (public schema, RLS enabled)
- `profiles` — id (FK auth.users), full_name, phone
- `user_roles` — user_id, role enum('admin','agent','customer') + `has_role()` SECURITY DEFINER fn
- `categories` — id, name, slug, image_url, sort_order
- `products` — id, category_id, name, description, price, mrp, unit (e.g. "500g"), image_url, stock, is_active
- `orders` — id, customer_id, agent_id (nullable), status enum('placed','accepted','picked','out_for_delivery','delivered','cancelled'), total, address, customer_lat, customer_lng, created_at
- `order_items` — order_id, product_id, qty, price
- `live_locations` — order_id (PK), customer_lat/lng, agent_lat/lng, updated_at (Realtime broadcast for 2-way tracking)

Grants + RLS: customers see own orders; agents see assigned orders; admins see all. Products/categories publicly readable; admin-only writes.

## Routes
Customer (public / signed-in):
- `/` — hero + category grid + featured products
- `/category/$slug` — product listing
- `/cart`, `/checkout` — COD, captures live GPS + address
- `/orders`, `/orders/$id` — status + live map of agent

Auth:
- `/auth` — email/password login+signup (customers self-register)

Admin (`/_authenticated/admin/*`, role='admin'):
- `/admin` — dashboard: today's orders, revenue, active agents, top products, 7-day chart (Recharts)
- `/admin/products` — CRUD (add, edit price, toggle active, delete)
- `/admin/categories` — CRUD
- `/admin/orders` — assign agent, update status
- `/admin/agents` — create agent (email/password via admin server fn), list, activate/deactivate

Agent (`/_authenticated/delivery-agent/*`, role='agent'):
- `/delivery-agent` — assigned orders queue
- `/delivery-agent/orders/$id` — order details + map showing customer location; agent's browser broadcasts its GPS every 5s; buttons to update status

## Real-time tracking
- Both customer (on `/orders/$id`) and agent (on their order screen) call `navigator.geolocation.watchPosition` and upsert to `live_locations`; Supabase Realtime channel per order streams updates to the other side. Map re-renders marker positions live.

## Admin agent creation
Server fn `createDeliveryAgent` (middleware: requireSupabaseAuth + has_role('admin')) → dynamic-imports `supabaseAdmin`, calls `auth.admin.createUser`, assigns 'agent' role, inserts profile.

## Dashboard analytics
Server fn returning aggregates from `orders`: today revenue, orders count by status, 7-day revenue series, top 5 products (join order_items). Rendered with Recharts.

## Design system
Update `src/styles.css` tokens:
- Primary: Blinkit yellow `oklch(0.88 0.19 95)` (#F8CB46-ish)
- Accent: fresh green `oklch(0.62 0.19 145)`
- Bold rounded cards, category tiles with soft pastel backgrounds
- Custom Button variants: `hero`, `cta`
- Mobile-first bottom nav for customer app

## Build order
1. Enable Lovable Cloud
2. Migration: enums, tables, grants, RLS, has_role, seed categories + sample products
3. Design system + shared layout (customer header, admin sidebar, agent shell)
4. Auth pages + role-based routing under `_authenticated`
5. Customer storefront (home, category, product, cart, checkout)
6. Orders + live-tracking map (customer side)
7. Admin: products CRUD, categories, orders, agents, dashboard
8. Delivery agent: order queue, order detail with map + live broadcast
9. Seed one admin user via migration (email printed to user to change password)
10. SEO head tags, sitemap, robots

## Notes for the user
- I'll create an initial admin login and share the credentials.
- Real-time location needs the browser to grant GPS permission on both customer and agent devices.
- Maps use free OpenStreetMap tiles (no API key). Can swap to Mapbox/Google later.
- No online payments — checkout places COD orders. Stripe can be added anytime.

This is ~a big build; I'll ship it in one pass and you can iterate on styling/features after.