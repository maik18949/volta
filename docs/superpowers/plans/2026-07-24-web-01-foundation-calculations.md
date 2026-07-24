# Volta Web — Plan 1: Foundation (Supabase Schema, Auth & Calculations)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Postgres schema + RLS on the existing Supabase project, wire Magic-Link auth into the Next.js App Router shell, and port the full calculation engine (amortization, depreciation, status-day-proration, cashflow, tax) from the native Swift implementation to unit-tested TypeScript. No UI beyond a bare login/protected-page smoke test — this plan produces the data + logic layer that Plans 2–5 build screens on top of.

**Architecture:** `lib/calculations/*` are pure TypeScript functions with zero React/Supabase imports — fully unit-testable in isolation (Vitest), mirroring `Volta/Volta/Calculations/*.swift` from the native app almost line-for-line. `lib/supabase/*` holds the DB access layer (browser client, server client, generated types). Auth uses `@supabase/ssr` with a Next.js middleware that refreshes sessions and a route group `(app)` gated by a server-side session check.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + Auth), `@supabase/ssr`, Vitest, pnpm.

---

## Context: why these exact formulas

The native SwiftUI app (`Volta/Volta/Calculations/*.swift`) went through two rounds of correctness fixes captured in `docs/superpowers/plans/2026-06-14-01-foundation-calculations.md` (base calculators) and `docs/superpowers/plans/2026-06-16-cashflow-tax-redesign.md` (day-level status proration + amortizing-interest tax fix — this is the **validated final logic**, not the simplified first draft). This plan ports the second, corrected version. Field names follow `docs/specs/spec-data-model.md` / `CLAUDEvolta.md` (3-value `PropertyStatus`, `monthlyMortgage` stored directly — no separate "actual" override field, since the web model always stores it and lets the user edit it directly).

---

## File Map

```
web/
├── supabase/
│   └── migrations/
│       └── 20260724120000_initial_schema.sql
├── middleware.ts                                  # Session refresh, all routes
├── app/
│   ├── login/page.tsx                             # Magic-Link form
│   ├── auth/callback/route.ts                     # Exchanges magic-link code for session
│   └── (app)/
│       ├── layout.tsx                             # Server-side session guard, redirects to /login
│       └── page.tsx                               # Placeholder "Signed in as {email}" smoke test
├── lib/
│   ├── supabase/
│   │   ├── client.ts                              # exists already
│   │   ├── server.ts                              # exists already
│   │   └── types.ts                               # generated, gitignored input regenerated here
│   ├── calculations/
│   │   ├── dateHelpers.ts
│   │   ├── statusPeriodCalculator.ts
│   │   ├── amortizationCalculator.ts
│   │   ├── depreciationCalculator.ts
│   │   ├── kpiCalculator.ts
│   │   ├── cashflowCalculator.ts
│   │   └── taxCalculator.ts
│   └── formatters.ts
└── tests/
    └── calculations/
        ├── fixtures.ts
        ├── dateHelpers.test.ts
        ├── statusPeriodCalculator.test.ts
        ├── amortizationCalculator.test.ts
        ├── depreciationCalculator.test.ts
        ├── kpiCalculator.test.ts
        ├── cashflowCalculator.test.ts
        └── taxCalculator.test.ts
```

---

## Task 0: Vitest setup

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Add test script**

In `web/package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create `web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 3: Verify it runs with zero tests**

Run: `cd web && pnpm test`
Expected: `No test files found` (or similar) — exits without error. This just confirms the runner wires up before we add real tests.

- [ ] **Step 4: Commit**

```bash
git add web/package.json web/vitest.config.ts web/pnpm-lock.yaml
git commit -m "chore(web): add Vitest test runner"
```

---

## Task 1: Postgres schema migration

**Files:**
- Create: `web/supabase/migrations/20260724120000_initial_schema.sql`

This is the schema already designed and reviewed in `CLAUDEvolta.md` (§ Datenmodell) — copied verbatim into a migration file, plus the four missing enums/tables assembled into one file.

- [ ] **Step 1: Create the migration file**

```sql
-- web/supabase/migrations/20260724120000_initial_schema.sql

create type property_type as enum ('apartment', 'einfamilienhaus', 'mehrfamilienhaus', 'gewerbe', 'grundstuck', 'sonstiges');
create type acquisition_type as enum ('kauf', 'erbschaft', 'schenkung');
create type parking_type as enum ('nicht_vorhanden', 'tiefgarage', 'aussenstellplatz', 'garage');
create type heating_type as enum ('fernwarme', 'gas', 'ol', 'warmepumpe', 'pellet', 'elektro', 'sonstiges');
create type energy_class as enum ('a_plus_plus', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h');
create type property_condition as enum ('neubau', 'erstbezug', 'gepflegt', 'renovierungsbedurftig', 'sanierungsbedurftig');
create type property_status as enum ('vermietet', 'leerstand', 'mietgarantie');
create type extraordinary_cost_category as enum ('sonderumlage', 'reparatur', 'gutachter', 'rechtskosten', 'sonstiges');

create table properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  property_type property_type not null default 'apartment',
  acquisition_type acquisition_type not null default 'kauf',
  year_built int,
  notes text not null default '',

  living_area_sqm double precision not null default 0,
  usable_area_sqm double precision,
  land_area_sqm double precision,
  rooms double precision,
  bedrooms int,
  bathrooms int,
  floor_level int,
  has_balcony boolean not null default false,
  has_terrace boolean not null default false,
  has_garden boolean not null default false,
  has_basement boolean not null default false,
  basement_size_sqm double precision,
  has_fitted_kitchen boolean not null default false,
  parking_type parking_type not null default 'nicht_vorhanden',
  parking_count int not null default 0,
  heating_type heating_type,
  energy_efficiency_class energy_class,
  condition property_condition,
  last_renovation_year int,

  purchase_date date not null default now(),
  economic_transfer_date date not null default now(),
  purchase_price_unit double precision not null default 0,
  purchase_price_parking double precision not null default 0,
  land_transfer_tax double precision not null default 0,
  notary_costs double precision not null default 0,
  land_registry_costs double precision not null default 0,
  agent_fee double precision not null default 0,
  appraisal_costs double precision not null default 0,
  renovation_modernization_costs double precision not null default 0,
  renovation_afa_eligible double precision not null default 0,

  cold_rent_monthly double precision not null default 0,
  warmmiete_monthly double precision,
  parking_rent_monthly double precision not null default 0,
  other_income_monthly double precision not null default 0,

  vacancy_rate_assumption double precision not null default 0.03,
  market_rent_per_sqm double precision,
  current_market_value double precision,

  hoa_fee_total_monthly double precision not null default 0,
  is_hoa_unit_split boolean not null default false,
  hoa_fee_recoverable_monthly double precision not null default 0,
  hoa_fee_maintenance_reserve_monthly double precision not null default 0,
  property_tax_annual double precision not null default 0,
  property_management_annual double precision not null default 0,
  property_insurance_annual double precision not null default 0,
  other_costs_monthly double precision not null default 0,

  hoa_fee_parking_total_monthly double precision not null default 0,
  is_hoa_parking_split boolean not null default false,
  hoa_fee_parking_recoverable_monthly double precision not null default 0,
  hoa_fee_parking_maintenance_reserve_monthly double precision not null default 0,
  property_tax_parking_annual double precision not null default 0,

  loan_amount double precision not null default 0,
  interest_rate double precision not null default 0,
  amortization_rate double precision not null default 0,
  fixed_interest_period_years int not null default 10,
  loan_start_date date not null default now(),
  monthly_mortgage double precision not null default 0,
  equity_contributed double precision not null default 0,
  broker_commission_agreement double precision not null default 0,

  land_value double precision not null default 0,
  building_value double precision not null default 0,
  depreciation_rate double precision not null default 0.02,
  marginal_tax_rate double precision not null default 0,

  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table properties enable row level security;
create policy "properties_owner" on properties for all using (user_id = auth.uid());

create table status_entries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  date date not null default now(),
  status property_status not null default 'vermietet',
  income_actual_monthly double precision,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table status_entries enable row level security;
create policy "status_entries_owner" on status_entries for all using (
  property_id in (select id from properties where user_id = auth.uid())
);

create table extraordinary_costs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  cost_month date not null default now(),
  amount double precision not null default 0,
  category extraordinary_cost_category not null default 'sonstiges',
  description_text text,
  is_deductible boolean not null default true
);

alter table extraordinary_costs enable row level security;
create policy "extraordinary_costs_owner" on extraordinary_costs for all using (
  property_id in (select id from properties where user_id = auth.uid())
);

create table property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  file_path text not null,
  is_cover_photo boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table property_photos enable row level security;
create policy "property_photos_owner" on property_photos for all using (
  property_id in (select id from properties where user_id = auth.uid())
);

create index status_entries_property_id_date_idx on status_entries (property_id, date);
create index extraordinary_costs_property_id_month_idx on extraordinary_costs (property_id, cost_month);
create index property_photos_property_id_idx on property_photos (property_id);
```

