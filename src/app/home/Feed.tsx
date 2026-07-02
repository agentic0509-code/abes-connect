'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  headline: string | null;
}

interface Like {
  post_id: string;
  user_id: string;
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
  author: Profile | null;
  likes: Like[];
  comments: Comment[];
}

interface FeedProps {
  initialPosts: Post[];
  currentUser: {
    id: string;
    email?: string;
  };
  currentUserProfile: Profile | null;
}

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Fallback for future/skewed clocks
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

export default function Feed({ initialPosts, currentUser, currentUserProfile }: FeedProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<Post[]>(initialPosts);
  
  // Post creation state
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Comments sections states: tracks which post IDs have expanded comment panels
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
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

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedFile) return;

    setPublishing(true);
    setPostError(null);

    try {
      let imageUrl: string | null = null;
      const tempPostId = crypto.randomUUID(); // Premature UUID for file nesting path

      // 1. Upload post image if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${currentUser.id}/${tempPostId}.${fileExt}`;

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
          id: tempPostId,
          author_id: currentUser.id,
          content: newPostContent,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Assemble the new post local state object
      const assembledPost: Post = {
        ...newPostRow,
        author: currentUserProfile || {
          id: currentUser.id,
          full_name: currentUser.email?.split('@')[0] || 'Member',
          profile_photo_url: null,
          headline: 'Member',
        },
        likes: [],
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
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post.');
    }
  };

  const handleToggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasLiked = post.likes.some((l) => l.user_id === currentUser.id);

    try {
      if (hasLiked) {
        // Unlike post
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        // Update state
        setPosts(
          posts.map((p) =>
            p.id === postId
              ? { ...p, likes: p.likes.filter((l) => l.user_id !== currentUser.id) }
              : p
          )
        );
      } else {
        // Like post
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id,
          });

        if (error) throw error;

        // Update state
        setPosts(
          posts.map((p) =>
            p.id === postId
              ? { ...p, likes: [...p.likes, { post_id: postId, user_id: currentUser.id }] }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const toggleCommentsExpansion = (postId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const commentText = newCommentText[postId] || '';
    if (!commentText.trim()) return;

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

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

      // Assemble comment local object
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
        posts.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, assembledComment] }
            : p
        )
      );

      // Clear input
      setNewCommentText((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment.');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setPosts(
        posts.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
            : p
        )
      );
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment.');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Create Post Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-lg rounded-3xl p-6 transition-colors">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || currentUser.email || 'Member')} 
                alt="My Profile Picture" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <textarea
                rows={3}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share an update, ask a question, or highlight an achievement..."
                className="w-full text-sm border-0 focus:ring-0 focus:outline-none resize-none dark:bg-slate-900 placeholder-slate-450 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Post Image Preview */}
          {imagePreview && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Upload Preview" className="max-h-72 w-full object-contain" />
              <button
                type="button"
                onClick={clearSelectedImage}
                className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
                title="Remove Photo"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {postError && (
            <p className="text-xs font-semibold text-red-500">{postError}</p>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Add Photo
            </button>

            <button
              type="submit"
              disabled={publishing || (!newPostContent.trim() && !selectedFile)}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-md shadow-blue-500/10"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts List Feed */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-12 text-center transition-colors">
            <svg className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 012 2v5a3 3 0 01-3 3h-1m-4-6h.01M9 10h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01" />
            </svg>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Posts Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Be the first to publish a post and start the conversation in the ABES Connect community!
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const hasLiked = post.likes.some((l) => l.user_id === currentUser.id);
            const isAuthor = post.author_id === currentUser.id;
            const commentsExpanded = expandedComments[post.id] || false;
            const commentValue = newCommentText[post.id] || '';
            const commentLoading = submittingComment[post.id] || false;

            return (
              <div 
                key={post.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-lg rounded-3xl p-6 transition-colors space-y-4"
              >
                {/* Author Info Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${post.author_id}`} className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 hover:opacity-85 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={post.author?.profile_photo_url || defaultAvatar(post.author?.full_name || 'Member')} 
                        alt={post.author?.full_name || 'Member'} 
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div>
                      <Link href={`/profile/${post.author_id}`} className="text-sm font-bold text-slate-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {post.author?.full_name}
                      </Link>
                      <p className="text-xs text-slate-550 dark:text-slate-450 line-clamp-1">{post.author?.headline || 'ABES Engineering College Member'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{formatTimeAgo(post.created_at)}</p>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                      title="Delete Post"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                {/* Post Image */}
                {post.image_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={post.image_url} 
                      alt="Post attachment" 
                      className="max-h-96 w-full object-cover"
                    />
                  </div>
                )}

                {/* Action Metrics Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold ${
                        hasLiked ? 'text-blue-650 dark:text-blue-400' : ''
                      }`}
                    >
                      {hasLiked ? (
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-current" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-.8 1.6v.8z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                      )}
                      <span>{post.likes.length} Likes</span>
                    </button>

                    <button
                      onClick={() => toggleCommentsExpansion(post.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-bold"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{post.comments.length} Comments</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Comments Panel */}
                {commentsExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
                    
                    {/* Add Comment Input Form */}
                    <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || currentUser.email || 'Member')} 
                          alt="My Profile Picture" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={commentValue}
                          onChange={(e) => setNewCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-xs transition-colors"
                        />
                        <button
                          type="submit"
                          disabled={commentLoading || !commentValue.trim()}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-650 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </form>

                    {/* Comments List */}
                    {post.comments.length > 0 && (
                      <div className="space-y-3 pt-2">
                        {post.comments.map((comment) => {
                          const isCommentOwner = comment.author_id === currentUser.id;
                          return (
                            <div key={comment.id} className="flex gap-3 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-900/50">
                              <Link href={`/profile/${comment.author_id}`} className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 hover:opacity-85 transition-opacity">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={comment.author?.profile_photo_url || defaultAvatar(comment.author?.full_name || 'Member')} 
                                  alt={comment.author?.full_name || 'Member'} 
                                  className="w-full h-full object-cover"
                                />
                              </Link>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Link href={`/profile/${comment.author_id}`} className="text-xs font-bold text-slate-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                      {comment.author?.full_name}
                                    </Link>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 font-medium">{formatTimeAgo(comment.created_at)}</span>
                                  </div>

                                  {isCommentOwner && (
                                    <button
                                      onClick={() => handleDeleteComment(post.id, comment.id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                                      title="Delete Comment"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{comment.content}</p>
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

    </div>
  );
}
