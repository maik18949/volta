import { PropertyWizard } from '@/components/wizard/PropertyWizard';

export default function NewPropertyPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-bold text-text-primary">Neue Immobilie</h1>
      <PropertyWizard />
    </div>
  );
}
