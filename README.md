# Inventra — Administrator Dashboard

A real Next.js 14 (App Router) + TypeScript + Tailwind codebase for the
Administrator role of Inventra, an AI-powered product & inventory
management platform. All data is realistic mock data in `lib/mock-data.ts`
— there's no backend yet, so every table/form edits in-memory state only
(refreshing resets it).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`.

For a production build:

```bash
npm run build
npm start
```

> Note: the build fetches Inter, Space Grotesk, and JetBrains Mono from
> Google Fonts at build time via `next/font/google`. This requires normal
> internet access (it fails in network-locked sandboxes, which is expected).

## What's included

- **Dashboard Overview** — KPI cards, inventory health trend, category
  donut, recent products, AI insight preview
- **Product Management** — searchable/filterable table, add/edit modal,
  delete, AI Health Score ring, status pills (Healthy / Low / Out /
  Expiring / Expired)
- **Category Management** — category cards with stock share, create/delete
- **Warehouse Management** — capacity cards, transfer counts, a heat map
- **Supplier Management** — reliability scores, status, contact info
- **User Management** — role-based user table (Administrator / Inventory
  Manager / Warehouse Staff), invite modal
- **Inventory Analytics** — health trend, category share, warehouse
  utilization, product movement, expiry timeline (Recharts)
- **Procurement** — purchase requests with approve/reject actions
- **Reports** — generate/preview Inventory, Expiry, Warehouse, and
  Procurement summaries
- **AI Insights** — restock, transfer, expiry, slow-moving, and excess
  inventory recommendations as premium cards
- **Notifications** — categorized real-time-style alert feed, mark as read
- **Settings** — company profile, notification preferences, a
  role-permission matrix, integrations placeholder
- **Floating AI Assistant** — answers the seven example questions from the
  brief (restocking, expired products, low-inventory warehouse, expiring
  this week, slow movers, today's report, transfer recommendations) using
  the same mock data as the rest of the app
- **Dark / light mode** — toggle in the top bar, persisted to
  `localStorage`

## Design system

- **Palette**: signal blue primary (`#3F5BF6`) on a near-white / near-black
  neutral base, plus a 5-state status system (Healthy `#16A34A`, Low
  `#F5A524`, Out `#DC2626`, Expiring `#FB7D3B`, Expired `#6B7280`) used
  consistently across pills, charts, and the heat map.
- **Type**: Space Grotesk for headings, Inter for UI/body text, JetBrains
  Mono for SKUs, barcodes, and batch numbers — so identifiers always read
  as data, not prose.
- **Signature element**: the AI Health Score ring — a small circular gauge
  next to every product that recolors along the same status scale.

## Project structure

```
app/
  layout.tsx              root layout, fonts, globals.css
  page.tsx                redirects to /dashboard
  (admin)/
    layout.tsx             sidebar + topbar + floating AI assistant shell
    dashboard/page.tsx
    products/page.tsx
    categories/page.tsx
    warehouses/page.tsx
    suppliers/page.tsx
    users/page.tsx
    analytics/page.tsx
    procurement/page.tsx
    reports/page.tsx
    ai-insights/page.tsx
    notifications/page.tsx
    settings/page.tsx
components/
  sidebar.tsx, topbar.tsx, theme-toggle.tsx, ai-assistant.tsx
  ui/            card, button, status-pill, health-ring, ai-insight-card
  charts/        recharts wrappers (health trend, donut, bars, timeline, movement)
  products/, categories/, warehouses/, suppliers/, users/, procurement/, reports/, settings/
lib/
  types.ts        shared TypeScript interfaces
  mock-data.ts    all seed data (products, warehouses, suppliers, users, AI insights…)
  utils.ts        cn(), date formatting
```

## Next steps (not built yet)

- Real auth (email/password + Google OAuth), the marketing landing page,
  and the Inventory Manager / Warehouse Staff dashboards were intentionally
  left out of this pass — say the word and I'll build any of those next.
- Swap `lib/mock-data.ts` for real API calls / a database once a backend
  exists; the components are already written against the `Product`,
  `Warehouse`, etc. types in `lib/types.ts`, so the swap is mostly in the
  data layer.
