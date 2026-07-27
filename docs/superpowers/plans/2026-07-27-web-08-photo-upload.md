# Volta Web — Plan 8: Photo Upload & Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the "Fotos" section of the Immobiliendaten tab (per `docs/specs/spec-immobiliendaten-tab.md:75-84`) — a 3-column thumbnail grid with upload, cover-photo selection, and delete — and use each property's cover photo (or first photo, or a type-based placeholder) as the header image on the Übersicht tab (`docs/specs/spec-overview-tab.md:37-56`) and the thumbnail on the Portfolio card and Hauptscreen (`docs/specs/spec-hauptscreen.md:78`). The `property_photos` table already exists (Plan 1) with zero application code — this plan builds all of it: Supabase Storage bucket + RLS, upload/delete/set-cover server actions, and the three display call sites.

**Architecture:** A new private Supabase Storage bucket `property-photos` stores the actual image bytes at `<property_id>/<uuid>.<ext>`; `property_photos` rows (already migrated) track `file_path`, `is_cover_photo`, `sort_order` per property. Storage RLS mirrors the existing `property_photos` table policy exactly: an object is only readable/writable by the property's owner, checked via `storage.foldername(name)[1]` (the `<property_id>` path segment) against `properties.user_id`. Because the bucket is private, every display path needs a signed URL — `lib/data/propertyPhotos.ts` fetches rows and resolves signed URLs server-side in one place, so `getPropertyDetail` (property detail pages) and `getPropertiesWithSummaries` (portfolio grid) both get ready-to-render `{ row, url }` pairs, never a raw client fetch of a private object. Upload uses a plain file `<input>` with an `onChange` handler that builds a `FormData` and calls a `'use server'` action directly (no `<form>` needed) — matches how the rest of the codebase already does mutations, and keeps the max-15-photos and image-only validation server-side where it can't be bypassed by devtools.

**Tech Stack:** Next.js App Router (RSC + Client Components), Supabase Storage + Postgres RLS, Tailwind, lucide-react (property-type placeholder icons — `building-2`, `home`, `building`, `store`, `land-plot`, `help-circle`, all confirmed present in `node_modules/lucide-react`).

**Depends on:** Plan 1 (`property_photos` table, `properties` table), Plan 6 (`PropertyEditForm.tsx` section-nav shell, `GefahrenzoneSection.tsx` as the pattern for a standalone Immobiliendaten section).

