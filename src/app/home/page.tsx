import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import Feed, { Post } from './Feed';
import Navigation from '@/components/Navigation';
import LeftSidebarProfile from '@/components/LeftSidebarProfile';
import CampusNews from '@/components/CampusNews';

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
          <LeftSidebarProfile
            currentUserProfile={currentUserProfile}
            currentUserId={user.id}
            userEmail={user.email}
            connectionCount={connectionCount}
          />
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
          <CampusNews />
        </div>

      </main>
    </div>
  );
}
