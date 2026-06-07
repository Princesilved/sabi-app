# Sabi — AI Business Operating System

Africa's first AI business OS. Built with Next.js 15, Convex, Clerk, and a dual AI engine (Gemini primary, Claude backup).

This is the working full-stack scaffold: landing page, auth, onboarding, command-center dashboard, transactions, inventory, customers, receipt scanning, team roles, plans/trials, and an AI assistant that can actually see your business data.

---

## What's in v2

- **Light / dark / system theme** — toggle in the sidebar or Settings. Persists per device, no flash on load.
- **Team roles & permissions (server-enforced)** — 7 roles: Owner, Manager, Accountant, Sales Rep, Marketer, Inventory Clerk, Viewer. Each only sees and does what its role allows. A Marketer never sees money; a Sales Rep logs sales but can't see total revenue. Permissions are checked on the server in every query/mutation, not just hidden in the UI.
- **Email invites** — invite staff by email. If they already have a Sabi account they're added instantly; otherwise they auto-join the business the moment they sign up with that email. (Sabi never creates accounts on someone's behalf.)
- **Plans & trials** — Hustler (free, 1 person, 1 business), Trader (₦5,000/mo, 3 businesses, 5 staff), Empire (₦20,000/mo, unlimited). Paid plans start with a 3-month free trial, no card required. Paystack billing is scaffolded for later.
- **Receipt & invoice scanning (vision AI)** — snap any receipt or supplier invoice, in any language including **Chinese**. Sabi reads it, extracts vendor/items/amounts, and shows an editable confirmation screen before saving as an expense and/or inventory.
- **Chinese language** added to the assistant and onboarding (中文).
- **Gemini is now the primary AI engine** (free, also powers receipt vision). Claude is the automatic backup. Users can switch in Settings.

### Roles at a glance

| Role | Sees money? | Inventory | Customers | Team | Notes |
|------|-------------|-----------|-----------|------|-------|
| Owner | ✓ all | edit | edit | manage + billing | full control |
| Manager | ✓ all | edit | edit | invite | no billing / no delete |
| Accountant | ✓ all | view only | view + payments | — | the books |
| Sales Rep | ✗ no totals | view | edit + payments | — | logs own sales |
| Marketer | ✗ none | view | — | — | adverts + AI only |
| Inventory Clerk | ✗ none | edit | — | — | stock only |
| Viewer | ✓ read-only | view | view | — | investors/assistants |

> **Note:** v2 changed the data model (businesses now have an `ownerId` + memberships). Start with a fresh Convex deployment or fresh data — old v1 businesses won't have memberships.

---


## Quick start (10 minutes)

### 1. Install dependencies

```bash
cd sabi-app
npm install
```

### 2. Set up Clerk

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com/) and create a new app (or use an existing one).
2. Copy the **Publishable Key** and **Secret Key** from the **API Keys** page.
3. Go to **JWT Templates** → **New template** → pick **Convex**. Name it exactly `convex`. Save.
4. On that JWT template page, copy the **Issuer** URL (looks like `https://your-app.clerk.accounts.dev`).

### 3. Set up Convex

```bash
npx convex dev
```

This will:
- Prompt you to log in
- Create a new Convex deployment for this project
- Print out your `NEXT_PUBLIC_CONVEX_URL` and write it (plus `CONVEX_DEPLOYMENT`) into `.env.local`
- Start watching your `convex/` folder and pushing changes automatically
- Generate the `convex/_generated/` folder

**Leave this running in one terminal.**

### 4. Fill in `.env.local`

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then fill in the keys you got from Clerk. Your `.env.local` should look like:

```env
# Convex (already filled by `npx convex dev`)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/onboarding
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

### 5. Add your AI key(s) to Convex

Sabi's AI runs on Convex's server, so the key must be set inside Convex (not in `.env.local`).

**Gemini is the primary engine** — it powers both the assistant and receipt scanning, and has a generous free tier. Set this one at minimum:

```bash
npx convex env set GEMINI_API_KEY AIzaSy-your-key-here
```

Get a free Gemini key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

**Optional — Claude as backup** (used automatically if Gemini fails, and selectable in Settings):

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-your-key-here
```

> In PowerShell, do **not** wrap the key in angle brackets — type the bare key after the name. `<` is a reserved operator in PowerShell and will throw an error.

### 6. Run the app

In a **second terminal** (keep `npx convex dev` running in the first):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## First-time flow

1. Click **Get started** → Clerk sign-up
2. After signing up, you'll land on **/onboarding** — pick a language, name your business, choose type
3. You'll be dropped into the **Command Center**
4. Try logging a sale: click **Log sale** → enter amount + description → save
5. Add some inventory items at `/dashboard/inventory`
6. Add a customer with debt at `/dashboard/customers`
7. Go to `/dashboard/assistant` and ask: *"How is my business doing today?"*

---

## Project structure