**Not covered here:** Reordering photos by drag-and-drop (spec doesn't ask for it — `sort_order` is set once at upload time and never changed except implicitly). Image resizing/compression before upload (Supabase Storage stores the original file as-is; out of scope).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `web/supabase/migrations/<timestamp>_property_photos_storage.sql` | Create | Storage bucket + RLS policies on `storage.objects` |
| `web/lib/data/propertyPhotos.ts` | Create | `getPropertyPhotosWithUrls`, `getCoverPhotoUrl` (signed URLs) |
| `web/lib/data/propertyPhotoActions.ts` | Create | `uploadPropertyPhoto`, `deletePropertyPhoto`, `setCoverPhoto` server actions |
| `web/lib/data/propertyDetail.ts` | Modify | Fetch `property_photos` alongside status/cost history |
| `web/lib/data/properties.ts` | Modify | Attach cover photo URL to each portfolio item |
| `web/components/property/immobiliendaten/FotosSection.tsx` | Create | 3-column grid, upload button, cover/delete actions |
| `web/components/property/immobiliendaten/PropertyEditForm.tsx` | Modify | Add "Fotos" to `SECTIONS`, render `FotosSection` |
| `web/components/property/PropertyHeaderPhoto.tsx` | Create | Übersicht tab full-width header (photo or placeholder) |
| `web/components/property/PropertyThumbnail.tsx` | Create | Shared small thumbnail (photo or placeholder) used by `PropertyCard` |
| `web/components/property/PropertyCard.tsx` | Modify | Replace the static gradient div with `PropertyThumbnail` |
| `web/app/(app)/properties/[id]/page.tsx` | Modify | Replace the static gradient div with `PropertyHeaderPhoto` |
| `web/app/(app)/properties/[id]/immobiliendaten/page.tsx` | Modify | Pass photos-with-urls into `PropertyEditForm` |
| `web/tests/data/propertyPhotos.test.ts` | Create | Unit tests for the pure cover-resolution helper |

---

### Task 1: Storage bucket + RLS migration

**Files:**
- Create: `web/supabase/migrations/20260727130000_property_photos_storage.sql`

- [ ] **Step 1: Write the migration**

```sql
-- web/supabase/migrations/20260727130000_property_photos_storage.sql

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do nothing;

-- Path convention: <property_id>/<uuid>.<ext> — storage.foldername(name) splits on '/'
-- and returns an array of path segments, so [1] is the property_id folder.
create policy "property_photos_storage_select" on storage.objects for select using (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] in (select id::text from properties where user_id = (select auth.uid()))
);

create policy "property_photos_storage_insert" on storage.objects for insert with check (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] in (select id::text from properties where user_id = (select auth.uid()))
);

create policy "property_photos_storage_delete" on storage.objects for delete using (
  bucket_id = 'property-photos'
  and (storage.foldername(name))[1] in (select id::text from properties where user_id = (select auth.uid()))
);
```

- [ ] **Step 2: Apply the migration**

Run: `cd web && supabase db push`
Expected: `Applying migration 20260727130000_property_photos_storage.sql...` then success.

- [ ] **Step 3: Verify the bucket exists**

Run: `cd web && supabase db diff` (or check the Supabase dashboard → Storage → a private `property-photos` bucket should be listed)
Expected: no pending diff.

- [ ] **Step 4: Commit**

```bash
git add web/supabase/migrations/20260727130000_property_photos_storage.sql
git commit -m "feat(db): create property-photos storage bucket and RLS policies"
```

---

### Task 2: `getPropertyPhotosWithUrls` and cover-resolution logic

**Files:**
- Create: `web/lib/data/propertyPhotos.ts`
- Test: `web/tests/data/propertyPhotos.test.ts`

- [ ] **Step 1: Write the failing test**

This isolates the one pure piece of logic (which photo counts as "cover") from the Supabase signed-URL I/O, so it's unit-testable without a live project.

```typescript
// web/tests/data/propertyPhotos.test.ts
import { describe, it, expect } from 'vitest';
import { resolveCoverPhoto } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PhotoRow = Database['public']['Tables']['property_photos']['Row'];

function photo(overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id: 'photo-1',
    property_id: 'prop-1',
    file_path: 'prop-1/a.jpg',
    is_cover_photo: false,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('resolveCoverPhoto', () => {
  it('returns null for an empty photo list', () => {
    expect(resolveCoverPhoto([])).toBeNull();
  });

  it('returns the photo marked is_cover_photo, even if not first by sort_order', () => {
    const photos = [photo({ id: 'a', sort_order: 0 }), photo({ id: 'b', sort_order: 1, is_cover_photo: true })];
    expect(resolveCoverPhoto(photos)?.id).toBe('b');
  });

  it('falls back to the lowest sort_order photo when none is marked cover', () => {
    const photos = [photo({ id: 'a', sort_order: 2 }), photo({ id: 'b', sort_order: 1 })];
    expect(resolveCoverPhoto(photos)?.id).toBe('b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run tests/data/propertyPhotos.test.ts`
Expected: FAIL — `resolveCoverPhoto` is not exported from `@/lib/data/propertyPhotos`.

- [ ] **Step 3: Implement**

```typescript
// web/lib/data/propertyPhotos.ts
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type PropertyPhotoRow = Database['public']['Tables']['property_photos']['Row'];

export interface PropertyPhotoWithUrl {
  photo: PropertyPhotoRow;
  url: string;
}

const SIGNED_URL_TTL_SECONDS = 3600;
const STORAGE_BUCKET = 'property-photos';

/** Per spec-overview-tab.md: cover photo, else first by sort_order, else null. Pure — no I/O. */
export function resolveCoverPhoto(photos: PropertyPhotoRow[]): PropertyPhotoRow | null {
  if (photos.length === 0) return null;
  const cover = photos.find((p) => p.is_cover_photo);
  if (cover) return cover;
  return [...photos].sort((a, b) => a.sort_order - b.sort_order)[0];
}

/** Fetches every photo row for a property plus a signed URL for each, sorted by sort_order. */
export async function getPropertyPhotosWithUrls(propertyId: string): Promise<PropertyPhotoWithUrl[]> {
  const supabase = await createClient();
  const { data: photos, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  if (!photos || photos.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(
      photos.map((p) => p.file_path),
      SIGNED_URL_TTL_SECONDS
    );
  if (signError) throw signError;

  return photos.map((photo, i) => ({ photo, url: signed[i]?.signedUrl ?? '' }));
}

/** Cover photo URL only, for list/header contexts that don't need the full gallery. */
export async function getCoverPhotoUrl(propertyId: string): Promise<string | null> {
  const photos = await getPropertyPhotosWithUrls(propertyId);
  const cover = resolveCoverPhoto(photos.map((p) => p.photo));
  if (!cover) return null;
  return photos.find((p) => p.photo.id === cover.id)?.url ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run tests/data/propertyPhotos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/data/propertyPhotos.ts web/tests/data/propertyPhotos.test.ts
git commit -m "feat(photos): add getPropertyPhotosWithUrls and resolveCoverPhoto"
```

---

### Task 3: Upload / delete / set-cover server actions

**Files:**
- Create: `web/lib/data/propertyPhotoActions.ts`

- [ ] **Step 1: Implement**

```typescript
// web/lib/data/propertyPhotoActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STORAGE_BUCKET = 'property-photos';
const MAX_PHOTOS_PER_PROPERTY = 15;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export async function uploadPropertyPhoto(propertyId: string, formData: FormData): Promise<void> {
  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('Keine Datei übergeben.');
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new Error('Nur JPEG, PNG, WebP oder HEIC erlaubt.');

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from('property_photos')
    .select('id', { count: 'exact', head: true })
    .eq('property_id', propertyId);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_PHOTOS_PER_PROPERTY) throw new Error(`Maximal ${MAX_PHOTOS_PER_PROPERTY} Fotos pro Immobilie.`);

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const filePath = `${propertyId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
    contentType: file.type,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from('property_photos').insert({
    property_id: propertyId,
    file_path: filePath,
    is_cover_photo: (count ?? 0) === 0, // first photo uploaded becomes the cover automatically
    sort_order: count ?? 0,
  });
  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
    throw insertError;
  }

  revalidatePath(`/properties/${propertyId}`, 'layout');
  revalidatePath('/');
}

