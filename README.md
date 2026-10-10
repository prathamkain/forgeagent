# ForgeAgent - Zero-Inventory Generative Commerce

> **Autonomous AI art director that prices via Channel3, bargains, locks orders, and releases high-res generation via PayPal Sandbox and AG Grid deal ledger.**

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![AG Grid](https://img.shields.io/badge/AG_Grid-v36_Alpine_Dark-blue)](https://www.ag-grid.com/)
[![PayPal](https://img.shields.io/badge/PayPal-Checkout_SDK-00457C?logo=paypal)](https://developer.paypal.com/)
[![Channel3](https://img.shields.io/badge/Channel3-Market_Intelligence-green)](https://channel3.ai/)
[![Render](https://img.shields.io/badge/Render-Production_Ready-46E3B7?logo=render)](https://render.com/)

---

## 🌟 Overview

**ForgeAgent** turns prompt engineering into a frictionless, zero-inventory digital art commerce pipeline. Instead of static checkout flows, an autonomous generative art director interacts with buyers in real time:

1. **Interactive Concept Studio**: Generates instant low-res concept previews watermarked for evaluation.
2. **Channel3 Market Price Intelligence**: Indexes digital art commissions across platforms to calculate dynamic market values and prove immediate savings (e.g. *Market Value: $14.99 | Forge Deal: $4.99 (Save 67%)*).
3. **PayPal Developer Checkout**: Safely captures customer payments in USD using the official PayPal React & REST SDKs.
4. **Instant 4K Fulfillment**: Automates post-payment generation and delivers lossless, non-watermarked high-resolution art.
5. **AG Grid "Seller Analytics" Dashboard**: Live telemetry ledger tracking revenue, total volume, pending pipeline deals, order specs, and image thumbnails with rich custom renderers and CSV export.

---

## 🏆 Sponsor Tech Stack

| Sponsor / Technology | Integration Details |
| :--- | :--- |
| **PayPal Developer SDK** | Full end-to-end payment integration using `@paypal/react-paypal-js` client buttons and server-side capture endpoints (`/api/paypal/create-order` & `/api/paypal/capture-order`). |
| **Channel3 Intelligence** | Integrated via `src/lib/channel3.ts` to query real-time digital art comps and calculate market value estimates, discount ratios, and competitive price anchors. |
| **AG Grid Community** | Production `ag-theme-alpine-dark` dashboard at `/dashboard` featuring custom image thumbnails (50x50px), status pills, price formatters, tooltip truncation, sorting, filtering, and CSV export. |
| **Render Hosting** | Zero-downtime production deployment configured via `render.yaml` with automated Prisma migration and Next.js build pipeline. |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20.x or 22.x
- npm / pnpm / yarn
- PayPal Developer Sandbox account (optional for live test payments)

### 2. Clone and Install
```bash
git clone https://github.com/your-username/forgeagent.git
cd forgeagent
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the project root:
```bash
# Database (SQLite by default)
DATABASE_URL="file:./dev.db"

# PayPal Developer Sandbox Credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID="your_paypal_client_id_here"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret_here"

# AI & Market Intelligence
GEMINI_API_KEY="your_gemini_api_key_here"
OPENAI_API_KEY="your_openai_api_key_here" # Optional
CHANNEL3_API_KEY="your_channel3_api_key_here" # Optional (intelligent fallback enabled)
```

### 4. Initialize Database
Push the Prisma schema to generate your SQLite database and seed initial test orders:
```bash
npx prisma db push
node prisma/seed.js
```

### 5. Run Development Server
```bash
npm run dev
```

Visit the application:
- **Art Studio & Checkout**: [http://localhost:3000](http://localhost:3000)
- **Seller Analytics (AG Grid)**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## 🚢 Production Deployment on Render

This repository includes a turnkey [render.yaml](render.yaml) blueprint:

1. Connect your GitHub repository to [Render](https://render.com).
2. Create a **New Blueprint Instance** and select this repo.
3. Render automatically executes:
   ```bash
   npm install && npx prisma db push && npm run build
   ```
4. Configure the environment variables (`NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY`) in the Render dashboard.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
