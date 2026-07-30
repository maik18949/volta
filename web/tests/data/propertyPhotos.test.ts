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
