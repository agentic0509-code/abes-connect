import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ConnectButton from './ConnectButton';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the route params for Next.js 16
  const { id: profileId } = await params;

  const supabase = await createClient();

  // 1. Fetch the profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  // 2. Fetch the authenticated user session to check ownership
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3. Fetch connection status if viewing someone else's profile
  let connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected' = 'none';
  if (user && user.id !== profileId) {
    const { data: conn } = await supabase
      .from('connections')
      .select('*')
      .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${user.id})`)
      .maybeSingle();

    if (conn) {
      if (conn.status === 'accepted') {
        connectionStatus = 'connected';
      } else if (conn.requester_id === user.id) {
        connectionStatus = 'pending_sent';
      } else {
        connectionStatus = 'pending_received';
      }
    }
  }

  const isOwner = user?.id === profileId;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The profile you are trying to view does not exist or has been deleted.
          </p>
          <Link href="/home" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
            Go to Home Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fallback avatar generator using Dicebear initials
  const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.full_name)}`;

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        
          {/* Edit Profile button for owner */}
          {isOwner && (
            <div className="flex justify-end mb-6">
              <Link 
                href="/profile/edit" 
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-750 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </Link>
            </div>
          )}

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-xl rounded-3xl overflow-hidden transition-colors">
          
          {/* Banner decoration */}
          <div className="h-48 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_60%)]" />
          </div>

          {/* Profile Details Header */}
          <div className="px-8 pb-8 relative">
            
            {/* Avatar overlay */}
            <div className="relative -mt-20 mb-4 inline-block">
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={profile.profile_photo_url || fallbackAvatar} 
                  alt={profile.full_name} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {profile.full_name}
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-350 font-medium mt-1">
                  {profile.headline || 'ABES Engineering College Member'}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                  {profile.branch && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {profile.branch}
                    </span>
                  )}
                  {profile.graduation_year && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                      Class of {profile.graduation_year}
                    </span>
                  )}
                </div>
              </div>

              {!isOwner && user && (
                <div className="flex items-center gap-3">
                  <ConnectButton
                    profileId={profileId}
                    currentUserId={user.id}
                    initialStatus={connectionStatus}
                  />
                  <button className="px-5 py-2.5 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-all cursor-pointer">
                    Message
                  </button>
                </div>
              )}
            </div>

            {/* About section */}
            <div className="mt-10 border-t border-slate-100 dark:border-slate-800/80 pt-8">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">About Me</h2>
              <div className="text-slate-650 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {profile.about || 'No bio provided yet. Keep your profile fresh by adding an about section!'}
              </div>
            </div>

            {/* Skills section */}
            {profile.skills && profile.skills.length > 0 && (
              <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-8">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2.5">
                  {profile.skills.map((skill: string) => (
                    <span 
                      key={skill}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100/50 dark:border-blue-900/30 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
    </>
  );
}
