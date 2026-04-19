import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (!error && data) {
      const map = {};
      data.forEach(row => { map[row.key] = row.value; });
      setSettings(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`settings-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const update = async (key, value) => {
    await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
  };

  return { settings, loading, update };
}
