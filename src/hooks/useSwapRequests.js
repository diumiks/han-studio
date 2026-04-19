import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// Pending swap requests involving the current user (either as requester or target).
export function useSwapRequests(userId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('swap_requests')
      .select('*')
      .eq('status', 'pending')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();
    if (!userId) return;
    const channel = supabase
      .channel('swap-' + userId + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetch]);

  const create = async ({ requesterSlotId, targetId, targetSlotId, message }) => {
    const { error } = await supabase.from('swap_requests').insert({
      requester_id: userId,
      requester_slot_id: requesterSlotId,
      target_id: targetId,
      target_slot_id: targetSlotId,
      message: message || '',
    });
    if (!error) await fetch();
    return { error };
  };

  const accept = async (id) => {
    const { error } = await supabase.rpc('accept_swap_request', { req_id: id });
    if (!error) await fetch();
    return { error };
  };

  const decline = async (id) => {
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetch();
    return { error };
  };

  const cancel = async (id) => {
    const { error } = await supabase
      .from('swap_requests')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) await fetch();
    return { error };
  };

  const incoming = rows.filter(r => r.target_id === userId);
  const outgoing = rows.filter(r => r.requester_id === userId);

  return { rows, incoming, outgoing, loading, create, accept, decline, cancel, refetch: fetch };
}
