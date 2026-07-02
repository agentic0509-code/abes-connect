'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ConnectButtonProps {
  profileId: string;
  currentUserId: string;
  initialStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}

export default function ConnectButton({
  profileId,
  currentUserId,
  initialStatus,
}: ConnectButtonProps) {
  const supabase = createClient();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: currentUserId,
          receiver_id: profileId,
          status: 'pending',
        });

      if (error) throw error;
      setStatus('pending_sent');
    } catch (err) {
      console.error('Error sending connection request:', err);
      alert('Failed to send connection request.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('requester_id', profileId)
        .eq('receiver_id', currentUserId);

      if (error) throw error;
      setStatus('connected');
    } catch (err) {
      console.error('Error accepting connection:', err);
      alert('Failed to accept connection request.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-sm border border-emerald-100/50 dark:border-emerald-900/30">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Connected
      </span>
    );
  }

  if (status === 'pending_sent') {
    return (
      <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
        Request Pending
      </span>
    );
  }

  if (status === 'pending_received') {
    return (
      <button
        onClick={handleAccept}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? 'Accepting...' : 'Accept Request'}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-750 text-white text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? 'Connecting...' : 'Connect'}
    </button>
  );
}
