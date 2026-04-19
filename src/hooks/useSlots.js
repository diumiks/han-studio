import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

// Fetch slots in an inclusive date range, with realtime updates.
// fromDate and toDate are ISO strings (YYYY-MM-DD).
export function useSlots(fromDate, toDate) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = useCallback(async () => {
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .gte('slot_date', fromDate)
      .lte('slot_date', toDate)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });
    if (!error) setSlots(data || []);
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchSlots();
    const channel = supabase
      .channel('slots-range-' + fromDate + '-' + toDate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => fetchSlots())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fromDate, toDate, fetchSlots]);

  return { slots, loading, refetch: fetchSlots };
}

// Fetch all slots ever booked by a specific user.
export function useMySlots(userId) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('slots')
      .select('*')
      .eq('booked_by', userId)
      .order('slot_date', { ascending: false })
      .order('slot_time', { ascending: false });
    if (!error) setSlots(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('my-slots-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slots' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetch]);

  return { slots, loading, refetch: fetch };
}