- [ ] **Step 2: Apply the migration to the linked Supabase project**

If the Supabase CLI is linked to the project already (check `web/supabase/config.toml` / `supabase projects list`):

Run: `cd web && supabase db push`
Expected: `Applying migration 20260724120000_initial_schema.sql...` then success, no errors.

If the project isn't linked yet, run `supabase link --project-ref <ref>` first (project ref is the subdomain in `NEXT_PUBLIC_SUPABASE_URL`, e.g. `https://<ref>.supabase.co`), then re-run `supabase db push`.

- [ ] **Step 3: Verify tables exist**

Run: `cd web && supabase db diff` (or check via the Supabase dashboard Table Editor)
Expected: no pending diff — schema in the migration matches the remote DB.

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/20260724120000_initial_schema.sql
git commit -m "feat(db): create properties, status_entries, extraordinary_costs, property_photos schema"
```

---

## Task 2: Generate TypeScript types from schema

**Files:**
- Create: `web/lib/supabase/types.ts`

- [ ] **Step 1: Generate types**

Run: `cd web && supabase gen types typescript --linked > lib/supabase/types.ts`
Expected: file written, exports a `Database` type with `public.Tables.properties.Row` etc. matching the migration's columns.

- [ ] **Step 2: Wire the generated type into the existing Supabase clients**

Read `web/lib/supabase/client.ts` and `web/lib/supabase/server.ts` first to see their current shape (they were scaffolded in the Next.js setup commit but likely aren't typed yet). Update both `createBrowserClient(...)` / `createServerClient(...)` calls to pass the generic:

```typescript
import type { Database } from './types';
// createBrowserClient<Database>(...)
// createServerClient<Database>(...)
```

- [ ] **Step 3: Verify the build still compiles**

Run: `cd web && pnpm build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add web/lib/supabase/types.ts web/lib/supabase/client.ts web/lib/supabase/server.ts
git commit -m "feat(db): generate and wire up Supabase TypeScript types"
```

---

## Task 3: Magic-Link auth (login page, callback, protected layout)

**Files:**
- Create: `web/middleware.ts`
- Create: `web/app/login/page.tsx`
- Create: `web/app/auth/callback/route.ts`
- Modify: `web/app/(app)/layout.tsx` (create if it doesn't exist yet)
- Modify: `web/app/(app)/page.tsx` (create if it doesn't exist yet — currently the default Next.js template lives at `web/app/page.tsx`; move it into the route group)

- [ ] **Step 1: Create `web/middleware.ts`** — refreshes the Supabase session cookie on every request

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Create `web/app/login/page.tsx`** — Magic-Link request form (client component)

```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return <p>Magic Link gesendet — bitte E-Mail-Postfach prüfen.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        E-Mail
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button type="submit">Magic Link senden</button>
      {status === 'error' && <p role="alert">Fehler beim Senden — bitte erneut versuchen.</p>}
    </form>
  );
}
```

- [ ] **Step 3: Create `web/app/auth/callback/route.ts`** — exchanges the magic-link code for a session

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

- [ ] **Step 4: Move the default page into a protected route group — create `web/app/(app)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Create `web/app/(app)/page.tsx`** — replaces the default template as a smoke test

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <p>Angemeldet als {user?.email}</p>;
}
```

- [ ] **Step 6: Delete the old `web/app/page.tsx` template** so the route group takes over `/`

Run: `cd web && rm app/page.tsx`

- [ ] **Step 7: Manual verification**

Run: `cd web && pnpm dev`, open `http://localhost:3000` — expect a redirect to `/login`. Submit the form with a real email, check inbox for the magic link, click it — expect redirect back to `/` showing "Angemeldet als {email}".

- [ ] **Step 8: Commit**

```bash
git add web/middleware.ts web/app/login web/app/auth web/app/\(app\)
git add -u web/app/page.tsx
git commit -m "feat(auth): add Magic-Link login, session middleware, protected route group"
```

---

## Task 4: Date helpers

**Files:**
- Create: `web/lib/calculations/dateHelpers.ts`
- Create: `web/tests/calculations/dateHelpers.test.ts`

All calculation-layer dates are plain `Date` objects constructed at UTC midnight, so day/month arithmetic never drifts across timezones.

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/dateHelpers.test.ts
import { describe, it, expect } from 'vitest';
import {
  firstDayOfMonth,
  makeDate,
  dayOfMonth,
  daysInMonth,
  addMonths,
  monthsBetween,
  yearOf,
  monthOf,
} from '@/lib/calculations/dateHelpers';

