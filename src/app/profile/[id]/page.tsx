import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import ProfileDetails from './ProfileDetails';

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

  // 4. Fetch experiences (newest first)
  const { data: experiences } = await supabase
    .from('experiences')
    .select('*')
    .eq('profile_id', profileId)
    .order('start_date', { ascending: false });

  // 5. Fetch education (newest start year first)
  const { data: education } = await supabase
    .from('education')
    .select('*')
    .eq('profile_id', profileId)
    .order('start_year', { ascending: false });

  // 6. Fetch certifications (newest first)
  const { data: certifications } = await supabase
    .from('certifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('issue_date', { ascending: false });

  // 7. Fetch projects (newest first)
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('profile_id', profileId)
    .order('start_date', { ascending: false });

  const isOwner = user?.id === profileId;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-955 p-6 text-center">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-655 dark:text-slate-400 mb-6">
            The profile you are trying to view does not exist or has been deleted.
          </p>
          <Link href="/home" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
            Go to Home Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
        
          {/* Top action header */}
          <div className="flex items-center justify-between">
            <Link 
              href="/home" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-3">
              {isOwner && (
                <Link 
                  href="/profile/edit" 
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-750 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit Header Info
                </Link>
              )}
            </div>
          </div>

          <ProfileDetails
            profile={profile}
            isOwner={isOwner}
            currentUserId={user?.id || ''}
            connectionStatus={connectionStatus}
            initialExperiences={experiences || []}
            initialEducation={education || []}
            initialCertifications={certifications || []}
            initialProjects={projects || []}
          />

        </div>
      </div>
    </>
  );
}
