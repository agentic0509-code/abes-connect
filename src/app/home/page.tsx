import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Feed, { Post } from './Feed';
import Navigation from '@/components/Navigation';

export const dynamic = 'force-dynamic';

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



  // 1.5 Fetch accepted connections with explicit bi-directional user.id checking
  const { data: connections, error: connError } = await supabase
    .from('connections')
    .select('requester_id, receiver_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  if (connError) {
    console.error('Error fetching connections:', connError);
  }

  const friendIds = connections?.map((c) =>
    c.requester_id === user.id ? c.receiver_id : c.requester_id
  ) || [];

  const feedUserIds = [user.id, ...friendIds];

  const postSelectSchema = `
    id,
    author_id,
    content,
    image_url,
    created_at,
    parent_id,
    author:profiles!posts_author_id_fkey (
      id,
      full_name,
      profile_photo_url,
      headline
    ),
    reactions (
      post_id,
      user_id,
      type
    ),
    parent:posts!parent_id (
      id,
      content,
      image_url,
      created_at,
      author:profiles!posts_author_id_fkey (
        id,
        full_name,
        profile_photo_url,
        headline
      )
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
  `;

  // 2. Fetch connection-filtered community feed with author profile, reactions, comments, and nested parent reposts
  const { data: rawPosts, error: postsError } = await supabase
    .from('posts')
    .select(postSelectSchema)
    .in('author_id', feedUserIds)
    .order('created_at', { ascending: false });

  if (postsError) {
    console.warn('Error fetching posts feed:', postsError);
  }

  let posts = rawPosts || [];

  // 3. Fallback/Fill: If connection feed has less than 6 posts, fill with public community posts to keep page active
  if (posts.length < 6) {
    const existingPostIds = posts.map((p) => p.id);
    const limitNeeded = 6 - posts.length;

    let fallbackQuery = supabase
      .from('posts')
      .select(postSelectSchema)
      .order('created_at', { ascending: false })
      .limit(limitNeeded);

    if (existingPostIds.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${existingPostIds.join(',')})`);
    }

    const { data: communityPosts, error: fallbackError } = await fallbackQuery;
    if (fallbackError) {
      console.warn('Error fetching fallback community posts:', fallbackError);
    }
    if (communityPosts) {
      posts = [...posts, ...communityPosts];
    }
  }

  // Temporary feed query debug logging
  console.log('--- FEED QUERY DIAGNOSTICS ---');
  console.log('ME (Currently Logged-in User ID):', user.id);
  console.log('Resolved Connection IDs (Friend list):', friendIds);
  console.log('Number of Posts Returned in Feed:', posts.length);
  console.log('------------------------------');

  const connectionCount = friendIds.length;

  return (
    <div className="min-h-screen bg-[#f3f2ef] dark:bg-[#1d2226] text-[#191919] dark:text-[#f3f2ef] transition-colors duration-300">
      <Navigation />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar - User Mini Profile */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl transition-colors relative overflow-hidden">
            {/* Banner Background */}
            <div className="h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 absolute inset-x-0 top-0" />
            
            <div className="relative pt-6 pb-4 px-4 text-center">
              <div className="w-18 h-18 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-sm mx-auto relative -mt-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={currentUserProfile?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUserProfile?.full_name || user.email || 'Member')}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <Link 
                href={`/profile/${user.id}`}
                className="font-extrabold text-slate-900 dark:text-white mt-3 text-sm hover:underline block truncate"
              >
                {currentUserProfile?.full_name || user.email?.split('@')[0]}
              </Link>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 px-1 font-medium">
                {currentUserProfile?.headline || 'ABES Engineering College Member'}
              </p>
            </div>

            {/* Profile Statistics */}
            <div className="py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-2">
              <div className="flex items-center justify-between px-4 hover:bg-slate-55 dark:hover:bg-slate-800/50 py-1 cursor-pointer transition-colors">
                <span className="font-semibold">Profile viewers</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">181</span>
              </div>
              <div className="flex items-center justify-between px-4 hover:bg-slate-55 dark:hover:bg-slate-800/50 py-1 cursor-pointer transition-colors">
                <span className="font-semibold">Connections</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{connectionCount}</span>
              </div>
            </div>

            {/* Premium Promotion */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[10px] hover:bg-slate-55 dark:hover:bg-slate-800/50 cursor-pointer transition-all">
              <p className="text-slate-400">Grow your career with Premium</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs inline-block" />
                Don&apos;t miss: Premium for ₹0
              </p>
            </div>

            {/* Saved Items */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-55 dark:hover:bg-slate-800/50 cursor-pointer transition-colors rounded-b-xl flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>Saved items</span>
            </div>
          </div>
        </div>

        {/* Middle/Main Area - Feed Content */}
        <div className="lg:col-span-6">
          <Feed 
            initialPosts={posts as unknown as Post[]} 
            currentUser={user} 
            currentUserProfile={currentUserProfile} 
            debugData={{ me: user.id, connectionIds: friendIds, postCount: posts.length }}
          />
        </div>

        {/* Right Sidebar - ABES Connect News */}
        <div className="lg:col-span-3 hidden lg:block space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">ABES Connect News</h3>
              <svg className="w-4 h-4 text-slate-500 hover:text-slate-700 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <div className="space-y-3">
              <div className="group cursor-pointer">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  Campus placement drive peaks
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  2d ago • 1,248 readers
                </p>
              </div>

              <div className="group cursor-pointer">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  ABES Internal Hackathon 2026 registration starts
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  1d ago • 842 readers
                </p>
              </div>

              <div className="group cursor-pointer">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  Alumni Meet scheduled for next month
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  4d ago • 2,110 readers
                </p>
              </div>

              <div className="group cursor-pointer">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  AI Research center inaugurated at college
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  5d ago • 593 readers
                </p>
              </div>

              <div className="group cursor-pointer">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  Classmate interaction guidelines updated
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  6d ago • 312 readers
                </p>
              </div>
            </div>

            <button className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer flex items-center justify-center gap-1">
              Show more
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Today&apos;s puzzles</h3>
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 font-black text-xs">
                W
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">WordPlay #25</h4>
                <p className="text-[10px] text-slate-400 font-medium">3 classmate connections played</p>
              </div>
              <svg className="w-4 h-4 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
