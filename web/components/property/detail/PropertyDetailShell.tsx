'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PropertyDetailHeader } from './PropertyDetailHeader';
import { PropertySidebar } from './PropertySidebar';
import { EditSaveStatusContext, type SaveState } from './editSaveStatus';
import type { PropertyStatus } from '@/lib/calculations/statusPeriodCalculator';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';
import type { Database } from '@/lib/supabase/types';

type PropertyType = Database['public']['Enums']['property_type'];

/**
 * Chrome around every property tab: header bar + (outside edit mode) the photo/nav sidebar.
 * The Immobiliendaten tab is "edit mode": the sidebar disappears, the header swaps its
 * actions and shows the form's autosave state.
 */
export function PropertyDetailShell({
  propertyId,
  name,
  address,
  postalCode,
  city,
  propertyType,
  status,
  photos,
  children,
}: {
  propertyId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  photos: PropertyPhotoWithUrl[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isEditing = pathname === `/properties/${propertyId}/immobiliendaten`;
  const [saveState, setSaveState] = useState<SaveState>('idle');

  return (
    <EditSaveStatusContext.Provider value={setSaveState}>
      <div className="flex min-h-full flex-1 flex-col bg-[#f3f5f8]">
        <PropertyDetailHeader propertyId={propertyId} name={name} status={status} isEditing={isEditing} saveState={isEditing ? saveState : 'idle'} />
        <div className="flex min-w-0 flex-1">
          {!isEditing && (
            <PropertySidebar
              propertyId={propertyId}
              address={address}
              postalCode={postalCode}
              city={city}
              propertyType={propertyType}
              photos={photos}
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-4 px-6 pb-8 pt-5">{children}</div>
        </div>
      </div>
    </EditSaveStatusContext.Provider>
  );
}
