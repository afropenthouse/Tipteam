# Tipp (Tip The Team)

A feedback and tipping platform that lets customers rate businesses, leave feedback, and tip team members securely via Paystack.

## Features

- **Customer rating flow** — Rate 1-5 stars, share experience, and optionally tip a team member
- **Tip team members** — Direct tipping with preset or custom amounts, optional team member name
- **Business dashboard** — Manage businesses, view ratings, feedback, and wallet balance
- **Wallet & withdrawals** — Businesses can withdraw earned tips to their bank account
- **Email verification** — Secure signup with email verification and password reset
- **Paystack integration** — Secure payment processing

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, React Router v6, TanStack React Query, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL (Neon) |
| Payments | Paystack |
| Auth | JWT, bcrypt |
| Email | Nodemailer (SMTP) |

## Project Structure

```
Tipp/
├── frontend/          # React SPA (Vite)
│   └── src/
│       ├── pages/     # Route pages (auth, dashboard, customer rating)
│       ├── components/# Reusable UI components (shadcn/ui)
│       └── lib/      # API client, store, utilities
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/   # API routes (auth, businesses, feedback, withdrawals, paystack)
│   │   └── lib/     # Prisma client, JWT, email utilities
│   └── prisma/       # Database schema
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Neon account)
- Paystack account (for payments)
- SMTP credentials (for emails)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # or use existing .env
npx prisma generate
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs on `http://localhost:3000`



## Available Scripts

**Backend:**
- `npm run dev` — Start dev server with hot reload
- `npm run build` — Build TypeScript
- `npm start` — Run compiled JS
- `npm run db:push` — Push Prisma schema to DB
- `npm run db:generate` — Generate Prisma client
- `npm run db:studio` — Open Prisma Studio

**Frontend:**
- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run test` — Vitest