export async function deletePropertyPhoto(propertyId: string, photoId: string, filePath: string): Promise<void> {
  const supabase = await createClient();

  const { error: deleteRowError } = await supabase.from('property_photos').delete().eq('id', photoId);
  if (deleteRowError) throw deleteRowError;

  const { error: deleteObjectError } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
  if (deleteObjectError) throw deleteObjectError;

  revalidatePath(`/properties/${propertyId}`, 'layout');
  revalidatePath('/');
}

export async function setCoverPhoto(propertyId: string, photoId: string): Promise<void> {
  const supabase = await createClient();

  const { error: clearError } = await supabase
    .from('property_photos')
    .update({ is_cover_photo: false })
    .eq('property_id', propertyId);
  if (clearError) throw clearError;

  const { error: setError } = await supabase.from('property_photos').update({ is_cover_photo: true }).eq('id', photoId);
  if (setError) throw setError;

  revalidatePath(`/properties/${propertyId}`, 'layout');
  revalidatePath('/');
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/data/propertyPhotoActions.ts
git commit -m "feat(photos): add upload, delete, and set-cover server actions"
```

---

### Task 4: `FotosSection` and wiring into `PropertyEditForm`

**Files:**
- Create: `web/components/property/immobiliendaten/FotosSection.tsx`
- Modify: `web/components/property/immobiliendaten/PropertyEditForm.tsx`
- Modify: `web/lib/data/propertyDetail.ts`
- Modify: `web/app/(app)/properties/[id]/immobiliendaten/page.tsx`

- [ ] **Step 1: Implement `FotosSection.tsx`**

```tsx
// web/components/property/immobiliendaten/FotosSection.tsx
'use client';

import { useRef, useState, useTransition } from 'react';
import { Star, Trash2, Plus } from 'lucide-react';
import { uploadPropertyPhoto, deletePropertyPhoto, setCoverPhoto } from '@/lib/data/propertyPhotoActions';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

const MAX_PHOTOS = 15;

export function FotosSection({ propertyId, photos }: { propertyId: string; photos: PropertyPhotoWithUrl[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set('file', file);
    startTransition(async () => {
      try {
        await uploadPropertyPhoto(propertyId, formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.');
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-text-secondary">Fotos</p>

      {photos.length === 0 && <p className="text-sm text-text-dim">Noch keine Fotos hinzugefügt.</p>}

      <div className="grid grid-cols-3 gap-3">
        {photos.map(({ photo, url }) => (
          <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-black/[0.04]">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URLs, not a static asset */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            {photo.is_cover_photo && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 p-1">
                <Star size={12} className="fill-amber-400 text-amber-400" />
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              {!photo.is_cover_photo && (
                <button
                  type="button"
                  title="Titelbild setzen"
                  onClick={() => startTransition(() => setCoverPhoto(propertyId, photo.id))}
                  className="rounded-full bg-white/90 p-2"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                title="Löschen"
                onClick={() => {
                  if (confirm('Foto löschen?')) startTransition(() => deletePropertyPhoto(propertyId, photo.id, photo.file_path));
                }}
                className="rounded-full bg-white/90 p-2"
              >
                <Trash2 size={14} className="text-negative" />
              </button>
            </div>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/20 text-text-dim disabled:opacity-40"
          >
            <Plus size={20} />
            <span className="text-xs">Foto hinzufügen</span>
          </button>
        )}
      </div>

      <p className="text-xs text-text-dim">
        {photos.length}/{MAX_PHOTOS} Fotos
      </p>
      {error && <p className="text-xs text-negative">{error}</p>}

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
```

- [ ] **Step 2: Extend `getPropertyDetail` to include photos**

Read `web/lib/data/propertyDetail.ts` first (already shown in this repo — fetches `properties`, `status_entries`, `extraordinary_costs` in one `Promise.all`). Add `property_photos` as a fourth parallel query and a fourth field on `PropertyDetailData`:

```typescript
// web/lib/data/propertyDetail.ts
// Add to imports:
import { getPropertyPhotosWithUrls, type PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

// Add to PropertyDetailData interface:
export interface PropertyDetailData {
  property: PropertyRow;
  statusEntries: StatusEntryRow[];
  extraordinaryCosts: ExtraordinaryCostRow[];
  photos: PropertyPhotoWithUrl[];
}

// Inside getPropertyDetail, after the existing Promise.all for statusEntries/extraordinaryCosts,
// add a third parallel fetch and include it in the returned object:
const photos = await getPropertyPhotosWithUrls(propertyId);

// ...and add `photos` to the final `return { property, statusEntries: statusEntries ?? [], extraordinaryCosts: extraordinaryCosts ?? [], photos };`
```

- [ ] **Step 3: Add "Fotos" to `PropertyEditForm.tsx`'s section nav**

In `web/components/property/immobiliendaten/PropertyEditForm.tsx`:

```typescript
// Add to imports:
import { FotosSection } from './FotosSection';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

// Add 'fotos' right after 'objektdaten' in the SECTIONS array:
const SECTIONS = [
  { key: 'stammdaten', label: 'Stammdaten' },
  { key: 'objektdaten', label: 'Objektdaten' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'kauf', label: 'Kauf' },
  { key: 'einnahmen', label: 'Einnahmen' },
  { key: 'annahmen', label: 'Annahmen' },
  { key: 'kosten', label: 'Kosten' },
  { key: 'finanzierung', label: 'Finanzierung' },
  { key: 'afaSteuer', label: 'AfA & Steuer' },
  { key: 'gefahrenzone', label: 'Gefahrenzone' },
] as const;

// Add `photos` to the component's props:
export function PropertyEditForm({
  propertyId,
  property,
  photos,
}: {
  propertyId: string;
  property: PropertyRow;
  photos: PropertyPhotoWithUrl[];
}) {

// Add the section render branch, right after the objektdaten branch:
{activeSection === 'fotos' && <FotosSection propertyId={propertyId} photos={photos} />}
```

- [ ] **Step 4: Pass photos through from the Immobiliendaten page**

```tsx
// web/app/(app)/properties/[id]/immobiliendaten/page.tsx
import { notFound } from 'next/navigation';
import { getPropertyDetail } from '@/lib/data/propertyDetail';
import { PropertyEditForm } from '@/components/property/immobiliendaten/PropertyEditForm';

export default async function ImmobiliendatenTabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  return <PropertyEditForm propertyId={id} property={detail.property} photos={detail.photos} />;
}
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd web && npm run build`
Expected: build succeeds, no TypeScript errors (every other caller of `getPropertyDetail` still compiles since `photos` is an additive field).

- [ ] **Step 6: Commit**

```bash
git add web/components/property/immobiliendaten/FotosSection.tsx web/components/property/immobiliendaten/PropertyEditForm.tsx web/lib/data/propertyDetail.ts "web/app/(app)/properties/[id]/immobiliendaten/page.tsx"
git commit -m "feat(photos): add FotosSection and wire it into the Immobiliendaten tab"
```

---

### Task 5: Cover photo on the Übersicht tab header

**Files:**
- Create: `web/components/property/PropertyHeaderPhoto.tsx`
- Modify: `web/app/(app)/properties/[id]/page.tsx`

- [ ] **Step 1: Implement `PropertyHeaderPhoto.tsx`**

```tsx
// web/components/property/PropertyHeaderPhoto.tsx
import { Building2, Home, Building, Store, LandPlot, HelpCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

const PLACEHOLDER_ICONS: Record<PropertyType, typeof Home> = {
  apartment: Building2,
  einfamilienhaus: Home,
  mehrfamilienhaus: Building,
  gewerbe: Store,
  grundstuck: LandPlot,
  sonstiges: HelpCircle,
};

export function PropertyHeaderPhoto({ coverPhotoUrl, propertyType }: { coverPhotoUrl: string | null; propertyType: PropertyType }) {
  if (coverPhotoUrl) {
    return (
      <div className="h-[200px] overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL */}
        <img src={coverPhotoUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const Icon = PLACEHOLDER_ICONS[propertyType];
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300">
      <Icon size={48} className="text-slate-400" />
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the Übersicht page**

In `web/app/(app)/properties/[id]/page.tsx`, replace the static placeholder div with the real component:

```tsx
// Add to imports:
import { PropertyHeaderPhoto } from '@/components/property/PropertyHeaderPhoto';
import { resolveCoverPhoto } from '@/lib/data/propertyPhotos';

// Replace this line:
// <div className="h-[200px] rounded-xl bg-gradient-to-br from-slate-200 to-slate-300" />
// with:
const cover = resolveCoverPhoto(detail.photos.map((p) => p.photo));
const coverUrl = cover ? detail.photos.find((p) => p.photo.id === cover.id)?.url ?? null : null;
// ...
<PropertyHeaderPhoto coverPhotoUrl={coverUrl} propertyType={detail.property.property_type} />
```

- [ ] **Step 3: Commit**

```bash
git add web/components/property/PropertyHeaderPhoto.tsx "web/app/(app)/properties/[id]/page.tsx"
git commit -m "feat(photos): show cover photo header on the Übersicht tab"
```

---

### Task 6: Cover photo thumbnail on the Portfolio card

**Files:**
- Create: `web/components/property/PropertyThumbnail.tsx`
- Modify: `web/components/property/PropertyCard.tsx`
- Modify: `web/lib/data/properties.ts`

- [ ] **Step 1: Implement `PropertyThumbnail.tsx`**

```tsx
// web/components/property/PropertyThumbnail.tsx
import { Building2, Home, Building, Store, LandPlot, HelpCircle } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

const PLACEHOLDER_ICONS: Record<PropertyType, typeof Home> = {
  apartment: Building2,
  einfamilienhaus: Home,
  mehrfamilienhaus: Building,
  gewerbe: Store,
  grundstuck: LandPlot,
  sonstiges: HelpCircle,
};

export function PropertyThumbnail({ coverPhotoUrl, propertyType }: { coverPhotoUrl: string | null; propertyType: PropertyType }) {
  if (coverPhotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
    return <img src={coverPhotoUrl} alt="" className="h-[160px] w-full object-cover" />;
  }

  const Icon = PLACEHOLDER_ICONS[propertyType];
  return (
    <div className="flex h-[160px] items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
      <Icon size={36} className="text-slate-400" />
    </div>
  );
}
```

- [ ] **Step 2: Extend `getPropertiesWithSummaries` with each property's cover photo URL**

In `web/lib/data/properties.ts`:

```typescript
// Add to imports:
import { resolveCoverPhoto } from '@/lib/data/propertyPhotos';

// Add coverPhotoUrl to the PropertyWithSummary interface:
export interface PropertyWithSummary {
  property: PropertyRow;
  summary: PropertySummary;
  coverPhotoUrl: string | null;
}

// Inside getPropertiesWithSummaries, after fetching `properties` and before the final
// `.map`, fetch every photo row across all properties in one query, sign the cover
// photo's URL per property, and thread it through the returned objects:

const { data: photoRows, error: photosError } = await supabase
  .from('property_photos')
  .select('*')
  .in('property_id', properties.map((p) => p.id));
if (photosError) throw photosError;

const coverPhotoByProperty = new Map<string, string>(); // property_id -> file_path
for (const property of properties) {
  const ownPhotos = (photoRows ?? []).filter((p) => p.property_id === property.id);
  const cover = resolveCoverPhoto(ownPhotos);
  if (cover) coverPhotoByProperty.set(property.id, cover.file_path);
}

const filePaths = [...coverPhotoByProperty.values()];
const signedUrlByPath = new Map<string, string>();
if (filePaths.length > 0) {
  const { data: signed, error: signError } = await supabase.storage.from('property-photos').createSignedUrls(filePaths, 3600);
  if (signError) throw signError;
  filePaths.forEach((path, i) => {
    if (signed[i]?.signedUrl) signedUrlByPath.set(path, signed[i].signedUrl);
  });
}

// Then in the final .map, add:
// coverPhotoUrl: coverPhotoByProperty.has(property.id) ? signedUrlByPath.get(coverPhotoByProperty.get(property.id)!) ?? null : null,
```

- [ ] **Step 3: Use it in `PropertyCard.tsx`**

Replace the static placeholder div in `web/components/property/PropertyCard.tsx`:

```tsx
// Add to imports:
import { PropertyThumbnail } from '@/components/property/PropertyThumbnail';

// Update the destructured props to include coverPhotoUrl:
export function PropertyCard({ property, summary, coverPhotoUrl }: PropertyWithSummary) {

// Replace this line:
// <div className="h-[160px] bg-gradient-to-br from-slate-200 to-slate-300" />
// with:
<PropertyThumbnail coverPhotoUrl={coverPhotoUrl} propertyType={property.property_type} />
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd web && npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add web/components/property/PropertyThumbnail.tsx web/components/property/PropertyCard.tsx web/lib/data/properties.ts
git commit -m "feat(photos): show cover photo thumbnail on the Portfolio card"
```

---

### Task 7: Full-suite verification and manual QA

**Files:** none (verification only)

- [ ] **Step 1: Run the full automated test suite**

Run: `cd web && npm test`
Expected: All test files PASS, no regressions.

- [ ] **Step 2: Run the linter and build**

Run: `cd web && npm run lint && npm run build`
Expected: No lint errors (the two `eslint-disable-next-line @next/next/no-img-element` comments are intentional — signed URLs are dynamic per-request and gain nothing from `next/image`'s static optimization), build succeeds.

- [ ] **Step 3: Manual walkthrough**

Run: `cd web && npm run dev`

On an existing property:

1. `/properties/[id]/immobiliendaten` → "Fotos" appears in the left nav. Click it → empty grid with only a dashed "+ Foto hinzufügen" tile, "0/15 Fotos".
2. Upload a JPEG → thumbnail appears, gets the ⭐ cover badge automatically (first photo).
3. Upload a second photo → no cover badge on it. Hover it → ⭐ ("Titelbild setzen") and 🗑 ("Löschen") buttons appear.
4. Click ⭐ on the second photo → cover badge moves to it; reload the page → the change persisted.
5. Click 🗑 on a photo → confirm dialog → confirm → photo disappears from the grid and from Storage.
6. Upload a non-image file via devtools-forced request, or just confirm the file picker's `accept` attribute blocks non-images at the OS level.
7. Upload 15 photos total → the "+ Foto hinzufügen" tile disappears, counter reads "15/15 Fotos"; attempting a 16th (e.g. via a second browser tab mid-upload) surfaces the server-side "Maximal 15 Fotos" error.
8. `/properties/[id]` (Übersicht) → the header shows the same cover photo, edge-to-edge, ~200px tall.
9. On the Portfolio page (`/`) → the property's card shows the same cover photo as its thumbnail.
10. On a property with zero photos → Übersicht header and Portfolio card both show the gradient placeholder with the correct property-type icon centered.
11. Delete every photo from a property that had one → both header and card fall back to the placeholder again.
12. Stop the dev server (`Ctrl+C`).

- [ ] **Step 4: Report results**

If anything in Step 3 doesn't match, fix it (with a matching test update where the mismatch is in `resolveCoverPhoto`) before considering this plan done.

---

## Self-Review Checklist

- [x] **Spec coverage:** 3-column square-thumbnail grid, "+ Foto hinzufügen", max 15 photos, first photo auto-cover, tap-to-set-cover / delete, empty-state placeholder (`spec-immobiliendaten-tab.md:75-84`). Übersicht header shows cover → first photo → placeholder-with-icon, edge-to-edge ~200px (`spec-overview-tab.md:37-56`). Hauptscreen/Portfolio card shows the same resolution order (`spec-hauptscreen.md:78`).
- [x] **No placeholders:** Every task has complete, runnable code; the two `getPropertyDetail`/`properties.ts` "Modify" steps show the exact snippet to add, anchored to code already read from the live files in this repo.
- [x] **Type consistency:** `PropertyPhotoWithUrl` (from `propertyPhotos.ts`) is the one shape threaded through `PropertyEditForm`, `FotosSection`, `propertyDetail.ts`, and `properties.ts`. `resolveCoverPhoto` takes `PropertyPhotoRow[]` (the raw DB row), used identically in `PropertyHeaderPhoto`'s call site and `properties.ts`'s per-property loop.
- [x] **RLS symmetry:** Storage policies use the exact same "property_id in (select id from properties where user_id = (select auth.uid()))" pattern as the existing `property_photos` table policy (`supabase/migrations/20260724120000_initial_schema.sql:144-146`) and the perf-optimized `(select auth.uid())` form (`20260724120200_optimize_rls_initplan.sql`) — no new RLS pattern introduced.
