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
    author:profiles (
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
    parent:posts (
      id,
      content,
      image_url,
      created_at,
      author:profiles (
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
    console.error('Error fetching posts feed:', postsError);
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
      console.error('Error fetching fallback community posts:', fallbackError);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      <Navigation />

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
            debugData={{ me: user.id, connectionIds: friendIds, postCount: posts.length }}
          />
        </div>

      </main>
    </div>
  );
}
