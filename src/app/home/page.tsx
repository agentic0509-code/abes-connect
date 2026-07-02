import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/auth/actions';
import Link from 'next/link';
import Feed, { Post } from './Feed';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If there's no user, fall back to showing a redirect card
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-955 p-6 text-center">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-650 dark:text-slate-400 mb-6">You must be logged in to view this page.</p>
          <Link href="/login" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // 1. Fetch user's own profile details
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('id, full_name, profile_photo_url, headline')
    .eq('id', user.id)
    .single();

  // 1.5 Fetch pending requests count
  const { count: pendingCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('status', 'pending');

  // 2. Fetch the entire community feed with authors, likes, and comments
  const { data: rawPosts } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
      content,
      image_url,
      created_at,
      author:profiles (
        id,
        full_name,
        profile_photo_url,
        headline
      ),
      likes (
        post_id,
        user_id
      ),
      comments (
        id,
        post_id,
        author_id,
        content,
        created_at,
        author:profiles (
          id,
          full_name,
          profile_photo_url,
          headline
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Default to empty array if posts fetch returns null
  const posts = rawPosts || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-955/80 backdrop-blur-md border-b border-slate-250 dark:border-slate-850/80 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">ABES</span>
              <span className="text-xl font-medium tracking-tight text-slate-800 dark:text-slate-200"> Connect</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/directory" 
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
            >
              Directory
            </Link>
            <Link 
              href="/requests" 
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors relative mr-2"
            >
              Requests
              {pendingCount && pendingCount > 0 ? (
                <span className="absolute -top-1.5 -right-3.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
            <Link 
              href={currentUserProfile ? `/profile/${currentUserProfile.id}` : '/profile/edit'} 
              className="text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
            >
              My Profile
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar - User Mini Profile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-lg rounded-3xl p-6 transition-colors text-center relative overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-blue-600 to-sky-400 absolute inset-x-0 top-0 opacity-80" />
            <div className="relative pt-6">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={currentUserProfile?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserProfile?.full_name || user.email || 'Member')}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white mt-4 text-lg">
                {currentUserProfile?.full_name || user.email?.split('@')[0]}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {currentUserProfile?.headline || 'ABES Engineering College Member'}
              </p>
              
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-4">
                <Link 
                  href="/profile/edit"
                  className="px-4 py-2 text-xs font-bold rounded-xl text-blue-650 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 transition-all"
                >
                  Edit Profile &rarr;
                </Link>
                <Link 
                  href={`/profile/${user.id}`}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition-all"
                >
                  View Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Middle/Main Area - Feed Content */}
        <div className="lg:col-span-8">
          <Feed 
            initialPosts={posts as unknown as Post[]} 
            currentUser={user} 
            currentUserProfile={currentUserProfile} 
          />
        </div>

      </main>
    </div>
  );
}
