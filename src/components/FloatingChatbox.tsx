'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

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

export default function FloatingChatbox() {
  const supabase = createClient();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      console.error('Error fetching conversations in chatbox:', error);
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

  // Load messages thread
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
      console.error('Error loading chat thread in chatbox:', err);
    } finally {
      setLoadingThread(false);
    }
  }, [supabase, currentUserId]);

  // 1. Authenticate user & load initial data
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        // Fetch conversations
        await loadConversations(user.id);
      } catch (err) {
        console.error('Error during chatbox initialization:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabase, loadConversations]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // 2. Setup Supabase Realtime Listeners
  useEffect(() => {
    if (!currentUserId) return;

    // Active thread listener
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    if (activeConvId) {
      activeChannel = supabase
        .channel(`chatbox_active:${activeConvId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConvId}`,
          },
          async (payload) => {
            const newMsg = payload.new as Message;
            
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark incoming message as read if chatbox is expanded
            if (newMsg.sender_id !== currentUserId && isOpen) {
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
          }
        )
        .subscribe();
    }

    // Global listener for new conversation messages updating lists/badge
    const globalChannel = supabase
      .channel(`chatbox_global:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.conversation_id === activeConvId) return;

          setConversations((prev) => {
            const hasConv = prev.some((c) => c.id === newMsg.conversation_id);
            if (!hasConv) {
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
      if (activeChannel) supabase.removeChannel(activeChannel);
      supabase.removeChannel(globalChannel);
    };
  }, [currentUserId, activeConvId, isOpen, supabase, loadConversations]);

  // 3. Send Message Handler
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

      // Optimistically append message
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
      console.error('Error sending message in chatbox:', err);
    }
  };

  // Format message time
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!currentUserId) return null;

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="fixed bottom-0 right-8 z-40 w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-t-2xl overflow-hidden transition-all duration-300 flex flex-col"
      style={{ height: isOpen ? '450px' : '48px' }}
    >
      {/* HEADER */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 px-4 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white flex items-center justify-between cursor-pointer shadow-md select-none"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-105" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm font-bold tracking-tight">Messaging</span>
          {!isOpen && totalUnreadCount > 0 && (
            <span className="w-5.5 h-5.5 rounded-full bg-red-500 text-white flex items-center justify-center text-3xs font-extrabold shadow-sm animate-pulse">
              {totalUnreadCount}
            </span>
          )}
        </div>
        <div>
          <svg className={`w-5.5 h-5.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* DRAWER BODY (ONLY RENDER IF OPEN) */}
      {isOpen && (
        <div className="flex-1 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
          {activeConvId && activeConversation ? (
            /* ACTIVE CONVERSATION THREAD */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Back to list header */}
              <div className="h-10 px-3 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={() => {
                    setActiveConvId(null);
                    setMessages([]);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div 
                  className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-850 cursor-pointer"
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/profile/${activeConversation.otherUser?.id}`);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={activeConversation.otherUser?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeConversation.otherUser?.full_name || '')}`} 
                    alt={activeConversation.otherUser?.full_name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span 
                  className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:underline"
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/profile/${activeConversation.otherUser?.id}`);
                  }}
                >
                  {activeConversation.otherUser?.full_name}
                </span>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loadingThread ? (
                  <div className="flex justify-center items-center h-full text-slate-400 text-3xs gap-1.5">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-3xs">
                    Say hello to start the chat!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === currentUserId;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-1.5 shadow-3xs text-xs ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-105 border border-slate-200/50 dark:border-slate-700/50 rounded-bl-none'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <div className={`text-[9px] mt-0.5 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                            {formatTime(m.created_at)}
                            {isMe && <span className="ml-1 font-bold">{m.is_read ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            /* CONVERSATIONS LIST VIEW */
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850/40">
              {loading ? (
                <div className="flex justify-center items-center py-12 text-slate-400 text-3xs gap-1.5">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading inbox...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs px-4">
                  <p>No chats yet.</p>
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      router.push('/messages');
                    }}
                    className="mt-2 text-3xs text-blue-650 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    Open Full Inbox
                  </button>
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveConvId(c.id);
                      loadThread(c.id);
                    }}
                    className="w-full p-3 flex items-start gap-2.5 text-left hover:bg-slate-50/80 dark:hover:bg-slate-850/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-855 flex-shrink-0 border border-slate-200/50 dark:border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={c.otherUser?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.otherUser?.full_name || '')}`} 
                        alt={c.otherUser?.full_name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className={`text-xs font-bold text-slate-900 dark:text-slate-100 truncate ${c.unreadCount ? 'font-extrabold' : ''}`}>
                          {c.otherUser?.full_name}
                        </span>
                        {c.lastMessage && (
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatTime(c.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <p className={`text-3xs truncate ${c.unreadCount ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                        {c.lastMessage?.sender_id === currentUserId ? 'You: ' : ''}
                        {c.lastMessage?.content || 'Started a conversation'}
                      </p>
                    </div>
                    {(c.unreadCount || 0) > 0 && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-extrabold flex-shrink-0">
                        {c.unreadCount}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