describe('dateHelpers', () => {
  it('daysInMonth returns 30 for June', () => {
    expect(daysInMonth(makeDate(2026, 6, 1))).toBe(30);
  });

  it('daysInMonth returns 28 for a non-leap February', () => {
    expect(daysInMonth(makeDate(2026, 2, 1))).toBe(28);
  });

  it('daysInMonth returns 29 for a leap February', () => {
    expect(daysInMonth(makeDate(2028, 2, 1))).toBe(29);
  });

  it('makeDate + dayOfMonth round-trip', () => {
    const d = makeDate(2026, 6, 16);
    expect(yearOf(d)).toBe(2026);
    expect(monthOf(d)).toBe(6);
    expect(dayOfMonth(d)).toBe(16);
  });

  it('firstDayOfMonth zeroes the day component', () => {
    const d = makeDate(2026, 6, 16);
    expect(dayOfMonth(firstDayOfMonth(d))).toBe(1);
  });

  it('addMonths advances by N calendar months', () => {
    const d = addMonths(makeDate(2025, 10, 1), 3);
    expect(yearOf(d)).toBe(2026);
    expect(monthOf(d)).toBe(1);
  });

  it('monthsBetween counts whole calendar months from start to end inclusive', () => {
    // Oct 2025 -> Dec 2025 = 3 months (Oct, Nov, Dec)
    expect(monthsBetween(makeDate(2025, 10, 1), makeDate(2025, 12, 31))).toBe(3);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test dateHelpers`
Expected: fails — module `@/lib/calculations/dateHelpers` doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/dateHelpers.ts`**

```typescript
/**
 * All dates are constructed at UTC midnight so day/month arithmetic is
 * timezone-independent (calculation layer never deals in wall-clock time).
 */

export function makeDate(year: number, month: number, day: number = 1): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function yearOf(date: Date): number {
  return date.getUTCFullYear();
}

export function monthOf(date: Date): number {
  return date.getUTCMonth() + 1;
}

export function dayOfMonth(date: Date): number {
  return date.getUTCDate();
}

export function firstDayOfMonth(date: Date): Date {
  return makeDate(yearOf(date), monthOf(date), 1);
}

export function daysInMonth(date: Date): number {
  return new Date(Date.UTC(yearOf(date), monthOf(date), 0)).getUTCDate();
}

export function addMonths(date: Date, months: number): Date {
  const totalMonths = (yearOf(date) - 1) * 12 + (monthOf(date) - 1) + months;
  const year = Math.floor(totalMonths / 12) + 1;
  const month = (totalMonths % 12) + 1;
  return makeDate(year, month, 1);
}

/** Number of whole calendar months from `start`'s month to `end`'s month, inclusive. */
export function monthsBetween(start: Date, end: Date): number {
  const startTotal = yearOf(start) * 12 + (monthOf(start) - 1);
  const endTotal = yearOf(end) * 12 + (monthOf(end) - 1);
  return endTotal - startTotal + 1;
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test dateHelpers`
Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/dateHelpers.ts web/tests/calculations/dateHelpers.test.ts
git commit -m "feat(calculations): add UTC-safe date helpers"
```

---

## Task 5: Test fixture — Dresdner ETW

**Files:**
- Create: `web/tests/calculations/fixtures.ts`

Single shared fixture reused by every calculator test, ported from `Volta/VoltaTests/TestFixtures.swift` (all values manually verified against a real property). Field names updated for the web data model: `monthlyMortgage` (not `monthlyMortgageActual` — the web model has no separate calculated/actual pair, just one stored, user-editable field), and the 3-value `PropertyStatus`.

- [ ] **Step 1: Create `web/tests/calculations/fixtures.ts`**

```typescript
import { makeDate } from '@/lib/calculations/dateHelpers';

export const fixtures = {
  purchasePriceUnit: 263_600.0,
  purchasePriceParking: 15_000.0,
  purchasePrice: 278_600.0, // unit + parking

  landTransferTax: 15_323.0,
  notaryCosts: 3_631.96,
  landRegistryCosts: 1_180.0,
  agentFee: 0.0,
  appraisalCosts: 0.0,
  closingCostsTotal: 20_134.96,
  renovationModernizationCosts: 0.0,
  renovationAfaEligible: 0.0,
  totalInvestment: 298_734.96,

  coldRentMonthly: 950.0,
  parkingRentMonthly: 48.0,
  coldRentYearly: 11_400.0,
  parkingRentYearly: 576.0,
  vacancyRateAssumption: 0.03,
  effectiveGrossIncomeYearly: 11_616.72, // (cold+parking)*12*(1-0.03)

  hoaFeeTotalMonthly: 417.0,
  hoaFeeRecoverableMonthly: 292.0,
  hoaFeeNonRecoverableMonthly: 125.0, // total - recoverable
  propertyTaxAnnual: 205.0,
  propertyTaxMonthly: 17.0833333, // 205/12
  propertyManagementAnnual: 396.0,
  propertyManagementMonthly: 33.0, // 396/12
  maintenanceReserveMonthly: 34.76,
  propertyInsuranceAnnual: 0.0,
  operatingCostsNonRecoverableMonthly: 192.76, // 125 + 34.76 + 33.0
  operatingCostsNonRecoverableYearly: 2_313.12,
  operatingCostsRecoverableMonthly: 309.0833333, // 292 + 17.0833 + 0

  netOperatingIncomeYearly: 9_303.60, // effective - nonRecovYearly

  loanAmount: 230_000.0,
  interestRate: 0.043,
  amortizationRate: 0.01,
  monthlyMortgage: 1_242.85,
  debtServiceAnnual: 14_914.20, // mortgage * 12
  interestAnnual: 9_890.0, // loanAmount * interestRate
  equityUsed: 68_734.96, // totalInvestment - loanAmount
  cashflowAfterDebtYearly: -5_610.60, // NOI - debtService
  cashflowAfterDebtMonthly: -467.55,

  loanStartDate: makeDate(2025, 10, 1),
  economicTransferDate: makeDate(2026, 2, 1),

  landValue: 50_600.0,
  buildingValue: 228_000.0,
  depreciationRate: 0.0384,
  marginalTaxRate: 0.42,
  // buildingShareRatio = 228000 / 278600 = 0.818376...
  // afaBasis = 228000 + (20134.96 * 0.818376) + 0 = 244_477.97
  afaBasis: 244_477.97,
  depreciationYearly: 9_387.95, // afaBasis * 0.0384
  depreciationMonthly: 782.33,

  taxableIncomeVV: -9_974.35, // 11616.72 - 2313.12 - 9890 - 9387.95
  taxEffectYearly: 4_189.23, // 9974.35 * 0.42
  taxEffectMonthly: 349.10,
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/tests/calculations/fixtures.ts
git commit -m "test: add Dresdner ETW shared fixture"
```

---

## Task 6: amortizationCalculator.ts (TDD)

**Files:**
- Create: `web/lib/calculations/amortizationCalculator.ts`
- Create: `web/tests/calculations/amortizationCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/amortizationCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import {
  monthlyMortgageCalc,
  remainingDebt,
  amortizationSchedule,
  interestForCalendarYear,
} from '@/lib/calculations/amortizationCalculator';

describe('amortizationCalculator', () => {
  it('monthlyMortgageCalc: interest + principal components', () => {
    // interest: 230000 * 0.043/12 = 824.17, principal: 230000 * 0.01/12 = 191.67
    const result = monthlyMortgageCalc(f.loanAmount, f.interestRate, f.amortizationRate);
    expect(result).toBeCloseTo(1_015.83, 1);
  });

  it('remainingDebt at month 0 equals loanAmount', () => {
    const result = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 0);
    expect(result).toBeCloseTo(f.loanAmount, 1);
  });

  it('remainingDebt at month 1', () => {
    // 230000 * (1 + 0.043/12) - 1242.85 = 229581.32
    const result = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 1);
    expect(result).toBeCloseTo(229_581.32, 0);
  });

  it('remainingDebt decreases over time', () => {
    const r0 = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 0);
    const r12 = remainingDebt(f.loanAmount, f.interestRate, f.monthlyMortgage, 12);
    expect(r12).toBeLessThan(r0);
  });

  it('amortizationSchedule: first row starts at loanAmount', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 12);
    expect(schedule).toHaveLength(12);
    expect(schedule[0].remainingDebt).toBeCloseTo(f.loanAmount - schedule[0].principal, 0);
  });

  it('amortizationSchedule: interest + principal always equal payment', () => {
    const schedule = amortizationSchedule(f.loanAmount, f.interestRate, f.monthlyMortgage, f.loanStartDate, 6);
    for (const row of schedule) {
      expect(row.interest + row.principal).toBeCloseTo(row.payment, 1);
    }
  });

  it('interestForCalendarYear: 2025, three months (Oct-Dec)', () => {
    const result = interestForCalendarYear(2025, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(result).toBeCloseTo(2467.99, 0);
  });

  it('interestForCalendarYear: 2026, full year', () => {
    const result = interestForCalendarYear(2026, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(result).toBeCloseTo(9734.81, 0);
  });

  it('interestForCalendarYear: before loanStartDate is zero', () => {
    const result = interestForCalendarYear(2024, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test amortizationCalculator`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/amortizationCalculator.ts`**

```typescript
import { addMonths, yearOf, monthsBetween, makeDate } from './dateHelpers';

export interface AnnuityRow {
  month: number; // 1-based index into the schedule
  date: Date;
  interest: number;
  principal: number;
  payment: number;
  remainingDebt: number;
}

/** Calculated monthly payment (interest + amortization) — used to prefill the wizard. */
export function monthlyMortgageCalc(loanAmount: number, interestRate: number, amortizationRate: number): number {
  const interestMonthly = loanAmount * (interestRate / 12);
  const principalMonthly = loanAmount * (amortizationRate / 12);
  return interestMonthly + principalMonthly;
}

/** Dynamic remaining debt after t months (annuity formula). t = 0 returns the original loan. */
export function remainingDebt(
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number,
  t: number
): number {
  if (t <= 0) return loanAmount;
  const r = interestRate / 12;
  if (r === 0) return loanAmount - monthlyPayment * t;
  const factor = Math.pow(1 + r, t);
  return loanAmount * factor - (monthlyPayment * (factor - 1)) / r;
}

/** Full amortization schedule as an array of AnnuityRow, starting at loanStartDate. */
export function amortizationSchedule(
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number,
  loanStartDate: Date,
  months: number
): AnnuityRow[] {
  const r = interestRate / 12;
  const rows: AnnuityRow[] = [];
  let currentDebt = loanAmount;

  for (let t = 1; t <= Math.max(1, months); t++) {
    const interest = currentDebt * r;
    const principal = monthlyPayment - interest;
    currentDebt -= principal;
    rows.push({
      month: t,
      date: addMonths(loanStartDate, t - 1),
      interest,
      principal: Math.max(0, principal),
      payment: monthlyPayment,
      remainingDebt: Math.max(0, currentDebt),
    });
  }
  return rows;
}

/**
 * Total interest paid within a calendar year, using the exact amortization
 * schedule (not an approximation). Years before loanStartDate return 0.
 */
export function interestForCalendarYear(
  year: number,
  loanStartDate: Date,
  loanAmount: number,
  interestRate: number,
  monthlyPayment: number
): number {
  if (loanAmount <= 0 || interestRate <= 0 || monthlyPayment <= 0) return 0;
  if (yearOf(loanStartDate) > year) return 0;

  const yearEnd = makeDate(year, 12, 31);
  const totalMonths = monthsBetween(loanStartDate, yearEnd);
  if (totalMonths <= 0) return 0;

  const schedule = amortizationSchedule(loanAmount, interestRate, monthlyPayment, loanStartDate, totalMonths);

  return schedule.filter((row) => yearOf(row.date) === year).reduce((sum, row) => sum + row.interest, 0);
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test amortizationCalculator`
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/amortizationCalculator.ts web/tests/calculations/amortizationCalculator.test.ts
git commit -m "feat(calculations): add amortizationCalculator with exact interest-for-calendar-year"
```

---

## Task 7: depreciationCalculator.ts (TDD)

**Files:**
- Create: `web/lib/calculations/depreciationCalculator.ts`
- Create: `web/tests/calculations/depreciationCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/depreciationCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import {
  afaBasis,
  depreciationYearly,
  depreciationMonthly,
  depreciationProratedInAcquisitionYear,
} from '@/lib/calculations/depreciationCalculator';

describe('depreciationCalculator', () => {
  it('afaBasis: building + closing-cost share + eligible renovation', () => {
    const result = afaBasis(f.buildingValue, f.closingCostsTotal, f.purchasePrice, f.renovationAfaEligible);
    expect(result).toBeCloseTo(f.afaBasis, 0);
  });

  it('afaBasis: zero building value (Grundstück ohne Gebäude) is zero', () => {
    expect(afaBasis(0, 20_000, 100_000, 0)).toBeCloseTo(0, 2);
  });

  it('afaBasis: with renovation share', () => {
    // buildingShare = 200000/250000 = 0.8; afaBasis = 200000 + (10000*0.8) + 15000 = 223000
    expect(afaBasis(200_000, 10_000, 250_000, 15_000)).toBeCloseTo(223_000, 1);
  });

  it('depreciationYearly', () => {
    expect(depreciationYearly(f.afaBasis, f.depreciationRate)).toBeCloseTo(f.depreciationYearly, 0);
  });

  it('depreciationMonthly', () => {
    expect(depreciationMonthly(f.afaBasis, f.depreciationRate)).toBeCloseTo(f.depreciationMonthly, 0);
  });

  it('depreciationProratedInAcquisitionYear: February transfer (11 months remaining)', () => {
    // 9387.95 / 12 * 11 = 8605.62
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, f.economicTransferDate);
    expect(result).toBeCloseTo(8_605.62, 0);
  });

  it('depreciationProratedInAcquisitionYear: January transfer equals full year', () => {
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, makeDate(2026, 1, 1));
    expect(result).toBeCloseTo(f.depreciationYearly, 0);
  });

  it('depreciationProratedInAcquisitionYear: December transfer equals one month', () => {
    const result = depreciationProratedInAcquisitionYear(f.afaBasis, f.depreciationRate, makeDate(2026, 12, 1));
    expect(result).toBeCloseTo(f.depreciationMonthly, 0);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test depreciationCalculator`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/depreciationCalculator.ts`**

```typescript
import { monthOf } from './dateHelpers';

/**
 * AfA-Basis = Gebäudewert + (Nebenkosten × Gebäudeanteil) + aktivierungspflichtige Renovierung.
 * buildingValue and landValue come from the government valuation spreadsheet (Sachwertverfahren);
 * the building-share ratio is derived from them, never the other way around.
 */
export function afaBasis(
  buildingValue: number,
  closingCostsTotal: number,
  purchasePrice: number,
  renovationAfaEligible: number
): number {
  if (purchasePrice <= 0) return 0;
  const buildingShareRatio = buildingValue / purchasePrice;
  return buildingValue + closingCostsTotal * buildingShareRatio + renovationAfaEligible;
}

export function depreciationYearly(basis: number, rate: number): number {
  return basis * rate;
}

export function depreciationMonthly(basis: number, rate: number): number {
  return depreciationYearly(basis, rate) / 12;
}

/**
 * AfA in the acquisition year: prorated from the first full month after
 * economicTransferDate (the month of transfer itself counts in full, per §7 EStG).
 */
export function depreciationProratedInAcquisitionYear(
  basis: number,
  rate: number,
  economicTransferDate: Date
): number {
  const monthsRemaining = 13 - monthOf(economicTransferDate); // e.g. Feb (2) -> 11 months (Feb-Dec)
  return depreciationMonthly(basis, rate) * monthsRemaining;
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test depreciationCalculator`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/depreciationCalculator.ts web/tests/calculations/depreciationCalculator.test.ts
git commit -m "feat(calculations): add depreciationCalculator (AfA-Basis, yearly/monthly/prorated AfA)"
```

---

## Task 8: statusPeriodCalculator.ts (TDD)

**Files:**
- Create: `web/lib/calculations/statusPeriodCalculator.ts`
- Create: `web/tests/calculations/statusPeriodCalculator.test.ts`

This is the day-level proration engine used by both `cashflowCalculator` and `taxCalculator` whenever a `StatusEntry` changes mid-month. Ported from `StatusPeriodCalculator.swift` (the validated version from the cashflow/tax redesign, not the simplified v1). The web model has only 3 statuses (`vermietet` | `leerstand` | `mietgarantie` — no `eigennutzung`/`renovierung`), which simplifies the switch in `incomeForMonth`.

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/statusPeriodCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  incomeForMonth,
  leerstandDayFraction,
  ownershipDayFraction,
} from '@/lib/calculations/statusPeriodCalculator';

function entry(status: StatusEntry['status'], y: number, m: number, d = 1, income: number | null = null): StatusEntry {
  return { date: makeDate(y, m, d), status, incomeActualMonthly: income };
}

describe('statusPeriodCalculator', () => {
  const today = makeDate(2026, 12, 1);

  it('incomeForMonth: fully vermietet', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    expect(result).toBeCloseTo(998.0, 2);
  });

  it('incomeForMonth: fully leerstand is zero', () => {
    const history = [entry('leerstand', 2026, 2)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    expect(result).toBeCloseTo(0, 2);
  });

  it('incomeForMonth: mietgarantie uses the entry income, not settings', () => {
    const history = [entry('mietgarantie', 2026, 2, 1, 999)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    expect(result).toBeCloseTo(999.0, 2);
  });

  it('incomeForMonth: mid-month transition leerstand -> vermietet (30-day month)', () => {
    const history = [entry('leerstand', 2026, 2), entry('vermietet', 2026, 6, 16)];
    const result = incomeForMonth(makeDate(2026, 6, 1), history, today, 950, 48);
    // vermietet 15/30 days: 998 * 15/30 = 499.00
    expect(result).toBeCloseTo(998.0 * (15 / 30), 2);
  });

  it('incomeForMonth: future month projects the last known status', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = incomeForMonth(makeDate(2026, 12, 1), history, makeDate(2026, 6, 1), 950, 48);
    expect(result).toBeCloseTo(998.0, 2);
  });

  it('leerstandDayFraction: half the month vacant', () => {
    const history = [entry('leerstand', 2026, 2), entry('vermietet', 2026, 6, 16)];
    const result = leerstandDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(15 / 30, 4);
  });

  it('leerstandDayFraction: fully vermietet is zero', () => {
    const history = [entry('vermietet', 2026, 2)];
    const result = leerstandDayFraction(makeDate(2026, 6, 1), history, today);
    expect(result).toBeCloseTo(0, 4);
  });

  it('ownershipDayFraction: acquisition mid-month (Feb 15, 28-day month)', () => {
    // 14 days owned out of 28 (Feb 15-28 inclusive)
    const result = ownershipDayFraction(makeDate(2026, 2, 1), makeDate(2026, 2, 15));
    expect(result).toBeCloseTo(14 / 28, 4);
  });

  it('ownershipDayFraction: full month after acquisition', () => {
    const result = ownershipDayFraction(makeDate(2026, 3, 1), makeDate(2026, 2, 1));
    expect(result).toBeCloseTo(1, 4);
  });

  it('ownershipDayFraction: month before acquisition is zero', () => {
    const result = ownershipDayFraction(makeDate(2026, 1, 1), makeDate(2026, 2, 1));
    expect(result).toBeCloseTo(0, 4);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test statusPeriodCalculator`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/statusPeriodCalculator.ts`**

```typescript
import { firstDayOfMonth, daysInMonth, dayOfMonth, yearOf, monthOf, makeDate } from './dateHelpers';

export type PropertyStatus = 'vermietet' | 'leerstand' | 'mietgarantie';

export interface StatusEntry {
  date: Date; // start date of this status
  status: PropertyStatus;
  incomeActualMonthly: number | null; // only populated for 'mietgarantie'
}

interface StatusSegment {
  status: PropertyStatus;
  incomeActualMonthly: number;
  dayFraction: number;
}

/**
 * Breaks a calendar month into StatusSegments based on status history.
 * Days after `today` within the current month are projected forward using
 * the last known status (so an in-progress month is part actual, part projection).
 */
function segments(month: Date, statusHistory: StatusEntry[], today: Date): StatusSegment[] {
  const totalDays = daysInMonth(month);
  const sorted = [...statusHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
  const monthStart = firstDayOfMonth(month);

  const transitionDays = new Set<number>([1]);
  for (const e of sorted) {
    if (firstDayOfMonth(e.date).getTime() === monthStart.getTime()) {
      const d = dayOfMonth(e.date);
      if (d > 1) transitionDays.add(d);
    }
  }
  if (firstDayOfMonth(today).getTime() === monthStart.getTime()) {
    const tomorrow = dayOfMonth(today) + 1;
    if (tomorrow <= totalDays) transitionDays.add(tomorrow);
  }

  const sortedTransitions = [...transitionDays].sort((a, b) => a - b);
  const result: StatusSegment[] = [];

  for (let i = 0; i < sortedTransitions.length; i++) {
    const startDay = sortedTransitions[i];
    const endDay = i + 1 < sortedTransitions.length ? sortedTransitions[i + 1] - 1 : totalDays;
    const days = endDay - startDay + 1;

    const segmentDate = makeDate(yearOf(month), monthOf(month), startDay);
    const lookupDate = segmentDate.getTime() <= today.getTime() ? segmentDate : today;

    const active = [...sorted].reverse().find((e) => e.date.getTime() <= lookupDate.getTime());

    result.push({
      status: active?.status ?? 'leerstand',
      incomeActualMonthly: active?.incomeActualMonthly ?? 0,
      dayFraction: days / totalDays,
    });
  }

  return result;
}

/** Monthly income from all status segments (day-accurate). */
export function incomeForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  coldRentMonthly: number,
  parkingRentMonthly: number
): number {
  return segments(month, statusHistory, today).reduce((sum, seg) => {
    if (seg.status === 'vermietet') return sum + (coldRentMonthly + parkingRentMonthly) * seg.dayFraction;
    if (seg.status === 'mietgarantie') return sum + seg.incomeActualMonthly * seg.dayFraction;
    return sum; // leerstand
  }, 0);
}

/** Sum of day-fractions in the month where the status is NOT vermietet. */
export function leerstandDayFraction(month: Date, statusHistory: StatusEntry[], today: Date): number {
  return segments(month, statusHistory, today)
    .filter((seg) => seg.status !== 'vermietet')
    .reduce((sum, seg) => sum + seg.dayFraction, 0);
}

/**
 * Fraction of the month owned: 0 before acquisition, 1 for full months,
 * partial for the acquisition month itself.
 */
export function ownershipDayFraction(month: Date, economicTransferDate: Date): number {
  const monthStart = firstDayOfMonth(month);
  const transferMonth = firstDayOfMonth(economicTransferDate);

  if (monthStart.getTime() < transferMonth.getTime()) return 0;
  if (monthStart.getTime() > transferMonth.getTime()) return 1;

  const totalDays = daysInMonth(month);
  const transferDay = dayOfMonth(economicTransferDate);
  const ownedDays = totalDays - transferDay + 1;
  return ownedDays / totalDays;
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test statusPeriodCalculator`
Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/statusPeriodCalculator.ts web/tests/calculations/statusPeriodCalculator.test.ts
git commit -m "feat(calculations): add statusPeriodCalculator with day-level status segmentation"
```

---

## Task 9: kpiCalculator.ts (TDD)

**Files:**
- Create: `web/lib/calculations/kpiCalculator.ts`
- Create: `web/tests/calculations/kpiCalculator.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/kpiCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import {
  grossYield,
  netYield,
  capRate,
  cashOnCashReturn,
  dscrNOI,
  mietmultiplikator,
  breakEvenRentMonthly,
  ltvRatio,
} from '@/lib/calculations/kpiCalculator';

describe('kpiCalculator', () => {
  it('grossYield', () => {
    const result = grossYield(f.coldRentYearly, f.parkingRentYearly, f.purchasePrice);
    expect(result).toBeCloseTo(0.04297, 4);
  });

  it('grossYield: zero purchase price returns null', () => {
    expect(grossYield(11_400, 576, 0)).toBeNull();
  });

  it('netYield', () => {
    const result = netYield(f.netOperatingIncomeYearly, f.totalInvestment);
    expect(result).toBeCloseTo(0.03114, 4);
  });

  it('netYield: zero investment returns null', () => {
    expect(netYield(9_303, 0)).toBeNull();
  });

  it('capRate', () => {
    const result = capRate(f.netOperatingIncomeYearly, f.purchasePrice);
    expect(result).toBeCloseTo(0.03339, 4);
  });

  it('cashOnCashReturn', () => {
    const result = cashOnCashReturn(f.cashflowAfterDebtYearly, f.equityUsed);
    expect(result).toBeCloseTo(-0.08163, 4);
  });

  it('cashOnCashReturn: zero equity returns null', () => {
    expect(cashOnCashReturn(-5_000, 0)).toBeNull();
  });

  it('dscrNOI', () => {
    const result = dscrNOI(f.netOperatingIncomeYearly, f.debtServiceAnnual);
    expect(result).toBeCloseTo(0.6238, 3);
  });

  it('dscrNOI: zero debt service returns null', () => {
    expect(dscrNOI(9_000, 0)).toBeNull();
  });

  it('mietmultiplikator', () => {
    const result = mietmultiplikator(f.purchasePrice, f.coldRentYearly, f.parkingRentYearly);
    expect(result).toBeCloseTo(23.26, 1);
  });

  it('mietmultiplikator: zero rent returns null', () => {
    expect(mietmultiplikator(278_600, 0, 0)).toBeNull();
  });

  it('breakEvenRentMonthly', () => {
    const result = breakEvenRentMonthly(f.operatingCostsNonRecoverableMonthly, f.monthlyMortgage);
    expect(result).toBeCloseTo(1_435.61, 1);
  });

  it('ltvRatio', () => {
    expect(ltvRatio(200_000, 300_000)).toBeCloseTo(0.6667, 3);
  });

  it('ltvRatio: zero investment returns null', () => {
    expect(ltvRatio(200_000, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test kpiCalculator`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/kpiCalculator.ts`**

```typescript
/** Bruttorendite = (Kaltmiete jährlich + Parkingmiete jährlich) / Kaufpreis */
export function grossYield(coldRentYearly: number, parkingRentYearly: number, purchasePrice: number): number | null {
  if (purchasePrice <= 0) return null;
  return (coldRentYearly + parkingRentYearly) / purchasePrice;
}

/** Nettorendite = NOI / Gesamtinvestment */
export function netYield(netOperatingIncomeYearly: number, totalInvestment: number): number | null {
  if (totalInvestment <= 0) return null;
  return netOperatingIncomeYearly / totalInvestment;
}

/** Cap Rate = NOI / Kaufpreis (ohne Nebenkosten) */
export function capRate(netOperatingIncomeYearly: number, purchasePrice: number): number | null {
  if (purchasePrice <= 0) return null;
  return netOperatingIncomeYearly / purchasePrice;
}

/** Cash-on-Cash Return = Cashflow nach Schuldendienst / eingesetztes EK */
export function cashOnCashReturn(cashflowAfterDebtYearly: number, equityUsed: number): number | null {
  if (equityUsed <= 0) return null;
  return cashflowAfterDebtYearly / equityUsed;
}

/** DSCR (NOI-basiert) = NOI / jährlicher Schuldendienst */
export function dscrNOI(netOperatingIncomeYearly: number, debtServiceAnnual: number): number | null {
  if (debtServiceAnnual <= 0) return null;
  return netOperatingIncomeYearly / debtServiceAnnual;
}

/** Mietmultiplikator = Kaufpreis / Jahreskaltmiete (inkl. Parking) */
export function mietmultiplikator(
  purchasePrice: number,
  coldRentYearly: number,
  parkingRentYearly: number
): number | null {
  const totalRent = coldRentYearly + parkingRentYearly;
  if (totalRent <= 0) return null;
  return purchasePrice / totalRent;
}

/** Break-Even-Miete = nicht-umlagefähige Kosten + Kreditrate */
export function breakEvenRentMonthly(operatingCostsNonRecoverableMonthly: number, monthlyMortgage: number): number {
  return operatingCostsNonRecoverableMonthly + monthlyMortgage;
}

/** LTV = Restschuld / Gesamtinvestment */
export function ltvRatio(remainingDebt: number, totalInvestment: number): number | null {
  if (totalInvestment <= 0) return null;
  return remainingDebt / totalInvestment;
}

/** Effektives Bruttoeinkommen = Bruttomiete * (1 - Leerstandsquote) */
export function effectiveGrossIncomeYearly(grossIncomeYearly: number, vacancyRate: number): number {
  return grossIncomeYearly * (1 - vacancyRate);
}

/** NOI = effektives Bruttoeinkommen - nicht-umlagefähige Kosten */
export function netOperatingIncomeYearly(
  effectiveGrossIncome: number,
  operatingCostsNonRecoverableYearly: number
): number {
  return effectiveGrossIncome - operatingCostsNonRecoverableYearly;
}

/** Eingesetztes Eigenkapital = Gesamtinvestment - Darlehen */
export function equityUsed(totalInvestment: number, loanAmount: number): number {
  return totalInvestment - loanAmount;
}

/** Gesamtinvestment = Kaufpreis + Kaufnebenkosten + Renovierung */
export function totalInvestment(
  purchasePrice: number,
  closingCostsTotal: number,
  renovationModernizationCosts: number
): number {
  return purchasePrice + closingCostsTotal + renovationModernizationCosts;
}

/** Kaufnebenkosten gesamt */
export function closingCostsTotal(
  landTransferTax: number,
  notaryCosts: number,
  landRegistryCosts: number,
  agentFee: number,
  appraisalCosts: number
): number {
  return landTransferTax + notaryCosts + landRegistryCosts + agentFee + appraisalCosts;
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test kpiCalculator`
Expected: all 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/kpiCalculator.ts web/tests/calculations/kpiCalculator.test.ts
git commit -m "feat(calculations): add kpiCalculator (yields, DSCR, LTV, cash-on-cash, break-even)"
```

---

## Task 10: cashflowCalculator.ts (TDD)

**Files:**
- Create: `web/lib/calculations/cashflowCalculator.ts`
- Create: `web/tests/calculations/cashflowCalculator.test.ts`

Ports `CashflowCalculator.swift`'s `cashflowBeforeTax` pseudocode exactly as specified in `docs/specs/spec-calculations.md` (§ CashflowCalculator), including the WE/TE (Wohnung/Stellplatz) split: parking (Stellplatz) HOA/Grundsteuer costs are always owner-borne regardless of status, while the unit's (Wohnung) recoverable HOA/Grundsteuer costs are only owner-borne on non-`vermietet` days (day-prorated via `statusPeriodCalculator`).

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/cashflowCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import {
  ownerBorneRecoverableWEForMonth,
  cashflowBeforeTax,
  cashflowAfterTax,
} from '@/lib/calculations/cashflowCalculator';

describe('cashflowCalculator', () => {
  const today = makeDate(2026, 12, 1);

  it('ownerBorneRecoverableWEForMonth: vermietet all month is zero', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'vermietet', incomeActualMonthly: null }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(0, 2);
  });

  it('ownerBorneRecoverableWEForMonth: leerstand all month is full recoverable + Grundsteuer', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'leerstand', incomeActualMonthly: null }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(f.operatingCostsRecoverableMonthly, 1);
  });

  it('ownerBorneRecoverableWEForMonth: mietgarantie all month is full recoverable + Grundsteuer', () => {
    const history: StatusEntry[] = [{ date: makeDate(2026, 2, 1), status: 'mietgarantie', incomeActualMonthly: 999 }];
    const result = ownerBorneRecoverableWEForMonth(makeDate(2026, 6, 1), history, today, f.hoaFeeRecoverableMonthly, f.propertyTaxAnnual);
    expect(result).toBeCloseTo(f.operatingCostsRecoverableMonthly, 1);
  });

  it('cashflowBeforeTax: vermietet, no parking', () => {
    // 950 - 1242.85 - 192.76 = -485.61
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 0,
    });
    expect(result).toBeCloseTo(-485.61, 1);
  });

  it('cashflowBeforeTax: leerstand, no parking', () => {
    // 0 - 1242.85 - 192.76 - 309.08 = -1744.69
    const result = cashflowBeforeTax({
      incomeActualMonthly: 0,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: f.operatingCostsRecoverableMonthly,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 0,
    });
    expect(result).toBeCloseTo(-1744.69, 1);
  });

  it('cashflowBeforeTax: with an extraordinary cost', () => {
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 0,
      hoaFeeParkingMaintenanceReserveMonthly: 0,
      hoaFeeParkingRecoverableMonthly: 0,
      propertyTaxParkingMonthly: 0,
      extraordinaryCostsThisMonth: 500,
    });
    expect(result).toBeCloseTo(-985.61, 1);
  });

  it('cashflowBeforeTax: parking costs are always owner-borne (vermietet unit, occupied parking)', () => {
    const result = cashflowBeforeTax({
      incomeActualMonthly: 950 + 48,
      monthlyMortgage: f.monthlyMortgage,
      operatingCostsNonRecoverableMonthly: f.operatingCostsNonRecoverableMonthly,
      ownerBorneRecoverableWEMonthly: 0,
      hoaFeeParkingNonRecoverableMonthly: 20,
      hoaFeeParkingMaintenanceReserveMonthly: 5,
      hoaFeeParkingRecoverableMonthly: 10,
      propertyTaxParkingMonthly: 3,
      extraordinaryCostsThisMonth: 0,
    });
    // -485.61 (base, now with parking rent 48 added to income) - 20 - 5 - 10 - 3
    expect(result).toBeCloseTo(950 + 48 - f.monthlyMortgage - f.operatingCostsNonRecoverableMonthly - 38, 1);
  });

  it('cashflowAfterTax adds the monthly tax effect', () => {
    const result = cashflowAfterTax(-485.61, f.taxEffectMonthly);
    expect(result).toBeCloseTo(-136.51, 1);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test cashflowCalculator`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/cashflowCalculator.ts`**

```typescript
import { leerstandDayFraction } from './statusPeriodCalculator';
import type { StatusEntry } from './statusPeriodCalculator';

/**
 * Recoverable Wohnung (unit) costs the owner bears for a given month, day-prorated:
 * 0 on days the property is vermietet (tenant pays via Nebenkostenabrechnung),
 * full hoaFeeRecoverable + propertyTax/12 on days it is leerstand/mietgarantie.
 */
export function ownerBorneRecoverableWEForMonth(
  month: Date,
  statusHistory: StatusEntry[],
  today: Date,
  hoaFeeRecoverableMonthly: number,
  propertyTaxAnnual: number
): number {
  const fraction = leerstandDayFraction(month, statusHistory, today);
  return (hoaFeeRecoverableMonthly + propertyTaxAnnual / 12) * fraction;
}

export interface CashflowBeforeTaxInput {
  incomeActualMonthly: number;
  monthlyMortgage: number;
  operatingCostsNonRecoverableMonthly: number; // WE: hoaNonRecoverable + maintenanceReserve + propertyManagement/12 + propertyInsurance/12 + otherCosts
  ownerBorneRecoverableWEMonthly: number; // from ownerBorneRecoverableWEForMonth
  hoaFeeParkingNonRecoverableMonthly: number; // TE — always owner-borne, only nonzero if parking exists
  hoaFeeParkingMaintenanceReserveMonthly: number;
  hoaFeeParkingRecoverableMonthly: number;
  propertyTaxParkingMonthly: number;
  extraordinaryCostsThisMonth: number;
}

/** Cashflow before tax for a single month. */
export function cashflowBeforeTax(input: CashflowBeforeTaxInput): number {
  return (
    input.incomeActualMonthly -
    input.monthlyMortgage -
    input.operatingCostsNonRecoverableMonthly -
    input.ownerBorneRecoverableWEMonthly -
    input.hoaFeeParkingNonRecoverableMonthly -
    input.hoaFeeParkingMaintenanceReserveMonthly -
    input.hoaFeeParkingRecoverableMonthly -
    input.propertyTaxParkingMonthly -
    input.extraordinaryCostsThisMonth
  );
}

/** Cashflow after tax = before tax + monthly tax effect (positive when the year is a loss). */
export function cashflowAfterTax(cashflowBeforeTaxValue: number, taxEffectMonthly: number): number {
  return cashflowBeforeTaxValue + taxEffectMonthly;
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test cashflowCalculator`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/calculations/cashflowCalculator.ts web/tests/calculations/cashflowCalculator.test.ts
git commit -m "feat(calculations): add cashflowCalculator with WE/TE recoverable-cost split"
```

---

## Task 11: taxCalculator.ts (TDD)

**Files:**
- Create: `web/lib/calculations/taxCalculator.ts`
- Create: `web/tests/calculations/taxCalculator.test.ts`

Ports `TaxCalculator.swift`'s `annualTaxableIncome` from the cashflow/tax redesign — the version with exact amortizing interest (`interestForCalendarYear`) and day-level status/ownership proration, not the simplified first draft. Expected values below come straight from that plan's worked example (Feb 1 2026 acquisition, loan start Oct 2025).

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/calculations/taxCalculator.test.ts
import { describe, it, expect } from 'vitest';
import { fixtures as f } from './fixtures';
import { makeDate } from '@/lib/calculations/dateHelpers';
import { interestForCalendarYear } from '@/lib/calculations/amortizationCalculator';
import type { StatusEntry } from '@/lib/calculations/statusPeriodCalculator';
import { annualTaxableIncome, taxEffectYearly, taxEffectMonthly } from '@/lib/calculations/taxCalculator';

const baseInput = {
  economicTransferDate: f.economicTransferDate,
  loanStartDate: f.loanStartDate,
  loanAmount: f.loanAmount,
  interestRate: f.interestRate,
  monthlyMortgage: f.monthlyMortgage,
  afaBasis: f.afaBasis,
  depreciationRate: f.depreciationRate,
  hoaUnitNonRecoverableMonthly: 125.0,
  hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
  hoaParkingNonRecoverableMonthly: 0,
  hoaParkingRecoverableMonthly: 0,
  propertyTaxUnitMonthly: f.propertyTaxMonthly,
  propertyTaxParkingMonthly: 0,
  propertyManagementMonthly: f.propertyManagementMonthly,
  otherCostsMonthly: 0,
  coldRentMonthly: f.coldRentMonthly,
  parkingRentMonthly: f.parkingRentMonthly,
};

describe('taxCalculator.annualTaxableIncome', () => {
  it('all vermietet, acquisition year (2026)', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'vermietet', incomeActualMonthly: null }];
    const result = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
    });
    expect(result).toBeCloseTo(-9100.44, 0);
  });

  it('all leerstand, acquisition year (2026)', () => {
    const history: StatusEntry[] = [{ date: f.economicTransferDate, status: 'leerstand', incomeActualMonthly: null }];
    const result = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
    });
    expect(result).toBeCloseTo(-23478.36, 0);
  });

  it('mixed: leerstand Feb, vermietet Mar-Dec (2026)', () => {
    const history: StatusEntry[] = [
      { date: f.economicTransferDate, status: 'leerstand', incomeActualMonthly: null },
      { date: makeDate(2026, 3, 1), status: 'vermietet', incomeActualMonthly: null },
    ];
    const result = annualTaxableIncome({
      ...baseInput,
      year: 2026,
      statusHistory: history,
      today: makeDate(2026, 12, 31),
    });
    expect(result).toBeCloseTo(-10407.52, 0);
  });

  it('full year, no acquisition-year proration (2027)', () => {
    const history: StatusEntry[] = [{ date: makeDate(2027, 1, 1), status: 'vermietet', incomeActualMonthly: null }];
    const interest2027 = interestForCalendarYear(2027, f.loanStartDate, f.loanAmount, f.interestRate, f.monthlyMortgage);
    const afa2027 = f.afaBasis * f.depreciationRate;
    const income2027 = (f.coldRentMonthly + f.parkingRentMonthly) * 12;
    const expected = income2027 - interest2027 - afa2027 - (125.0 + f.propertyManagementMonthly) * 12;

    const result = annualTaxableIncome({
      ...baseInput,
      year: 2027,
      statusHistory: history,
      today: makeDate(2027, 12, 31),
    });
    expect(result).toBeCloseTo(expected, 0);
  });
});

describe('taxCalculator.taxEffectYearly / taxEffectMonthly', () => {
  it('negative taxable income produces a positive (refund) effect', () => {
    expect(taxEffectYearly(-9100.44, 0.42)).toBeGreaterThan(0);
  });

  it('taxEffectYearly value', () => {
    expect(taxEffectYearly(-9100.44, 0.42)).toBeCloseTo(3822.18, 1);
  });

  it('taxEffectMonthly divides by ownership months, not always 12', () => {
    const yearly = taxEffectYearly(-9100.44, 0.42);
    expect(taxEffectMonthly(yearly, 11)).toBeCloseTo(yearly / 11, 2);
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test taxCalculator`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/calculations/taxCalculator.ts`**

```typescript
import { makeDate } from './dateHelpers';
import { interestForCalendarYear } from './amortizationCalculator';
import { ownershipDayFraction, leerstandDayFraction, incomeForMonth } from './statusPeriodCalculator';
import type { StatusEntry } from './statusPeriodCalculator';

export interface AnnualTaxableIncomeInput {
  year: number;
  statusHistory: StatusEntry[];
  economicTransferDate: Date;
  loanStartDate: Date;
  loanAmount: number;
  interestRate: number;
  monthlyMortgage: number;
  afaBasis: number;
  depreciationRate: number;
  hoaUnitNonRecoverableMonthly: number;
  hoaUnitRecoverableMonthly: number;
  hoaParkingNonRecoverableMonthly: number;
  hoaParkingRecoverableMonthly: number; // Stellplatz recoverable — always owner-borne
  propertyTaxUnitMonthly: number;
  propertyTaxParkingMonthly: number; // Stellplatz Grundsteuer — always owner-borne
  propertyManagementMonthly: number;
  otherCostsMonthly: number;
  coldRentMonthly: number;
  parkingRentMonthly: number;
  today: Date;
}

/**
 * Full annual taxable income for V+V (§21 EStG). Handles acquisition-year
 * proration, exact amortizing interest, and day-level status/ownership splits.
 */
export function annualTaxableIncome(input: AnnualTaxableIncomeInput): number {
  const isAcquisitionYear = input.year === input.economicTransferDate.getUTCFullYear();

  const ownershipMonths: Date[] = [];
  for (let month = 1; month <= 12; month++) {
    const d = makeDate(input.year, month, 1);
    if (ownershipDayFraction(d, input.economicTransferDate) > 0) {
      ownershipMonths.push(d);
    }
  }
  if (ownershipMonths.length === 0) return 0;

  const interestYear = interestForCalendarYear(
    input.year,
    input.loanStartDate,
    input.loanAmount,
    input.interestRate,
    input.monthlyMortgage
  );

  const afaYear = isAcquisitionYear
    ? (input.afaBasis * input.depreciationRate / 12) * ownershipMonths.length
    : input.afaBasis * input.depreciationRate;

  let totalIncome = 0;
  let ownershipMonthEquivalent = 0;
  let leerstandEquivalentMonths = 0;

  for (const month of ownershipMonths) {
    const ownerFraction = ownershipDayFraction(month, input.economicTransferDate);
    ownershipMonthEquivalent += ownerFraction;

    const leerstandFraction = leerstandDayFraction(month, input.statusHistory, input.today);
    leerstandEquivalentMonths += ownerFraction * leerstandFraction;

    totalIncome +=
      incomeForMonth(month, input.statusHistory, input.today, input.coldRentMonthly, input.parkingRentMonthly) *
      ownerFraction;
  }

  const alwaysDeductions =
    (input.hoaUnitNonRecoverableMonthly +
      input.hoaParkingNonRecoverableMonthly +
      input.hoaParkingRecoverableMonthly +
      input.propertyTaxParkingMonthly +
      input.propertyManagementMonthly +
      input.otherCostsMonthly) *
    ownershipMonthEquivalent;

  const leerstandDeductions = (input.hoaUnitRecoverableMonthly + input.propertyTaxUnitMonthly) * leerstandEquivalentMonths;

  return totalIncome - interestYear - afaYear - alwaysDeductions - leerstandDeductions;
}

/** Jährlicher Steuereffekt: negatives Ergebnis (Verlust) × Grenzsteuersatz = Erstattung. */
export function taxEffectYearly(taxableIncomeVV: number, marginalTaxRate: number): number {
  return taxableIncomeVV * marginalTaxRate * -1;
}

/** Monatlicher Steuereffekt = jährlicher Effekt ÷ Eigentumsmonate im Jahr (not always 12). */
export function taxEffectMonthly(taxEffectYearlyValue: number, ownershipMonths: number): number {
  if (ownershipMonths <= 0) return 0;
  return taxEffectYearlyValue / ownershipMonths;
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test taxCalculator`
Expected: all 7 tests pass.

- [ ] **Step 5: Run the full calculations suite once to check for regressions**

Run: `cd web && pnpm test`
Expected: all test files pass (dateHelpers, statusPeriodCalculator, amortizationCalculator, depreciationCalculator, kpiCalculator, cashflowCalculator, taxCalculator).

- [ ] **Step 6: Commit**

```bash
git add web/lib/calculations/taxCalculator.ts web/tests/calculations/taxCalculator.test.ts
git commit -m "feat(calculations): add taxCalculator with day-level V+V proration"
```

---

## Task 12: formatters.ts

**Files:**
- Create: `web/lib/formatters.ts`
- Create: `web/tests/formatters.test.ts`

Per `CLAUDEvolta.md` § Konventionen: all currency/percent display must go through these wrappers — never `.toFixed()` or manual string concatenation in components.

- [ ] **Step 1: Write the failing tests**

```typescript
// web/tests/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';

describe('formatters', () => {
  it('formatCurrency formats EUR with de-DE grouping', () => {
    expect(formatCurrency(1242.85)).toBe('1.242,85 €');
  });

  it('formatCurrency handles negative values', () => {
    expect(formatCurrency(-485.61)).toBe('-485,61 €');
  });

  it('formatPercent converts a decimal fraction to a percent string', () => {
    expect(formatPercent(0.04297)).toBe('4,3 %');
  });

  it('formatDate formats as de-DE short date', () => {
    expect(formatDate(new Date(Date.UTC(2026, 1, 1)))).toBe('01.02.2026');
  });
});
```

- [ ] **Step 2: Run to confirm FAIL**

Run: `cd web && pnpm test formatters`
Expected: fails — module doesn't exist.

- [ ] **Step 3: Implement `web/lib/formatters.ts`**

```typescript
const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC' });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** `value` is a decimal fraction (0.042 = 4.2%), not a whole percent number. */
export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}
```

- [ ] **Step 4: Run to confirm PASS**

Run: `cd web && pnpm test formatters`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add web/lib/formatters.ts web/tests/formatters.test.ts
git commit -m "feat: add de-DE currency/percent/date formatters"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** `spec-data-model.md` (schema/enums) → Task 1. `spec-calculations.md` AfA-Basis/Bruttorendite/Zinsen-Tilgung/Restschuld → Tasks 6–7, 9. Tagesgenaue Proration + Laufendes-Jahr-Hybrid → Task 8. TaxCalculator formula → Task 11. CashflowCalculator formula (incl. WE/TE split) → Task 10. Konventionen (Formatters, snake_case↔camelCase via generated types) → Tasks 2, 12. Auth (Magic Link) from `CLAUDEvolta.md` tech stack table → Task 3.
- [ ] **Not covered here (deliberately, belongs to later plans):** Portfolio/Sidebar shell, Property Setup wizard, per-tab UI (Übersicht/Cashflow/Steuer/Finanzierung/Verlauf/Immobiliendaten), Investment Calculator, PropertyPhoto storage upload flow, prognose/Vollvermietung-vs-Leerstand toggle UI.
- [ ] **Placeholder scan:** no TBD/TODO left in any step; every step has runnable code.
- [ ] **Type consistency:** `StatusEntry.status` is `'vermietet' | 'leerstand' | 'mietgarantie'` consistently across `statusPeriodCalculator.ts`, `cashflowCalculator.ts` (via re-export), and `taxCalculator.ts` (via import) — no drift from the old 5-value Swift enum.
