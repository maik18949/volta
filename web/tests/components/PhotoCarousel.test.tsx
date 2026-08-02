// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PhotoCarousel } from '@/components/property/overview/PhotoCarousel';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

afterEach(cleanup);

function makePhoto(overrides: Partial<PropertyPhotoWithUrl['photo']> = {}): PropertyPhotoWithUrl {
  return {
    photo: {
      id: 'photo-1',
      property_id: 'prop-1',
      file_path: 'prop-1/photo-1.jpg',
      is_cover_photo: false,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00Z',
      ...overrides,
    },
    url: 'https://example.com/photo-1.jpg',
  };
}

describe('PhotoCarousel', () => {
  it('renders the placeholder icon and no counter badge when there are no photos', () => {
    const { container } = render(<PhotoCarousel photos={[]} propertyType="apartment" />);
    expect(container.querySelectorAll('img')).toHaveLength(0);
    expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
  });

  it('renders one image per photo, plus a counter badge and one dot per photo when there are 2+', () => {
    const photos = [makePhoto({ id: 'a', sort_order: 0 }), makePhoto({ id: 'b', sort_order: 1 }), makePhoto({ id: 'c', sort_order: 2 })];
    const { container } = render(<PhotoCarousel photos={photos} propertyType="apartment" />);
    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('starts the counter at the cover photo index, not always at 1', () => {
    const photos = [makePhoto({ id: 'a', sort_order: 0 }), makePhoto({ id: 'b', sort_order: 1, is_cover_photo: true })];
    render(<PhotoCarousel photos={photos} propertyType="apartment" />);
    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('renders no counter badge for a single photo', () => {
    render(<PhotoCarousel photos={[makePhoto()]} propertyType="apartment" />);
    expect(screen.queryByText('1/1')).not.toBeInTheDocument();
  });
});
