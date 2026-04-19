import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (!cancelled && !error) setProfiles(data || []);
      if (error) console.error('Profiles load error:', error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const byId = (id) => profiles.find(p => p.id === id);
  const displayName = (id) => {
    const p = byId(id);
    return p?.full_name || p?.email?.split('@')[0] || 'Unknown';
  };
  const students = profiles.filter(p => p.role === 'student');

  return { profiles, students, loading, byId, displayName };
}
