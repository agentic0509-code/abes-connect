'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import MiniChatWindow from './MiniChatWindow';

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
  const [openChatboxes, setOpenChatboxes] = useState<string[]>([]);
  const [expandedChatboxes, setExpandedChatboxes] = useState<Record<string, boolean>>({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // 2. Setup Supabase Presence for Active Status Tracking
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

  // 3. Global listener to update sidebar when chats receive messages
  useEffect(() => {
    if (!currentUserId) return;

    const globalChannel = supabase
      .channel(`chatbox_global_list:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          setConversations((prev) => {
            const hasConv = prev.some((c) => c.id === newMsg.conversation_id);
            if (!hasConv) {
              loadConversations(currentUserId);
              return prev;
            }

            return prev.map((c) => {
              if (c.id === newMsg.conversation_id) {
                const isFromOther = newMsg.sender_id !== currentUserId;
                const isChatWindowOpen = openChatboxes.includes(newMsg.conversation_id);
                // Only increment unread count if the separate mini-window for this conversation is NOT open
                const increment = isFromOther && !isChatWindowOpen;
                return {
                  ...c,
                  lastMessage: newMsg,
                  unreadCount: increment ? (c.unreadCount || 0) + 1 : c.unreadCount,
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
      supabase.removeChannel(globalChannel);
    };
  }, [currentUserId, supabase, loadConversations, openChatboxes]);

  // 4. Custom Window Event Listener for external open calls (e.g. from Profile Message Button)
  useEffect(() => {
    const handleOpenChatbox = (e: Event) => {
      const customEvent = e as CustomEvent<{ convId: string }>;
      const convId = customEvent.detail.convId;

      setOpenChatboxes((prev) => {
        if (prev.includes(convId)) return prev;
        // Limit to 3 concurrent chatboxes to avoid visual cluttering
        return [...prev, convId].slice(-3);
      });

      setExpandedChatboxes((prev) => ({
        ...prev,
        [convId]: true,
      }));
    };

    window.addEventListener('open-chatbox', handleOpenChatbox);
    return () => {
      window.removeEventListener('open-chatbox', handleOpenChatbox);
    };
  }, []);

  const handleOpenConversationInBox = (convId: string) => {
    setOpenChatboxes((prev) => {
      if (prev.includes(convId)) return prev;
      return [...prev, convId].slice(-3);
    });

    setExpandedChatboxes((prev) => ({
      ...prev,
      [convId]: true,
    }));
  };

  const handleCloseChatbox = (convId: string) => {
    setOpenChatboxes((prev) => prev.filter((id) => id !== convId));
    setExpandedChatboxes((prev) => {
      const copy = { ...prev };
      delete copy[convId];
      return copy;
    });
  };

  const handleToggleExpandChatbox = (convId: string) => {
    setExpandedChatboxes((prev) => ({
      ...prev,
      [convId]: !prev[convId],
    }));
  };

  if (!currentUserId) return null;

  // Filter out conversations that are already open in separate windows from showing unread badges in main drawer
  const totalUnreadCount = conversations
    .filter((c) => !openChatboxes.includes(c.id))
    .reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <>
      {/* 1. SEPARATE CHAT WINDOWS RENDERED SIDE-BY-SIDE */}
      {openChatboxes.map((convId, index) => {
        const conv = conversations.find((c) => c.id === convId);
        if (!conv) return null;

        const otherUser = conv.otherUser;
        if (!otherUser) return null;

        const isOnline = onlineUsers.includes(otherUser.id);
        const isExpanded = !!expandedChatboxes[convId];

        // Positioning: Right offset of 328px covers the main messaging drawer (280px + gap).
        // Each mini chat is 304px (w-76) + 20px gap = 324px.
        const rightOffset = 328 + index * 324;

        return (
          <MiniChatWindow
            key={convId}
            conversationId={convId}
            currentUserId={currentUserId}
            otherUser={otherUser}
            isOnline={isOnline}
            isExpanded={isExpanded}
            onToggleExpand={() => handleToggleExpandChatbox(convId)}
            onClose={() => handleCloseChatbox(convId)}
            rightOffset={rightOffset}
          />
        );
      })}

      {/* 2. MAIN MESSAGING COLLAPSIBLE DRAWER (STAYS ON THE VERY RIGHT) */}
      <div 
        className="fixed bottom-0 right-8 z-40 w-70 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-t-xl overflow-hidden transition-all duration-300 flex flex-col"
        style={{ height: isOpen ? '400px' : '40px' }}
      >
        {/* Header */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 px-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white flex items-center justify-between cursor-pointer shadow-md select-none flex-shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <svg className="w-4.5 h-4.5 text-blue-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs font-bold tracking-tight">Messaging</span>
            {!isOpen && totalUnreadCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-extrabold shadow-sm animate-pulse flex-shrink-0">
                {totalUnreadCount}
              </span>
            )}
          </div>
          <div>
            <svg className={`w-4.5 h-4.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Drawer Body (List of Active Chats) */}
        {isOpen && (
          <div className="flex-1 bg-slate-50/40 dark:bg-slate-900/40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850/30">
            {loading ? (
              <div className="flex justify-center items-center py-12 text-slate-400 text-3xs gap-1">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  className="mt-2 text-3xs text-blue-605 dark:text-blue-450 font-bold hover:underline cursor-pointer"
                >
                  Open Full Inbox
                </button>
              </div>
            ) : (
              conversations.map((c) => {
                const isOnline = onlineUsers.includes(c.otherUser?.id || '');
                const isOpenSeparate = openChatboxes.includes(c.id);

                return (
                  <button
                    key={c.id}
                    onClick={() => handleOpenConversationInBox(c.id)}
                    className={`w-full p-2.5 flex items-start gap-2 text-left hover:bg-slate-50/80 dark:hover:bg-slate-850/20 transition-colors ${
                      isOpenSeparate ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={c.otherUser?.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.otherUser?.full_name || '')}`} 
                          alt={c.otherUser?.full_name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                        isOnline ? 'bg-green-500 shadow-[0_0_3px_#10b981]' : 'bg-red-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-0.5">
                        <span className={`text-[11px] font-bold text-slate-850 dark:text-slate-100 truncate ${c.unreadCount && !isOpenSeparate ? 'font-extrabold' : ''}`}>
                          {c.otherUser?.full_name}
                        </span>
                      </div>
                      <p className={`text-[10px] truncate ${c.unreadCount && !isOpenSeparate ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                        {c.lastMessage?.sender_id === currentUserId ? 'You: ' : ''}
                        {c.lastMessage?.content || 'Started a conversation'}
                      </p>
                    </div>
                    {c.unreadCount && !isOpenSeparate ? (
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-extrabold flex-shrink-0">
                        {c.unreadCount}
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
