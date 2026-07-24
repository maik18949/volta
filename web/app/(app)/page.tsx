import { createClient } from '@/lib/supabase/server';

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <p>Angemeldet als {user?.email}</p>;
}