```
sabi-app/
├── app/
│   ├── page.tsx                    Landing (redirects to /dashboard if signed in)
│   ├── sign-in / sign-up           Clerk auth pages
│   ├── onboarding/                 3-step setup wizard
│   ├── dashboard/
│   │   ├── page.tsx                Command Center (stats, health, recent activity)
│   │   ├── transactions/           Sales & expense log
│   │   ├── inventory/              Stock management
│   │   ├── customers/              Customer & debt tracking
│   │   ├── assistant/              AI chat
│   │   └── settings/               Account, language, business switcher
│   ├── layout.tsx
│   └── globals.css                 Sabi brand styles
├── convex/
│   ├── schema.ts                   Database tables & indexes
│   ├── auth.config.ts              Clerk JWT integration
│   ├── users.ts                    User row management + onboarding
│   ├── businesses.ts               Business CRUD + dashboard stats
│   ├── transactions.ts             Sales/expense logging (auto-decrements stock, tracks debt)
│   ├── inventory.ts                Stock CRUD
│   ├── customers.ts                Customer CRUD + debt payments
│   ├── conversations.ts            AI chat history
│   └── ai.ts                       Claude action with business context
├── components/
│   ├── providers.tsx               ClerkProvider + ConvexProviderWithClerk
│   └── dashboard/                  Sidebar, dialogs, business context
├── lib/
│   ├── currency.ts                 Kobo ↔ Naira helpers
│   └── utils.ts                    cn, date formatting
├── middleware.ts                   Clerk route protection
├── tailwind.config.ts              Sabi brand colors (cream, ink, jollof)
├── package.json
└── .env.local.example
```

---

## Key design decisions

**Money is stored as integer kobo** (1 ₦ = 100 kobo). Use `nairaToKobo()` when saving from forms, `formatNaira()` when displaying. This avoids floating-point drift on small Naira amounts.

**`ensureUser` mutation, not a Clerk webhook.** The onboarding page calls `users.ensureUser` to create the Convex user row on first sign-in. Idempotent. Webhook integration is optional and can be added later.

**Internal queries for the AI action.** Convex's `internal.*` namespace lets the AI action read business context without going through the per-user auth check. The action verifies the caller's identity via the action's `auth.getUserIdentity()` chain. See `convex/ai.ts`.

**Multi-business support.** A user can own multiple businesses. The active business is stored in `localStorage` (`sabi:activeBusinessId`) and switchable from Settings.

**Mobile-first.** Bottom-tab nav on small screens, sidebar on desktop. Designed for shop owners doing this on a phone.

---

## What's wired up

| Feature | Status |
|---|---|
| Auth (sign in / up / out) | ✅ |
| Onboarding flow | ✅ |
| Multi-business support | ✅ |
| Log revenue & expenses | ✅ |
| Inventory CRUD + low-stock alerts | ✅ |
| Customer CRUD + debt tracking | ✅ |
| Auto-decrement stock on sale (when items linked) | ✅ |
| Auto-update customer debt on credit sale | ✅ |
| Record debt payment (creates revenue txn) | ✅ |
| Dashboard stats (30-day + today) | ✅ |
| AI assistant chat with business context | ✅ |
| AI generates ads in 5 languages | ✅ |
| Conversation history | ✅ |
| Language preference (en/pidgin/yo/ig/ha) | ✅ |

## What's stubbed for later

- **Receipt scanner** — Claude can do vision; needs file upload + image action
- **WhatsApp integration** — needs Twilio or WhatsApp Business API
- **Inventory items in transactions UI** — schema supports it, UI uses simple descriptions for now
- **Charts on dashboard** — recharts/visx ready to drop in
- **Export reports to PDF** — schema captures everything needed

---

## Common issues

**"ANTHROPIC_API_KEY is not set"** when chatting with assistant
→ You need `npx convex env set ANTHROPIC_API_KEY sk-ant-...`. Putting it in `.env.local` won't work because Convex actions run on Convex's servers, not yours.

**Auth loops or "Not authenticated" errors**
→ Make sure your Clerk JWT template is named exactly `convex` (lowercase) and the issuer URL in `.env.local` matches what Clerk shows.

**Convex types not resolving / import errors on `_generated`**
→ `npx convex dev` needs to be running. It generates `convex/_generated/api.ts` and `convex/_generated/dataModel.ts` on the fly.

**Onboarding loops back instead of going to dashboard**
→ Open browser devtools, check the network tab for the `ensureUser` and `completeOnboarding` mutations. Most likely the JWT issuer URL doesn't match.

---

## Tech stack

- **Next.js 15** (App Router, React Server Components)
- **Convex** (database + functions + real-time)
- **Clerk** (auth + user management)
- **Anthropic Claude Sonnet 4.5** (AI assistant + ad generator)
- **Tailwind CSS** (with custom Sabi brand tokens)
- **lucide-react** (icons)
- **sonner** (toasts)

---

Built in Lagos. Made for African SMEs. 🇳🇬
