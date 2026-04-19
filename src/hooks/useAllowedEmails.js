import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export function useAllowedEmails() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('allowed_emails')
      .select('*')
      .order('added_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (email, fullName) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return { error: new Error('Email required') };
    const { error } = await supabase
      .from('allowed_emails')
      .insert({ email: clean, full_name: (fullName || '').trim() });
    if (!error) await fetch();
    return { error };
  };

  const remove = async (email) => {
    await supabase.from('allowed_emails').delete().eq('email', email);
    await fetch();
  };

  return { rows, loading, add, remove, refetch: fetch };
}
