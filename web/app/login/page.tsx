'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return <p>Magic Link gesendet — bitte E-Mail-Postfach prüfen.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        E-Mail
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button type="submit">Magic Link senden</button>
      {status === 'error' && <p role="alert">Fehler beim Senden — bitte erneut versuchen.</p>}
    </form>
  );
}
