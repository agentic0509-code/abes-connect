'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  headline: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  created_at: string;
  p1: Profile;
  p2: Profile;
  messages: Message[];
  otherUser?: Profile; // Derived client-side
  lastMessage?: Message; // Derived client-side
  unreadCount?: number; // Derived client-side
}

function MessagesPageContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetConvId = searchParams.get('convId');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Emojis / GIFs overlays
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Edit / Undo state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🔥', '🚀', '❤️', '👏', '💡', '😢', '😮'];

  const POPULAR_GIFs = [
    { name: 'Celebrate', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnq0/giphy.gif' },
    { name: 'Agree', url: 'https://media.giphy.com/media/26kLTT814tbgn1IGc/giphy.gif' },
    { name: 'Wow', url: 'https://media.giphy.com/media/26ufdipODXM5lhKSI/giphy.gif' },
    { name: 'Haha', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjei1Hi/giphy.gif' },
    { name: 'Congrats', url: 'https://media.giphy.com/media/3oz8xAFtqo0LGR2TgK/giphy.gif' }
  ];


  // Load conversations list
  const loadConversations = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        created_at,
        p1:profiles!conversations_participant_1_fkey (id, full_name, profile_photo_url, headline),
        p2:profiles!conversations_participant_2_fkey (id, full_name, profile_photo_url, headline),
        messages (id, conversation_id, content, sender_id, is_read, created_at)
      `);

    if (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }

    if (data) {
      interface DBProfile {
        id: string;
        full_name: string;
        profile_photo_url: string | null;
        headline: string | null;
      }
      interface DBConversation {
        id: string;
        created_at: string;
        p1: DBProfile;
        p2: DBProfile;
        messages: Message[];
      }

      const processed: Conversation[] = (data as unknown as DBConversation[]).map((c) => {
        const otherUser = c.p1.id === userId ? c.p2 : c.p1;
        const msgs = c.messages || [];
        // Sort messages by created_at ascending
        const sortedMsgs = [...msgs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const lastMessage = sortedMsgs[sortedMsgs.length - 1];
        const unreadCount = msgs.filter(
          (m) => m.sender_id !== userId && !m.is_read
        ).length;

        return {
          id: c.id,
          created_at: c.created_at,
          p1: c.p1,
          p2: c.p2,
          messages: sortedMsgs,
          otherUser,
          lastMessage,
          unreadCount,
        };
      });

      // Sort conversations: newest activity first
      processed.sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
        const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
        return bTime - aTime;
      });

      setConversations(processed);
      return processed;
    }
    return [];
  }, [supabase]);

  // Load accepted connections
  const loadConnections = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('connections')
      .select(`
        requester_id,
        receiver_id,
        requester:profiles!connections_requester_id_fkey(id, full_name, profile_photo_url, headline),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, profile_photo_url, headline)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) {
      console.error('Error fetching connections:', error);
      return;
    }

    if (data) {
      interface DBConnection {
        requester_id: string;
        receiver_id: string;
        requester: Profile;
        receiver: Profile;
      }
      const list = (data as unknown as DBConnection[]).map((c) => {
        if (c.requester_id === userId) return c.receiver;
        return c.requester;
      }).filter(Boolean) as Profile[];
      setConnections(list);
    }
  }, [supabase]);

  const loadThread = useCallback(async (convId: string) => {
    if (!currentUserId) return;
    setLoadingThread(true);
    try {
      // Fetch messages
      const { data: threadMsgs, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(threadMsgs || []);

      // Mark messages as read
      const { error: readError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);

      if (readError) throw readError;

      // Update unread badge in sidebar state immediately
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      );

    } catch (err) {
      console.error('Error loading chat thread:', err);
    } finally {
      setLoadingThread(false);
    }
  }, [supabase, currentUserId]);

  const handleUndoMessage = async (msgId: string) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', msgId);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      loadConversations(currentUserId || '');
    } catch (err) {
      console.error('Error recalling message:', err);
    }
  };

  const handleEditMessage = (msgId: string, currentContent: string) => {
    setEditingMessageId(msgId);
    setEditingContent(currentContent);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingContent.trim()) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: editingContent.trim() })
        .eq('id', msgId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: editingContent.trim() } : m))
      );
      setEditingMessageId(null);
      loadConversations(currentUserId || '');
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    setShowGifPicker(false);
    if (!activeConvId || !currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          sender_id: currentUserId,
          content: gifUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger message notification
      const activeConversation = conversations.find((c) => c.id === activeConvId);
      const recipientId = activeConversation?.otherUser?.id;
      if (recipientId) {
        await supabase.from('notifications').insert({
          recipient_id: recipientId,
          actor_id: currentUserId,
          type: 'message',
          reference_id: activeConvId
        });
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // Update conversations list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, lastMessage: data, unreadCount: 0 }
            : c
        )
      );
    } catch (err) {
      console.error('Error sending GIF:', err);
    }
  };

  const selectEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  // 1. Authenticate user & load initial data
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUserId(user.id);

        // Fetch conversations and connections
        const [convList] = await Promise.all([
          loadConversations(user.id),
          loadConnections(user.id),
        ]);

        // Resolve active conversation ID based on query param or default to first
        let initialActiveId = targetConvId;
        if (!initialActiveId && convList && convList.length > 0) {
          initialActiveId = convList[0].id;
        }

        if (initialActiveId) {
          setActiveConvId(initialActiveId);
          // Load thread messages
          const { data: threadMsgs, error: threadError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', initialActiveId)
            .order('created_at', { ascending: true });

          if (threadError) throw threadError;
          setMessages(threadMsgs || []);

          // Mark messages as read
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', initialActiveId)
            .neq('sender_id', user.id)
            .eq('is_read', false);
        }

      } catch (err) {
        console.error('Error during messaging initialization:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabase, router, targetConvId, loadConversations, loadConnections]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3.5 Setup Supabase Presence for Active Status Tracking
  useEffect(() => {
    if (!currentUserId) return;

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = Object.keys(state);
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUserId, supabase]);

  // 3. Setup Supabase Realtime Listeners
  useEffect(() => {
    if (!currentUserId || !activeConvId) return;

    // Realtime channel for all message events in active thread (INSERT, UPDATE, DELETE)
    const activeChannel = supabase
      .channel(`active_messages:${activeConvId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConvId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark incoming message as read if we are viewing the thread
            if (newMsg.sender_id !== currentUserId) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id);
            }

            // Update last message in sidebar
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConvId
                  ? { ...c, lastMessage: newMsg, unreadCount: 0 }
                  : c
              )
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeConvId
                  ? { ...c, lastMessage: updatedMsg }
                  : c
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldMsgId = (payload.old as { id: string }).id;
            setMessages((prev) => prev.filter((m) => m.id !== oldMsgId));
            loadConversations(currentUserId);
          }
        }
      )
      .subscribe();

    // Global listener to update sidebar when other chats receive messages
    const globalChannel = supabase
      .channel(`global_messages:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === activeConvId) return; // Handled by active channel

          // Verify if this message conversation belongs to our list
          setConversations((prev) => {
            const hasConv = prev.some((c) => c.id === newMsg.conversation_id);
            if (!hasConv) {
              // Reload conversations list entirely to discover new thread
              loadConversations(currentUserId);
              return prev;
            }

            return prev.map((c) => {
              if (c.id === newMsg.conversation_id) {
                const isFromOther = newMsg.sender_id !== currentUserId;
                return {
                  ...c,
                  lastMessage: newMsg,
                  unreadCount: isFromOther ? (c.unreadCount || 0) + 1 : c.unreadCount,
                };
              }
              return c;
            }).sort((a, b) => {
              const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : new Date(a.created_at).getTime();
              const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : new Date(b.created_at).getTime();
              return bTime - aTime;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activeChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [currentUserId, activeConvId, supabase, loadConversations]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvId || !currentUserId) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          sender_id: currentUserId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger message notification
      const activeConversation = conversations.find((c) => c.id === activeConvId);
      const recipientId = activeConversation?.otherUser?.id;
      if (recipientId) {
        await supabase.from('notifications').insert({
          recipient_id: recipientId,
          actor_id: currentUserId,
          type: 'message',
          reference_id: activeConvId
        });
      }

      // Optimistically append message to local state
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // Update sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, lastMessage: data } : c
        )
      );

    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message.');
    }
  };

  // 5. Start new conversation from modal
  const handleStartNewChat = async (targetUserId: string) => {
    if (!currentUserId) return;
    try {
      const [p1, p2] = [currentUserId, targetUserId].sort();

      // Check if conversation exists
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        setActiveConvId(existing.id);
        loadThread(existing.id);
        router.push(`/messages?convId=${existing.id}`);
      } else {
        // Create new
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant_1: p1,
            participant_2: p2,
          })
          .select('id')
          .single();

        if (createError) throw createError;

        // Reload conversations to include the new one
        await loadConversations(currentUserId);
        setActiveConvId(created.id);
        loadThread(created.id);
        router.push(`/messages?convId=${created.id}`);
      }

      setShowNewChatModal(false);
    } catch (err) {
      console.error('Error initiating conversation:', err);
      alert('Failed to start chat.');
    }
  };

  // Format message time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Filter connections search
  const filteredConnections = connections.filter((c) =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-4rem)] flex flex-col">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-xl rounded-3xl overflow-hidden flex flex-1 max-h-[820px]">
          
          {/* LEFT SIDEBAR - CONVERSATIONS LIST */}
          <div className={`w-full md:w-80 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col ${activeConvId && 'hidden md:flex'}`}>
            <div className="p-4 border-b border-slate-200/85 dark:border-slate-800/85 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Messaging</h2>
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-955/40 text-blue-650 dark:text-blue-350 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors shadow-sm cursor-pointer"
                title="New Message"
              >
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850/40">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Loading chats...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-400">
                  <p className="text-sm">No conversations yet.</p>
                  <button 
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Start a chat
                  </button>
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = c.id === activeConvId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveConvId(c.id);
                        loadThread(c.id);
                        router.push(`/messages?convId=${c.id}`);
                      }}
                      className={`w-full p-4 flex items-start gap-3 text-left transition-all hover:bg-slate-50/70 dark:hover:bg-slate-850/30 ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-955/20 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={c.otherUser?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.otherUser?.full_name || '')}`} 
                            alt={c.otherUser?.full_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          onlineUsers.includes(c.otherUser?.id || '') ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-0.5">
                          <span className={`text-sm font-bold truncate text-slate-900 dark:text-slate-100 ${c.unreadCount ? 'font-extrabold' : ''}`}>
                            {c.otherUser?.full_name}
                          </span>
                          {c.lastMessage && (
                            <span className="text-2xs text-slate-400 whitespace-nowrap">
                              {formatTime(c.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        {c.otherUser?.headline && (
                          <p className="text-3xs text-slate-400 truncate mb-1">
                            {c.otherUser.headline}
                          </p>
                        )}
                        <p className={`text-xs truncate ${c.unreadCount ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                          {c.lastMessage?.sender_id === currentUserId ? 'You: ' : ''}
                          {c.lastMessage?.content || 'Started a conversation'}
                        </p>
                      </div>
                      {(c.unreadCount || 0) > 0 && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 shadow-sm shadow-blue-500/20">
                          {c.unreadCount}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL - CHAT THREAD */}
          <div className={`flex-1 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 ${!activeConvId && 'hidden md:flex'}`}>
            {activeConvId && activeConversation ? (
              <>
                {/* Header */}
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setActiveConvId(null);
                      router.push('/messages');
                    }}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div 
                    className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer"
                    onClick={() => router.push(`/profile/${activeConversation.otherUser?.id}`)}
                  >
                    <div className="w-full h-full rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={activeConversation.otherUser?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeConversation.otherUser?.full_name || '')}`} 
                        alt={activeConversation.otherUser?.full_name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      onlineUsers.includes(activeConversation.otherUser?.id || '') ? 'bg-green-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:underline inline-block"
                      onClick={() => router.push(`/profile/${activeConversation.otherUser?.id}`)}
                    >
                      {activeConversation.otherUser?.full_name}
                    </h3>
                    <p className="text-3xs text-slate-400 truncate">
                      {activeConversation.otherUser?.headline || 'ABES Member'}
                    </p>
                  </div>
                </div>

                {/* Messages view */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingThread ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-xs">Loading messages...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                      <svg className="w-10 h-10 text-slate-350 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 10.742h.008v.008h-.008v-.008zm.37 0h.008v.008h-.008v-.008zm.37 0h.008v.008h-.008v-.008zm2.772 0h.008v.008h-.008v-.008zm.37 0h.008v.008h-.008v-.008zm.37 0h.008v.008h-.008v-.008zM12 8a3.993 3.993 0 00-3.993 3.993c0 2.206 1.787 3.993 3.993 3.993a3.993 3.993 0 003.993-3.993A3.993 3.993 0 0012 8zm0 10.5h.005a7.5 7.5 0 01-5.304-2.196L4.5 18.5v-3.75a7.5 7.5 0 1111.25 0V18.5l-2.196-2.196A7.5 7.5 0 0112 18.5z" />
                      </svg>
                      <span className="text-sm">Say hello to start the conversation!</span>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender_id === currentUserId;
                      const isGif = m.content.startsWith('http') && m.content.includes('.gif');
                      const timeDiff = new Date().getTime() - new Date(m.created_at).getTime();
                      const canEdit = isMe && timeDiff < 60000; // 1 minute window
                      const isEditing = editingMessageId === m.id;

                      return (
                        <div 
                          key={m.id} 
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-center gap-2 group`}
                        >
                          {/* Undo / Edit Buttons (hover actions for your own messages) */}
                          {isMe && !isEditing && (
                            <div className="hidden group-hover:flex items-center gap-1.5 order-first">
                              {canEdit && (
                                <button
                                  onClick={() => handleEditMessage(m.id, m.content)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-blue-650 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit message"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleUndoMessage(m.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Undo / Recall message"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018-8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </button>
                            </div>
                          )}

                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-105 border border-slate-200/50 dark:border-slate-700/50 rounded-bl-none'
                          }`}>
                            {isEditing ? (
                              <div className="flex flex-col gap-2 w-48">
                                <input
                                  type="text"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="bg-white/10 dark:bg-slate-950 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none border border-white/20"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(m.id);
                                  }}
                                />
                                <div className="flex gap-2 justify-end text-[10px]">
                                  <button type="button" onClick={() => setEditingMessageId(null)} className="underline opacity-80 cursor-pointer">Cancel</button>
                                  <button type="button" onClick={() => handleSaveEdit(m.id)} className="font-bold underline cursor-pointer">Save</button>
                                </div>
                              </div>
                            ) : isGif ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.content} alt="GIF" className="max-w-48 rounded-lg shadow-sm" />
                            ) : (
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            )}

                            <div className={`text-[10px] mt-1 text-right ${
                              isMe ? 'text-blue-200' : 'text-slate-400'
                            }`}>
                              {formatTime(m.created_at)}
                              {isMe && (
                                <span className="ml-1.5 font-bold">
                                  {m.is_read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send input box with Emoji / GIF picker popovers */}
                <div className="relative">
                  {/* Emoji Picker Popover */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-18 left-4 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-3 grid grid-cols-6 gap-2">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button 
                          key={emoji} 
                          type="button" 
                          onClick={() => selectEmoji(emoji)} 
                          className="w-8 h-8 flex items-center justify-center text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* GIF Picker Popover */}
                  {showGifPicker && (
                    <div className="absolute bottom-18 left-4 right-4 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl p-4 max-h-48 overflow-y-auto space-y-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Send a GIF</div>
                      <div className="grid grid-cols-2 gap-2">
                        {POPULAR_GIFs.map((gif) => (
                          <button 
                            key={gif.name} 
                            type="button" 
                            onClick={() => handleSendGif(gif.url)} 
                            className="relative rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 h-16 hover:opacity-90 cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={gif.url} alt={gif.name} className="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-3xs text-white font-bold uppercase">{gif.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form 
                    onSubmit={handleSendMessage}
                    className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3"
                  >
                    <div className="flex items-center gap-1">
                      {/* Emoji Toggle */}
                      <button
                        type="button"
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-lg cursor-pointer"
                        title="Add Emoji"
                      >
                        😀
                      </button>
                      {/* GIF Toggle */}
                      <button
                        type="button"
                        onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 cursor-pointer"
                        title="Send GIF"
                      >
                        Gif
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write a message..."
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="h-10 px-5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Send</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-450 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Inbox</h3>
                <p className="text-sm max-w-xs mt-1 text-slate-400">
                  Select a chat or click the compose button to send a message to one of your connected college friends.
                </p>
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Start New Message
                </button>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* NEW CHAT MODAL */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowNewChatModal(false)}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden z-10 flex flex-col max-h-[500px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">New Message</h3>
              <button 
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655"
              >
                <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
              <input
                type="text"
                placeholder="Search connected classmates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500"
              />
            </div>

            {/* Connections list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredConnections.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  {connections.length === 0 
                    ? 'Connect with classmates to start messaging!' 
                    : 'No matching connections found.'}
                </div>
              ) : (
                filteredConnections.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleStartNewChat(profile.id)}
                    className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 text-left transition-colors cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={profile.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.full_name)}`} 
                          alt={profile.full_name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                        onlineUsers.includes(profile.id) ? 'bg-green-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                        {profile.full_name}
                      </span>
                      {profile.headline && (
                        <span className="text-3xs text-slate-450 dark:text-slate-400 truncate block">
                          {profile.headline}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Loading inbox...</span>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
