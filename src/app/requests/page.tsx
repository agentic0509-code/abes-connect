'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  headline: string | null;
  branch: string | null;
  graduation_year: number | null;
}

export default function RequestsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<Profile[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  useEffect(() => {
    async function loadRequests() {
      try {
        setError(null);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(user.id);

        // 1. Fetch pending connection requests where receiver_id is the current user
        const { data: connectionRows, error: connError } = await supabase
          .from('connections')
          .select('requester_id')
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        if (connError) throw connError;

        const requesterIds = connectionRows?.map((r) => r.requester_id) || [];

        if (requesterIds.length > 0) {
          // 2. Fetch profiles for those requester IDs
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, profile_photo_url, headline, branch, graduation_year')
            .in('id', requesterIds);

          if (profilesError) throw profilesError;
          setIncomingRequests(profilesData || []);
        } else {
          setIncomingRequests([]);
        }

      } catch (err) {
        console.error('Error loading requests:', err);
        const errMsg = err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message || '')
          : (err instanceof Error ? err.message : 'Failed to load connection requests.');
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, [router, supabase]);

  const handleAccept = async (requesterId: string) => {
    if (!currentUserId) return;
    setActionId(requesterId);

    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('requester_id', requesterId)
        .eq('receiver_id', currentUserId);

      if (updateError) throw updateError;

      // Remove from state list
      setIncomingRequests(incomingRequests.filter((r) => r.id !== requesterId));
    } catch (err) {
      console.error('Error accepting connection:', err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : (err instanceof Error ? err.message : 'Failed to accept connection request.');
      alert(errMsg);
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (requesterId: string) => {
    if (!currentUserId) return;
    setActionId(requesterId);

    try {
      const { error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('requester_id', requesterId)
        .eq('receiver_id', currentUserId);

      if (deleteError) throw deleteError;

      // Remove from state list
      setIncomingRequests(incomingRequests.filter((r) => r.id !== requesterId));
    } catch (err) {
      console.error('Error declining request:', err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : (err instanceof Error ? err.message : 'Failed to decline connection request.');
      alert(errMsg);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-655 dark:text-slate-400 font-semibold text-sm">Loading pending invitations...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">Incoming Connection Requests</h1>
          </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-955/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Requests List */}
        {incomingRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-12 text-center transition-colors">
            <svg className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Pending Requests</h3>
            <p className="text-sm text-slate-550 dark:text-slate-450 mt-1">
              You are all caught up! When other students or alumni send you connection invites, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incomingRequests.map((profile) => {
              const isProcessing = actionId === profile.id;
              
              return (
                <div 
                  key={profile.id}
                  className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800/80 shadow-md rounded-2xl p-6 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <Link href={`/profile/${profile.id}`} className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-205 dark:border-slate-800 hover:opacity-85 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={profile.profile_photo_url || defaultAvatar(profile.full_name)} 
                        alt={profile.full_name} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div>
                      <Link 
                        href={`/profile/${profile.id}`} 
                        className="text-sm font-bold text-slate-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {profile.full_name}
                      </Link>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5 line-clamp-1">{profile.headline || 'ABES Member'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {profile.branch && (
                          <span className="text-[10px] text-blue-650 dark:text-blue-400 font-bold">
                            {profile.branch}
                          </span>
                        )}
                        {profile.graduation_year && (
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                            • Class of {profile.graduation_year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <button
                      onClick={() => handleDecline(profile.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(profile.id)}
                      disabled={isProcessing}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      {isProcessing ? 'Accepting...' : 'Accept'}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        </div>
      </div>
    </>
  );
}
