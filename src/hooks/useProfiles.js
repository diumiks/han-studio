import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });
    if (!error) setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const byId = (id) => profiles.find(p => p.id === id);
  const displayName = (id) => {
    const p = byId(id);
    return p?.full_name || p?.email?.split('@')[0] || 'Unknown';
  };
  const students = profiles.filter(p => p.role === 'student' && !p.archived);
  const archivedStudents = profiles.filter(p => p.role === 'student' && p.archived);

  return { profiles, students, archivedStudents, loading, byId, displayName, refetch: fetch };
}
