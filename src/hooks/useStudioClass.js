import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { todayISO } from '../lib/dateUtils.js';

export function useStudioClass() {
  const [sessions, setSessions] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('studio_class').select('*').order('session_date', { ascending: true }),
      supabase.from('studio_pieces').select('*').order('created_at', { ascending: true }),
    ]);
    setSessions(s || []);
    setPieces(p || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`studio-class-all-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_class' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studio_pieces' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const today = todayISO();
  // All future-or-today sessions, soonest first.
  const upcomingList = sessions.filter(s => s.session_date >= today);
  // The very next session (for "virtual next" comparison).
  const upcoming = upcomingList[0] || null;
  // Past, most recent first.
  const past = sessions.filter(s => s.session_date < today).slice().reverse();

  const piecesFor = (sessionId) => pieces.filter(p => p.session_id === sessionId);

  return { sessions, pieces, upcoming, upcomingList, past, piecesFor, loading, refetch: fetch };
}
