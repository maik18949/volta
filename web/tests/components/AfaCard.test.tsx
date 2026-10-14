// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { makeDate } from '@/lib/calculations/dateHelpers';
import type { Database } from '@/lib/supabase/types';

const setDegressiveSwitchYear = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/data/propertyActions', () => ({
  setDegressiveSwitchYear: (...args: unknown[]) => setDegressiveSwitchYear(...args),
}));

import { AfaCard } from '@/components/property/steuer/AfaCard';

type PropertyRow = Database['public']['Tables']['properties']['Row'];

function makeProperty(overrides: Partial<PropertyRow> = {}): PropertyRow {
  return {
    id: 'prop-1',
    purchase_price_unit: 300_000,
    purchase_price_parking: 0,
    land_transfer_tax: 0,
    notary_costs: 0,
    land_registry_costs: 0,
    agent_fee: 0,
    appraisal_costs: 0,
    building_value: 300_000,
    land_value: 60_000,
    renovation_afa_eligible: 0,
    depreciation_rate: 0.03,
    depreciation_method: 'degressiv_5a',
    degressive_switch_year: null,
    economic_transfer_date: '2026-01-01',
    marginal_tax_rate: 0.42,
    ...overrides,
  } as unknown as PropertyRow;
}

beforeEach(() => setDegressiveSwitchYear.mockClear());
afterEach(cleanup);

describe('AfaCard', () => {
  it('stellt die AfA mit Steuerersparnis voran, daneben Restwert und Methode', () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2026, 6, 15)} />);
    expect(screen.getByText('AfA 2026')).toBeInTheDocument();
    expect(screen.getByText(/Steuerersparnis/)).toHaveTextContent(/6\.300/);
    expect(screen.getByText('Restwert Ende 2026')).toBeInTheDocument();
    expect(screen.getByText(/von .* abgeschrieben/)).toHaveTextContent(/5,0 %/);
    expect(screen.getByText('Degressiv 5 %')).toBeInTheDocument();
  });

  it('Ausblick als Tabelle mit AfA und Restwert, Grundlagen als Liste', () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2026, 6, 15)} />);
    expect(screen.getByText('Ausblick')).toBeInTheDocument();
    expect(screen.getByText('Grundlagen')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Restwert' })).toBeInTheDocument();
    expect(screen.getByText('2031')).toBeInTheDocument();
    expect(screen.getByText('2036')).toBeInTheDocument();
    expect(screen.getByText('Bemessungsgrundlage')).toBeInTheDocument();
    expect(screen.getByText('Grundstückswert')).toBeInTheDocument();
    expect(screen.getByText('nicht abschreibbar')).toBeInTheDocument();
  });

  it('Ende der AfA: bei Degressiv ohne Wechsel „nie", bei Linear das Jahr', () => {
    const { unmount } = render(<AfaCard property={makeProperty()} today={makeDate(2026, 6, 15)} />);
    expect(screen.getByText(/nie \(ohne Wechsel\)/)).toBeInTheDocument();
    unmount();
    render(<AfaCard property={makeProperty({ depreciation_method: 'linear' })} today={makeDate(2026, 6, 15)} />);
    expect(screen.queryByText(/nie \(ohne Wechsel\)/)).not.toBeInTheDocument();
    expect(screen.getByText('2059')).toBeInTheDocument();
  });

  it('weit: nur ein ruhiger Hinweis mit Link zum Vormerken, kein Button', () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2026, 6, 15)} />);
    expect(screen.getByText(/Empfohlen/)).toHaveTextContent(/ab 2040/);
    expect(screen.getByRole('button', { name: 'Jetzt vormerken' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Wechsel ab 2040 vormerken/ })).not.toBeInTheDocument();
  });

  it('fällig: Button öffnet das Vorschau-Feld, Bestätigen speichert das Wechseljahr', async () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2039, 3, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel ab 2040 vormerken' }));
    expect(screen.getByText('ohne Wechsel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel vormerken' }));
    await waitFor(() => expect(setDegressiveSwitchYear).toHaveBeenCalledWith('prop-1', 2040));
  });

  it('überfällig: Button wechselt ab dem laufenden Jahr', async () => {
    render(<AfaCard property={makeProperty()} today={makeDate(2045, 3, 1)} />);
    expect(screen.getByText(/seit 2040 sinnvoll/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ab 2045 wechseln' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel vormerken' }));
    await waitFor(() => expect(setDegressiveSwitchYear).toHaveBeenCalledWith('prop-1', 2045));
  });

  it('vorgemerkt: zeigt den Plan und lässt ihn zurücknehmen', async () => {
    render(<AfaCard property={makeProperty({ degressive_switch_year: 2040 })} today={makeDate(2030, 3, 1)} />);
    expect(screen.getByText(/Vorgemerkt ab 2040/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zurücknehmen' }));
    await waitFor(() => expect(setDegressiveSwitchYear).toHaveBeenCalledWith('prop-1', null));
  });

  it('aktiv: „Linear seit …" ohne Rückgängig', () => {
    render(<AfaCard property={makeProperty({ degressive_switch_year: 2040 })} today={makeDate(2041, 3, 1)} />);
    expect(screen.getAllByText(/Linear seit 2040/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Zurücknehmen' })).not.toBeInTheDocument();
  });

  it('linear: kein Wechsel-Thema, Restwert trotzdem sichtbar', () => {
    render(<AfaCard property={makeProperty({ depreciation_method: 'linear' })} today={makeDate(2026, 6, 15)} />);
    expect(screen.queryByText(/Wechsel (zu linear|vorgemerkt)/)).not.toBeInTheDocument();
    expect(screen.getByText('Restwert Ende 2026')).toBeInTheDocument();
    expect(screen.getByText(/Linear 3 %/)).toBeInTheDocument();
  });

  it('zeigt eine Fehlermeldung, wenn das Speichern fehlschlägt', async () => {
    setDegressiveSwitchYear.mockRejectedValueOnce(new Error('boom'));
    render(<AfaCard property={makeProperty()} today={makeDate(2039, 3, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel ab 2040 vormerken' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wechsel vormerken' }));
    expect(await screen.findByText(/Speichern fehlgeschlagen/)).toBeInTheDocument();
  });
});
