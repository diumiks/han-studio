import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { todayISO } from '../lib/dateUtils.js';

export function useStudioClass() {
  const [sessions, setSessions] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('studio_class').select('*').order('session_date', { ascending: false }),
      supabase.from('studio_pieces').select('*').order('created_at', { ascending: true }),
    ]);
    setSessions(s || []);
    setPieces(p || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('studio-class-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_class' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_pieces' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const today = todayISO();
  const upcoming = sessions.find(s => s.session_date >= today);
  const past = sessions.filter(s => s.session_date < today);

  const piecesFor = (sessionId) => pieces.filter(p => p.session_id === sessionId);

  return { sessions, pieces, upcoming, past, piecesFor, loading, refetch: fetch };
}
