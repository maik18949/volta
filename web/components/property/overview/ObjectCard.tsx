import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Stat } from '@/components/ui/Stat';
import { formatCurrency } from '@/lib/formatters';
import type { Database } from '@/lib/supabase/types';

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

/** "Objekt" card: the property's descriptive fields (address and photo live in the sidebar). */
export function ObjectCard({ property, purchasePricePerSqm }: { property: PropertyRow; purchasePricePerSqm: number }) {
  const coldRentPerSqm = property.living_area_sqm > 0 ? property.cold_rent_monthly / property.living_area_sqm : 0;
  const hasParking = property.parking_type !== 'nicht_vorhanden';

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
    ['Hausgeld Wohnung', formatCurrency(property.hoa_fee_total_monthly)],
  ];
  if (hasParking) {
    fields.push(['Hausgeld Stellplatz', formatCurrency(property.hoa_fee_parking_total_monthly)]);
  }

  return (
    <Card className="py-[18px]">
      <SectionLabel className="mb-3.5">Objekt</SectionLabel>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-5 gap-y-3">
        {fields.map(([label, value]) => (
          <Stat key={label} label={label} value={value} size="sm" />
        ))}
      </div>
      {property.notes && <p className="mt-3.5 text-[13px] text-text-secondary">{property.notes}</p>}
    </Card>
  );
}
