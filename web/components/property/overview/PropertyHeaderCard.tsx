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

  const fields: Array<[string, string | number]> = [
    ['Typ', PROPERTY_TYPE_LABELS[property.property_type]],
    ['Baujahr', property.year_built ?? '–'],
    ['Wohnfläche', `${property.living_area_sqm.toLocaleString('de-DE')} m²`],
    ['Zimmer', property.rooms ?? '–'],
    ['Kaltmiete/m²', formatCurrency(coldRentPerSqm)],
    ['Kaufpreis/m²', formatCurrency(purchasePricePerSqm)],
    ['Energieklasse', property.energy_efficiency_class ? ENERGY_CLASS_LABELS[property.energy_efficiency_class] : '–'],
    ['Zustand', property.condition ? CONDITION_LABELS[property.condition] : '–'],
    ['Heizung', property.heating_type ? HEATING_LABELS[property.heating_type] : '–'],
    ['Stellplatz', PARKING_LABELS[property.parking_type]],
  ];
  const half = Math.ceil(fields.length / 2);
  const fieldColumns = [fields.slice(0, half), fields.slice(half)];

  return (
    <GlassCard variant="solid">
      <div className="flex gap-4">
        <PhotoCarousel photos={photos} propertyType={property.property_type} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-text-primary">
            {property.address}, {property.postal_code} {property.city}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-8 text-[13px]">
            {fieldColumns.map((column, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                {column.map(([label, value]) => (
                  <div className="contents" key={label}>
                    <span className="text-text-secondary">{label}</span>
                    <span className="text-right text-text-primary">{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {property.notes && <p className="mt-3 text-sm text-text-secondary">{property.notes}</p>}
    </GlassCard>
  );
}
