import { GlassCard } from '@/components/ui/GlassCard';
import { PhotoCarousel } from '@/components/property/overview/PhotoCarousel';
import { formatCurrency } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';
import type { PropertyPhotoWithUrl } from '@/lib/data/propertyPhotos';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

const PROPERTY_TYPE_LABELS: Record<PropertyRow['property_type'], string> = {
  apartment: 'Apartment',
  einfamilienhaus: 'Einfamilienhaus',
  mehrfamilienhaus: 'Mehrfamilienhaus',
  gewerbe: 'Gewerbe',
  grundstuck: 'Grundstück',
  sonstiges: 'Sonstiges',
};

const ENERGY_CLASS_LABELS: Record<NonNullable<PropertyRow['energy_efficiency_class']>, string> = {
  a_plus_plus: 'A++',
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  g: 'G',
  h: 'H',
};

const CONDITION_LABELS: Record<NonNullable<PropertyRow['condition']>, string> = {
  neubau: 'Neubau',
  erstbezug: 'Erstbezug',
  gepflegt: 'Gepflegt',
  renovierungsbedurftig: 'Renovierungsbedürftig',
  sanierungsbedurftig: 'Sanierungsbedürftig',
};

const HEATING_LABELS: Record<NonNullable<PropertyRow['heating_type']>, string> = {
  fernwarme: 'Fernwärme',
  gas: 'Gas',
  ol: 'Öl',
  warmepumpe: 'Wärmepumpe',
  pellet: 'Pellet',
  elektro: 'Elektro',
  sonstiges: 'Sonstiges',
};

const PARKING_LABELS: Record<PropertyRow['parking_type'], string> = {
  nicht_vorhanden: '–',
  tiefgarage: 'Tiefgarage',
  aussenstellplatz: 'Außenstellplatz',
  garage: 'Garage',
};

export function PropertyHeaderCard({
  property,
  purchasePricePerSqm,
  photos,
}: {
  property: PropertyRow;
  purchasePricePerSqm: number;
  photos: PropertyPhotoWithUrl[];
}) {
  const coldRentPerSqm = property.living_area_sqm > 0 ? property.cold_rent_monthly / property.living_area_sqm : 0;

  return (
    <GlassCard variant="solid">
      <div className="flex gap-4">
        <PhotoCarousel photos={photos} propertyType={property.property_type} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-text-primary">
            {property.address}, {property.postal_code} {property.city}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
            <span className="text-text-secondary">Typ</span>
            <span className="text-right text-text-primary">{PROPERTY_TYPE_LABELS[property.property_type]}</span>

            <span className="text-text-secondary">Baujahr</span>
            <span className="text-right text-text-primary">{property.year_built ?? '–'}</span>

            <span className="text-text-secondary">Wohnfläche</span>
            <span className="text-right text-text-primary">{property.living_area_sqm.toLocaleString('de-DE')} m²</span>

            <span className="text-text-secondary">Zimmer</span>
            <span className="text-right text-text-primary">{property.rooms ?? '–'}</span>

            <span className="text-text-secondary">Kaltmiete/m²</span>
            <span className="text-right text-text-primary">{formatCurrency(coldRentPerSqm)}</span>

            <span className="text-text-secondary">Kaufpreis/m²</span>
            <span className="text-right text-text-primary">{formatCurrency(purchasePricePerSqm)}</span>

            <span className="text-text-secondary">Energieklasse</span>
            <span className="text-right text-text-primary">
              {property.energy_efficiency_class ? ENERGY_CLASS_LABELS[property.energy_efficiency_class] : '–'}
            </span>

            <span className="text-text-secondary">Zustand</span>
            <span className="text-right text-text-primary">{property.condition ? CONDITION_LABELS[property.condition] : '–'}</span>

            <span className="text-text-secondary">Heizung</span>
            <span className="text-right text-text-primary">{property.heating_type ? HEATING_LABELS[property.heating_type] : '–'}</span>

            <span className="text-text-secondary">Stellplatz</span>
            <span className="text-right text-text-primary">{PARKING_LABELS[property.parking_type]}</span>
          </div>
        </div>
      </div>
      {property.notes && <p className="mt-3 text-sm text-text-secondary">{property.notes}</p>}
    </GlassCard>
  );
}
