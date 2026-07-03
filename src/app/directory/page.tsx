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

interface Connection {
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
}

export default function DirectoryPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track ongoing request updates
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  useEffect(() => {
    async function loadDirectory() {
      try {
        setError(null);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }

        setCurrentUserId(user.id);

        // 1. Fetch other profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url, headline, branch, graduation_year')
          .neq('id', user.id);

        if (profilesError) throw profilesError;

        // 2. Fetch my connections
        const { data: connectionsData, error: connectionsError } = await supabase
          .from('connections')
          .select('requester_id, receiver_id, status')
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

        if (connectionsError) throw connectionsError;

        setProfiles(profilesData || []);
        setConnections(connectionsData || []);
      } catch (err) {
        console.error('Error loading directory:', err);
        const errMsg = err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: unknown }).message || '')
          : (err instanceof Error ? err.message : 'Failed to load directory details.');
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }

    loadDirectory();
  }, [router, supabase]);

  const handleConnect = async (targetId: string) => {
    if (!currentUserId) return;
    setUpdatingId(targetId);

    try {
      const { error: insertError } = await supabase
        .from('connections')
        .insert({
          requester_id: currentUserId,
          receiver_id: targetId,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Update local connections state
      setConnections([
        ...connections,
        { requester_id: currentUserId, receiver_id: targetId, status: 'pending' },
      ]);
    } catch (err) {
      console.error('Error sending request:', err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : (err instanceof Error ? err.message : 'Failed to send connection request.');
      alert(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAcceptRequest = async (targetId: string) => {
    if (!currentUserId) return;
    setUpdatingId(targetId);

    try {
      const { error: updateError } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('requester_id', targetId)
        .eq('receiver_id', currentUserId);

      if (updateError) throw updateError;

      // Update local state
      setConnections(
        connections.map((c) =>
          c.requester_id === targetId && c.receiver_id === currentUserId
            ? { ...c, status: 'accepted' }
            : c
        )
      );
    } catch (err) {
      console.error('Error accepting connection:', err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : (err instanceof Error ? err.message : 'Failed to accept connection request.');
      alert(errMsg);
    } finally {
      setUpdatingId(null);
    }
  };

  // Helper to determine status and connection info between logged-in user and target user
  const getConnectionState = (targetId: string) => {
    const conn = connections.find(
      (c) =>
        (c.requester_id === currentUserId && c.receiver_id === targetId) ||
        (c.requester_id === targetId && c.receiver_id === currentUserId)
    );

    if (!conn) return { status: 'none', isRequester: false };

    if (conn.status === 'accepted') return { status: 'connected', isRequester: false };

    // Connection is pending, identify who sent it
    const isRequester = conn.requester_id === currentUserId;
    return { status: 'pending', isRequester };
  };

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter((p) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = p.full_name.toLowerCase().includes(query);
    const branchMatch = p.branch ? p.branch.toLowerCase().includes(query) : false;
    const gradMatch = p.graduation_year ? String(p.graduation_year).includes(query) : false;
    return nameMatch || branchMatch || gradMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-955">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm">Loading member directory...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-955 text-slate-900 dark:text-slate-50 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">ABES Member Directory</h1>
          </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-650 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Search Filter Header */}
        <div className="bg-white dark:bg-slate-900 shadow-md rounded-2xl border border-slate-200/50 dark:border-slate-800/80 p-6 mb-8 transition-colors">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search directory by name, branch, or graduation class year (e.g. CSE, 2026)..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:focus:border-blue-550 dark:bg-slate-800 dark:text-white text-sm transition-colors"
            />
            <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-12 text-center transition-colors">
            <svg className="w-12 h-12 text-slate-355 dark:text-slate-655 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Members Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try refining your search terms or search by general keywords.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => {
              const { status, isRequester } = getConnectionState(profile.id);
              const isUpdating = updatingId === profile.id;

              return (
                <div 
                  key={profile.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-2xl p-6 transition-colors flex flex-col justify-between hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 duration-200"
                >
                  <div className="flex items-start gap-4">
                    <Link href={`/profile/${profile.id}`} className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-205 dark:border-slate-800 hover:opacity-85 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={profile.profile_photo_url || defaultAvatar(profile.full_name)} 
                        alt={profile.full_name} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/profile/${profile.id}`} 
                        className="text-base font-bold text-slate-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                      >
                        {profile.full_name}
                      </Link>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{profile.headline || 'ABES Member'}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {profile.branch && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold">
                            {profile.branch.split(' ')[0]}
                          </span>
                        )}
                        {profile.graduation_year && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-105 dark:bg-slate-800 text-slate-600 dark:text-slate-350 text-[10px] font-bold">
                            Class of {profile.graduation_year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Connect / Pending / Accept Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                    {status === 'none' && (
                      <button
                        onClick={() => handleConnect(profile.id)}
                        disabled={isUpdating}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {isUpdating ? 'Sending...' : 'Connect'}
                      </button>
                    )}

                    {status === 'pending' && isRequester && (
                      <span className="px-3.5 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 rounded-xl">
                        Pending
                      </span>
                    )}

                    {status === 'pending' && !isRequester && (
                      <button
                        onClick={() => handleAcceptRequest(profile.id)}
                        disabled={isUpdating}
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {isUpdating ? 'Accepting...' : 'Accept Request'}
                      </button>
                    )}

                    {status === 'connected' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Connected
                      </span>
                    )}
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
