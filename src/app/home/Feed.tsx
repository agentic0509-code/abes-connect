'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  headline: string | null;
}

interface Reaction {
  post_id: string;
  user_id: string;
  type: 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'funny';
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: Profile | null;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  parent_id: string | null;
  author: Profile | null;
  reactions: Reaction[];
  comments: Comment[];
  parent?: {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    author: Profile | null;
  } | null;
}

interface FeedProps {
  initialPosts: Post[];
  currentUser: {
    id: string;
    email?: string;
  };
  currentUserProfile: Profile | null;
  debugData: {
    me: string;
    connectionIds: string[];
    postCount: number;
  };
}

const REACTION_TYPES = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-600 dark:text-blue-400' },
  { type: 'celebrate', emoji: '👏', label: 'Celebrate', color: 'text-orange-500 dark:text-orange-400' },
  { type: 'support', emoji: '❤️', label: 'Support', color: 'text-indigo-500 dark:text-indigo-400' },
  { type: 'love', emoji: '💖', label: 'Love', color: 'text-pink-500 dark:text-pink-400' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: 'text-amber-500 dark:text-amber-400' },
  { type: 'funny', emoji: '😆', label: 'Funny', color: 'text-yellow-500 dark:text-yellow-400' }
] as const;

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function Feed({ initialPosts, currentUser, currentUserProfile, debugData }: FeedProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  
  // Post creation states
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showConnectingCard, setShowConnectingCard] = useState(true);

  // Comments states
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  // Reactions active dropdown tracker
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);

  // Repost states
  const [repostingPost, setRepostingPost] = useState<Post | null>(null);
  const [repostComment, setRepostComment] = useState('');
  const [sharing, setSharing] = useState(false);

  // Mentions autocomplete states
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [postMentionSearch, setPostMentionSearch] = useState<string | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentMentionSearch, setCommentMentionSearch] = useState<string | null>(null);

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  // Fetch all profiles on mount to search for mentions
  useEffect(() => {
    async function loadProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, headline');
      if (data) setProfiles(data);
    }
    loadProfiles();
  }, [supabase]);

  // Temporary browser debug console logging
  useEffect(() => {
    console.log('--- FEED BROWSER DIAGNOSTICS ---');
    console.log('ME (Currently Logged-in User ID):', debugData.me);
    console.log('Resolved Connection IDs (Friend list):', debugData.connectionIds);
    console.log('Number of Posts Returned in Feed:', debugData.postCount);
    console.log('--------------------------------');
  }, [debugData]);

  // Parse mentions into clickable Link nodes
  const parseContentWithMentions = (text: string) => {
    if (!text) return '';
    const mentionRegex = /(@\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, idx) => {
      const match = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const name = match[1];
        const id = match[2];
        return (
          <Link
            key={idx}
            href={`/profile/${id}`}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            @{name}
          </Link>
        );
      }
      return part;
    });
  };

  // ----------------------------------------------------
  // Autocomplete Mentions Search handlers
  // ----------------------------------------------------
  const handlePostContentChange = (text: string) => {
    setNewPostContent(text);
    const lastWord = text.split(/[\s\n]/).pop() || '';
    if (lastWord.startsWith('@')) {
      setPostMentionSearch(lastWord.slice(1));
    } else {
      setPostMentionSearch(null);
    }
  };

  const handleSelectPostMention = (friend: Profile) => {
    const words = newPostContent.split(/([\s\n])/);
    // Find the last word starting with @ and replace it
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].startsWith('@')) {
        words[i] = `@[${friend.full_name}](${friend.id}) `;
        break;
      }
    }
    setNewPostContent(words.join(''));
    setPostMentionSearch(null);
  };

  const handleCommentTextChange = (postId: string, text: string) => {
    setNewCommentText({ ...newCommentText, [postId]: text });
    const lastWord = text.split(/[\s\n]/).pop() || '';
    if (lastWord.startsWith('@')) {
      setActiveCommentPostId(postId);
      setCommentMentionSearch(lastWord.slice(1));
    } else {
      setCommentMentionSearch(null);
    }
  };

  const handleSelectCommentMention = (postId: string, friend: Profile) => {
    const text = newCommentText[postId] || '';
    const words = text.split(/([\s\n])/);
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].startsWith('@')) {
        words[i] = `@[${friend.full_name}](${friend.id}) `;
        break;
      }
    }
    setNewCommentText({ ...newCommentText, [postId]: words.join('') });
    setCommentMentionSearch(null);
  };

  // ----------------------------------------------------
  // Post Posting Logic
  // ----------------------------------------------------
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1025) {
        setPostError('Post image must be less than 5MB.');
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setPostError(null);
    }
  };

  const clearSelectedImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedFile) return;

    setPublishing(true);
    setPostError(null);

    try {
      let imageUrl = null;

      // 1. Upload image to post-images bucket
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${currentUser.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, selectedFile, {
            upsert: true,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('post-images').getPublicUrl(filePath);
        if (data) {
          imageUrl = data.publicUrl;
        }
      }

      // 2. Insert post row
      const { data: newPostRow, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: currentUser.id,
          content: newPostContent.trim(),
          image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger mentions in post content
      if (newPostContent.includes('@')) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name');
        if (profiles) {
          for (const p of profiles) {
            if (p.id === currentUser.id) continue;
            const fullNameRegex = new RegExp(`@${p.full_name}`, 'i');
            const firstName = p.full_name.split(' ')[0];
            const firstNameRegex = new RegExp(`@${firstName}`, 'i');
            if (fullNameRegex.test(newPostContent) || (firstName.length > 2 && firstNameRegex.test(newPostContent))) {
              await supabase.from('notifications').insert({
                recipient_id: p.id,
                actor_id: currentUser.id,
                type: 'mention',
                reference_id: newPostRow.id
              });
            }
          }
        }
      }

      // 3. Assemble full local Post state
      const assembledPost: Post = {
        ...newPostRow,
        author: currentUserProfile || {
          id: currentUser.id,
          full_name: currentUser.email?.split('@')[0] || 'Member',
          profile_photo_url: null,
          headline: 'Member',
        },
        reactions: [],
        comments: [],
      };

      setPosts([assembledPost, ...posts]);
      setNewPostContent('');
      clearSelectedImage();

    } catch (err) {
      console.error('Error creating post:', err);
      const errMsg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : (err instanceof Error ? err.message : 'Failed to publish post. Please check your storage bucket permission.');
      setPostError(errMsg);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post.');
    }
  };

  // ----------------------------------------------------
  // Reactions Upsert & Delete Logic
  // ----------------------------------------------------
  const handleToggleReaction = async (postId: string, reactionType: typeof REACTION_TYPES[number]['type']) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const existingReaction = post.reactions.find((r) => r.user_id === currentUser.id);

    try {
      if (existingReaction && existingReaction.type === reactionType) {
        // Remove reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setPosts(
          posts.map((p) =>
            p.id === postId
              ? { ...p, reactions: p.reactions.filter((r) => r.user_id !== currentUser.id) }
              : p
          )
        );
      } else {
        // Upsert reaction
        const { error } = await supabase
          .from('reactions')
          .upsert({
            post_id: postId,
            user_id: currentUser.id,
            type: reactionType,
          });

        if (error) throw error;

        // Trigger reaction notification
        if (post.author_id !== currentUser.id) {
          await supabase.from('notifications').insert({
            recipient_id: post.author_id,
            actor_id: currentUser.id,
            type: 'reaction',
            reference_id: postId
          });
        }

        const updatedReactions = existingReaction
          ? post.reactions.map((r) => (r.user_id === currentUser.id ? { ...r, type: reactionType } : r))
          : [...post.reactions, { post_id: postId, user_id: currentUser.id, type: reactionType }];

        setPosts(
          posts.map((p) =>
            p.id === postId ? { ...p, reactions: updatedReactions } : p
          )
        );
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    } finally {
      setHoveredPostId(null);
    }
  };

  // ----------------------------------------------------
  // Repost / Sharing Logic
  // ----------------------------------------------------
  const handleCreateRepost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repostingPost) return;

    setSharing(true);
    try {
      const { data: newPostRow, error: insertError } = await supabase
        .from('posts')
        .insert({
          author_id: currentUser.id,
          content: repostComment.trim(),
          parent_id: repostingPost.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const assembledPost: Post = {
        ...newPostRow,
        author: currentUserProfile || {
          id: currentUser.id,
          full_name: currentUser.email?.split('@')[0] || 'Member',
          profile_photo_url: null,
          headline: 'Member',
        },
        reactions: [],
        comments: [],
        parent: {
          id: repostingPost.id,
          content: repostingPost.content,
          image_url: repostingPost.image_url,
          created_at: repostingPost.created_at,
          author: repostingPost.author,
        },
      };

      setPosts([assembledPost, ...posts]);
      setRepostingPost(null);
      setRepostComment('');
    } catch (err) {
      console.error('Error reposting:', err);
      alert('Failed to share repost.');
    } finally {
      setSharing(false);
    }
  };

  // ----------------------------------------------------
  // Comments Handlers
  // ----------------------------------------------------
  const toggleComments = (postId: string) => {
    setExpandedComments({
      ...expandedComments,
      [postId]: !expandedComments[postId],
    });
  };

  const handlePostComment = async (postId: string) => {
    const commentText = newCommentText[postId]?.trim();
    if (!commentText) return;

    setSubmittingComment({ ...submittingComment, [postId]: true });

    try {
      const { data: newCommentRow, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: currentUser.id,
          content: commentText,
        })
        .select()
        .single();

      if (error) throw error;

      const assembledComment: Comment = {
        ...newCommentRow,
        author: currentUserProfile || {
          id: currentUser.id,
          full_name: currentUser.email?.split('@')[0] || 'Member',
          profile_photo_url: null,
          headline: 'Member',
        },
      };

      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...post.comments, assembledComment],
            };
          }
          return post;
        })
      );

      setNewCommentText({ ...newCommentText, [postId]: '' });

      // Trigger comment notification
      const parentPost = posts.find(p => p.id === postId);
      if (parentPost && parentPost.author_id !== currentUser.id) {
        await supabase.from('notifications').insert({
          recipient_id: parentPost.author_id,
          actor_id: currentUser.id,
          type: 'comment',
          reference_id: postId
        });
      }

      // Trigger mentions in comment content
      if (commentText.includes('@')) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name');
        if (profiles) {
          for (const p of profiles) {
            if (p.id === currentUser.id) continue;
            const fullNameRegex = new RegExp(`@${p.full_name}`, 'i');
            const firstName = p.full_name.split(' ')[0];
            const firstNameRegex = new RegExp(`@${firstName}`, 'i');
            if (fullNameRegex.test(commentText) || (firstName.length > 2 && firstNameRegex.test(commentText))) {
              await supabase.from('notifications').insert({
                recipient_id: p.id,
                actor_id: currentUser.id,
                type: 'mention',
                reference_id: postId
              });
            }
          }
        }
      }

    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment.');
    } finally {
      setSubmittingComment({ ...submittingComment, [postId]: false });
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;

      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              comments: post.comments.filter((c) => c.id !== commentId),
            };
          }
          return post;
        })
      );
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment.');
    }
  };

  // Helper: Reaction Summary counts rendering
  const renderReactionSummary = (postReactions: Reaction[]) => {
    if (postReactions.length === 0) return null;

    // Count by type
    const counts = postReactions.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort by count descending
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topReactionTypes = sorted.slice(0, 3).map((s) => s[0]);

    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex -space-x-1">
          {topReactionTypes.map((type) => {
            const match = REACTION_TYPES.find((r) => r.type === type);
            return (
              <span key={type} className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-white dark:border-slate-900 text-xs shadow-sm">
                {match?.emoji}
              </span>
            );
          })}
        </div>
        <span className="font-medium">
          {postReactions.length} {postReactions.length === 1 ? 'reaction' : 'reactions'}
        </span>
      </div>
    );
  };

  // Autocomplete suggestions search
  const postDropdownSuggestions = postMentionSearch !== null
    ? profiles.filter((p) => p.full_name.toLowerCase().includes(postMentionSearch.toLowerCase())).slice(0, 5)
    : [];

  const commentDropdownSuggestions = commentMentionSearch !== null
    ? profiles.filter((p) => p.full_name.toLowerCase().includes(commentMentionSearch.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="space-y-4">
      
      {/* 0. Campus Classmate Promo Banner Card ("Are you hiring?" style) */}
      {showConnectingCard && (
        <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800 shadow-sm rounded-xl overflow-hidden transition-colors relative">
          <button 
            onClick={() => setShowConnectingCard(false)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="p-6 text-center flex flex-col items-center">
            <div className="relative mb-3">
              {/* Circular picture with gradient border matching Somya's avatar in screenshot */}
              <div className="w-18 h-18 rounded-full p-0.5 bg-gradient-to-tr from-purple-600 via-pink-500 to-blue-500 flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden border border-white dark:border-slate-900 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || currentUser.email || 'Member')} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-purple-600 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white dark:border-slate-900 shadow-sm">
                #CONNECTING
              </span>
            </div>

            <h3 className="text-sm font-bold text-slate-850 dark:text-white mt-2">
              Hi {currentUserProfile?.full_name?.split(' ')[0] || 'there'}, are you networking?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
              Classmates active on ABES Connect are 42% more likely to secure internship referrals and job interviews!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <Link 
                href="/directory"
                className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-sm shadow-blue-500/10 transition-all cursor-pointer"
              >
                Yes, find connections
              </Link>
              <button 
                onClick={() => setShowConnectingCard(false)}
                className="px-5 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-955/20 font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                No, not right now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A. Start a Post Card */}
      <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800 shadow-sm rounded-xl p-4 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || currentUser.email || 'Member')} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <button 
            type="button"
            onClick={() => setShowPostModal(true)}
            className="flex-1 text-left bg-[#f4f2ee] hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-350 dark:border-slate-800 rounded-full px-5 py-3 text-sm text-slate-500 dark:text-slate-400 font-semibold transition-colors cursor-pointer"
          >
            Start a post
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-805">
          <button 
            type="button"
            onClick={() => { setShowPostModal(true); setTimeout(() => fileInputRef.current?.click(), 100); }}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Photo
          </button>

          <button 
            type="button"
            onClick={() => setShowPostModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Video
          </button>

          <button 
            type="button"
            onClick={() => setShowPostModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2h-3m3 2a2 2 0 00-2-2M9 11l3 3L22 4" />
            </svg>
            Write article
          </button>
        </div>
      </div>

      {/* Modal Dialog for Posting */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Create a post</h2>
              <button 
                onClick={() => { setShowPostModal(false); setNewPostContent(''); clearSelectedImage(); }}
                className="p-1 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => { handleCreatePost(e); setShowPostModal(false); }} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* User details */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || currentUser.email || 'Member')} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentUserProfile?.full_name || currentUser.email?.split('@')[0]}
                    </h3>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                      Post to anyone
                    </span>
                  </div>
                </div>

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => handlePostContentChange(e.target.value)}
                    placeholder="What do you want to talk about?"
                    rows={6}
                    className="w-full resize-none bg-transparent placeholder-slate-400 focus:outline-none text-sm text-slate-800 dark:text-slate-200"
                    autoFocus
                  />

                  {/* Autocomplete suggestions */}
                  {postDropdownSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl w-60 z-50 overflow-hidden">
                      <div className="px-3 py-1.5 text-[9px] font-extrabold text-slate-400 border-b border-slate-100 dark:border-slate-800">MENTION PEOPLE</div>
                      {postDropdownSuggestions.map((friend) => (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => handleSelectPostMention(friend)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-slate-55 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={friend.profile_photo_url || defaultAvatar(friend.full_name)} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{friend.full_name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Image Preview */}
                {imagePreview && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Preview" className="max-h-60 w-full object-contain mx-auto" />
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              {postError && (
                <div className="mx-5 p-3 text-xs text-red-650 bg-red-50 dark:bg-red-950/20 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30">
                  {postError}
                </div>
              )}

              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1">
                  <label className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-all">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageChange}
                    />
                    <svg className="w-5.5 h-5.5 text-slate-550 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={publishing || (!newPostContent.trim() && !selectedFile)}
                  className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {publishing ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Community Feed List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-12 text-center transition-colors">
            <svg className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 012 2v5a3 3 0 01-3 3h-1m-4-6h.01M9 10h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01" />
            </svg>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No posts yet</h3>
            <p className="text-sm text-slate-550 dark:text-slate-450 mt-1 max-w-sm mx-auto">
              No posts yet — be the first to share something with your connections!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const myReaction = post.reactions.find((r) => r.user_id === currentUser.id);
            const isAuthor = post.author_id === currentUser.id;
            const commentsExpanded = expandedComments[post.id] || false;
            const commentValue = newCommentText[post.id] || '';
            const commentLoading = submittingComment[post.id] || false;

            // Highlight active reaction
            const activeReactionMatch = myReaction
              ? REACTION_TYPES.find((r) => r.type === myReaction.type)
              : null;

            return (
              <div 
                key={post.id} 
                className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800 shadow-sm rounded-xl p-4 transition-colors space-y-3.5 relative"
              >
                {/* Author Info Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${post.author_id}`} className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 hover:opacity-85 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={post.author?.profile_photo_url || defaultAvatar(post.author?.full_name || 'Member')} 
                        alt={post.author?.full_name || 'Member'} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link 
                          href={`/profile/${post.author_id}`}
                          className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {post.author?.full_name}
                        </Link>
                        {post.parent_id && (
                          <span className="text-xs text-slate-400 font-medium">shared a post</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 line-clamp-1">{post.author?.headline || 'ABES Member'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{formatTimeAgo(post.created_at)}</p>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-650 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-all cursor-pointer"
                      title="Delete post"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {parseContentWithMentions(post.content)}
                </div>

                {/* Render Post image attachment */}
                {post.image_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/20 max-h-96 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={post.image_url} 
                      alt="Post attachment" 
                      className="max-h-96 w-full object-contain"
                    />
                  </div>
                )}

                {/* Repost Shared Nested Card */}
                {post.parent && (
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 mt-2 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={post.parent.author?.profile_photo_url || defaultAvatar(post.parent.author?.full_name || 'Member')} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{post.parent.author?.full_name}</p>
                        <p className="text-[9px] text-slate-400">{formatTimeAgo(post.parent.created_at)}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {parseContentWithMentions(post.parent.content)}
                    </p>

                    {post.parent.image_url && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-60 flex items-center justify-center bg-white dark:bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={post.parent.image_url} 
                          alt="Attachment" 
                          className="max-h-60 w-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Post Footer Counts Panel */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mt-4 text-[11px] text-slate-400">
                  <div>
                    {renderReactionSummary(post.reactions)}
                  </div>
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold cursor-pointer"
                  >
                    {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
                  </button>
                </div>

                {/* Posts Actions Button Bar */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 relative">
                  
                  {/* Reaction Button with Popover triggers */}
                  <div 
                    className="relative flex-1 flex justify-center py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
                    onMouseEnter={() => setHoveredPostId(post.id)}
                    onMouseLeave={() => setHoveredPostId(null)}
                  >
                    {/* Hover reactions selector popover bar */}
                    {hoveredPostId === post.id && (
                      <div className="absolute bottom-full left-0 mb-1 flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 animate-fade-in">
                        {REACTION_TYPES.map((react) => (
                          <button
                            key={react.type}
                            type="button"
                            onClick={() => handleToggleReaction(post.id, react.type)}
                            className="text-lg hover:scale-130 transition-transform p-1 cursor-pointer"
                            title={react.label}
                          >
                            {react.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleToggleReaction(post.id, 'like')}
                      className={`flex items-center gap-1.5 cursor-pointer ${
                        activeReactionMatch ? activeReactionMatch.color : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{activeReactionMatch ? activeReactionMatch.emoji : '👍'}</span>
                      <span>{activeReactionMatch ? activeReactionMatch.label : 'React'}</span>
                    </button>
                  </div>

                  {/* Comment Button */}
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
                  >
                    <svg className="w-4.5 h-4.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Comment
                  </button>

                  {/* Repost Button */}
                  <button 
                    onClick={() => setRepostingPost(post)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer"
                  >
                    <svg className="w-4.5 h-4.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742l3.26-1.63M12.443 14.382l-3.26-1.63M16.06 8.39c.645-.215 1.155-.724 1.37-1.37a2.122 2.122 0 00-.51-2.12c-.54-.54-1.376-.69-2.072-.375a2.125 2.125 0 00-1.272 1.954V8.39zM8.39 12a2.125 2.125 0 11-4.25 0 2.125 2.125 0 014.25 0zm11.86 3.61c.645-.215 1.155-.724 1.37-1.37a2.122 2.122 0 00-.51-2.12c-.54-.54-1.376-.69-2.072-.375a2.125 2.125 0 00-1.272 1.954v1.911z" />
                    </svg>
                    Repost
                  </button>
                </div>

                {/* Expanded Comments Panel */}
                {commentsExpanded && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in">
                    
                    {/* Add Comment Form */}
                    <div className="flex gap-2 items-start relative">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || currentUser.email || 'Member')} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={commentValue}
                          onChange={(e) => handleCommentTextChange(post.id, e.target.value)}
                          placeholder="Write a comment... (Type @ to mention someone)"
                          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                        />

                        {/* Comment mention autocomplete */}
                        {activeCommentPostId === post.id && commentDropdownSuggestions.length > 0 && (
                          <div className="absolute left-0 bottom-full mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl w-60 z-40 overflow-hidden">
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">MENTION PEOPLE</div>
                            {commentDropdownSuggestions.map((friend) => (
                              <button
                                key={friend.id}
                                type="button"
                                onClick={() => handleSelectCommentMention(post.id, friend)}
                                className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={friend.profile_photo_url || defaultAvatar(friend.full_name)} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{friend.full_name}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                      </div>
                      <button
                        onClick={() => handlePostComment(post.id)}
                        disabled={commentLoading || !commentValue.trim()}
                        className="px-4 py-2 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {commentLoading ? 'Posting...' : 'Post'}
                      </button>
                    </div>

                    {/* Comments list */}
                    {post.comments.length > 0 && (
                      <div className="space-y-3 pl-10">
                        {post.comments.map((comment) => {
                          const isCommentAuthor = comment.author_id === currentUser.id;
                          return (
                            <div key={comment.id} className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl relative flex items-start gap-2.5">
                              <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-slate-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={comment.author?.profile_photo_url || defaultAvatar(comment.author?.full_name || 'Member')} 
                                  alt="Avatar" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                                    {comment.author?.full_name}
                                  </span>
                                  {isCommentAuthor && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                      className="text-slate-400 hover:text-red-650 p-0.5 rounded cursor-pointer"
                                      title="Delete comment"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-350 mt-1 whitespace-pre-line">
                                  {parseContentWithMentions(comment.content)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* C. Repost commentary sharing Modal */}
      {repostingPost && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200/50 dark:border-slate-800/80 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Repost this post</h3>
              <button onClick={() => setRepostingPost(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateRepost} className="space-y-4">
              <textarea
                value={repostComment}
                onChange={(e) => setRepostComment(e.target.value)}
                placeholder="Add your thoughts or commentary (optional)..."
                rows={3}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 p-3 text-sm focus:outline-none dark:bg-slate-850 dark:text-white"
              />

              {/* Nested preview inside dialog */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/20 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{repostingPost.author?.full_name}</p>
                <p className="text-xs text-slate-655 dark:text-slate-400 mt-1 line-clamp-2">{repostingPost.content}</p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepostingPost(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                >
                  {sharing ? 'Sharing...' : 'Repost Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
