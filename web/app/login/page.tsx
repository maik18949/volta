'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <GlassCard className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-text-primary">Volta</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Melde dich an oder erstelle ein neues Konto — mit derselben E-Mail-Adresse funktioniert beides.
        </p>

        {status === 'sent' ? (
          <p className="mt-6 text-sm text-text-primary">
            Magic Link gesendet — bitte E-Mail-Postfach prüfen und den Link im selben Browser öffnen, in dem du ihn
            angefordert hast.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-text-secondary">
              E-Mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-black/10 bg-white/90 px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {status === 'sending' ? 'Wird gesendet…' : 'Magic Link senden'}
            </button>
            {status === 'error' && (
              <p role="alert" className="text-sm text-negative">
                Fehler beim Senden — bitte erneut versuchen.
              </p>
            )}
          </form>
        )}
      </GlassCard>
    </div>
  );
}
