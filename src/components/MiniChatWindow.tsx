'use client';

import { useEffect, useState, useRef } from 'react';
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

interface MiniChatWindowProps {
  conversationId: string;
  currentUserId: string;
  otherUser: Profile;
  isOnline: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  rightOffset: number;
}

const COMMON_EMOJIS = ['😀', '😂', '😍', '👍', '🎉', '🔥', '🚀', '❤️', '👏', '💡', '😢', '😮'];

const POPULAR_GIFs = [
  { name: 'Celebrate', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnq0/giphy.gif' },
  { name: 'Agree', url: 'https://media.giphy.com/media/26kLTT814tbgn1IGc/giphy.gif' },
  { name: 'Wow', url: 'https://media.giphy.com/media/26ufdipODXM5lhKSI/giphy.gif' },
  { name: 'Haha', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjei1Hi/giphy.gif' },
  { name: 'Congrats', url: 'https://media.giphy.com/media/3oz8xAFtqo0LGR2TgK/giphy.gif' }
];

export default function MiniChatWindow({
  conversationId,
  currentUserId,
  otherUser,
  isOnline,
  isExpanded,
  onToggleExpand,
  onClose,
  rightOffset,
}: MiniChatWindowProps) {
  const supabase = createClient();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Emojis / GIFs overlays
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Edit / Undo state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [messages, isExpanded]);

  // Load messages
  useEffect(() => {
    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);

        // Mark unread messages as read
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', currentUserId)
          .eq('is_read', false);

      } catch (err) {
        console.error('Error loading mini-chat messages:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [supabase, conversationId, currentUserId]);

  // Realtime subscription for this conversation (INSERT, UPDATE, DELETE)
  useEffect(() => {
    const channel = supabase
      .channel(`minichat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Mark as read immediately if window is expanded and active
            if (newMsg.sender_id !== currentUserId && isExpanded) {
              await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
            );
          } else if (payload.eventType === 'DELETE') {
            const oldMsgId = (payload.old as { id: string }).id;
            setMessages((prev) => prev.filter((m) => m.id !== oldMsgId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, currentUserId, isExpanded]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });

    } catch (err) {
      console.error('Error sending mini message:', err);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    setShowGifPicker(false);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: gifUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    } catch (err) {
      console.error('Error sending GIF:', err);
    }
  };

  const handleUndoMessage = async (msgId: string) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', msgId);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
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
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div 
      className="fixed bottom-0 z-40 w-76 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl rounded-t-xl overflow-hidden transition-all duration-300 flex flex-col"
      style={{ 
        right: `${rightOffset}px`,
        height: isExpanded ? '380px' : '40px'
      }}
    >
      {/* HEADER */}
      <div className="h-10 px-3 bg-slate-105 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between select-none flex-shrink-0">
        <div 
          onClick={onToggleExpand}
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0 h-full"
        >
          <div className="relative flex-shrink-0">
            <div className="w-6.5 h-6.5 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={otherUser.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(otherUser.full_name)}`} 
                alt={otherUser.full_name} 
                className="w-full h-full object-cover"
              />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${isOnline ? 'bg-green-500 shadow-[0_0_3px_#10b981]' : 'bg-red-500'}`} />
          </div>
          <span 
            className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/profile/${otherUser.id}`);
            }}
          >
            {otherUser.full_name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Toggle Minimize/Maximize */}
          <button 
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-250 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* CHAT PANEL */}
      {isExpanded && (
        <div className="flex-1 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden relative">
          
          {/* 1. Emoji Picker Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-11 left-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-2.5 grid grid-cols-6 gap-1.5">
              {COMMON_EMOJIS.map((emoji) => (
                <button 
                  key={emoji} 
                  type="button" 
                  onClick={() => selectEmoji(emoji)} 
                  className="w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* 2. GIF Picker Popover */}
          {showGifPicker && (
            <div className="absolute bottom-11 left-2 right-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Send a GIF</div>
              <div className="grid grid-cols-2 gap-1.5">
                {POPULAR_GIFs.map((gif) => (
                  <button 
                    key={gif.name} 
                    type="button" 
                    onClick={() => handleSendGif(gif.url)} 
                    className="relative rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 h-12 hover:opacity-90 cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={gif.url} alt={gif.name} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[9px] text-white font-bold uppercase">{gif.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex justify-center items-center h-full text-slate-400 text-3xs gap-1">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-3xs">
                Say hello!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === currentUserId;
                const isGif = m.content.startsWith('http') && m.content.includes('.gif');
                const timeDiff = new Date().getTime() - new Date(m.created_at).getTime();
                const canEdit = isMe && timeDiff < 60000; // 1 minute window
                const isEditing = editingMessageId === m.id;

                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 group max-w-[85%]">
                      {/* Undo / Edit Buttons (Shows on hover for your own messages) */}
                      {isMe && !isEditing && (
                        <div className="hidden group-hover:flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => handleEditMessage(m.id, m.content)}
                              className="p-0.5 rounded text-slate-400 hover:text-blue-650 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit message"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleUndoMessage(m.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Undo / Recall message"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        </div>
                      )}

                      <div className={`rounded-xl px-2.5 py-1.5 shadow-3xs text-xs ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-105 border border-slate-200/50 dark:border-slate-700/50 rounded-bl-none'
                      }`}>
                        {isEditing ? (
                          <div className="flex flex-col gap-1 w-28">
                            <input
                              type="text"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="bg-white/10 text-white dark:text-slate-100 rounded px-1.5 py-0.5 text-3xs focus:outline-none border border-white/20"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(m.id);
                              }}
                            />
                            <div className="flex gap-1.5 justify-end text-[8px]">
                              <button type="button" onClick={() => setEditingMessageId(null)} className="underline opacity-80">Cancel</button>
                              <button type="button" onClick={() => handleSaveEdit(m.id)} className="font-black underline">Save</button>
                            </div>
                          </div>
                        ) : isGif ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.content} alt="GIF" className="max-w-28 rounded-lg shadow-sm" />
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">{m.content}</p>
                        )}
                        <div className={`text-[8.5px] mt-0.5 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {formatTime(m.created_at)}
                          {isMe && <span className="ml-0.5 font-bold">{m.is_read ? '✓✓' : '✓'}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form with Emoji/GIF toggles */}
          <form 
            onSubmit={handleSendMessage} 
            className="p-2 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 flex-shrink-0"
          >
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Emoji Toggle */}
              <button
                type="button"
                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                title="Add Emoji"
              >
                😀
              </button>
              {/* GIF Toggle */}
              <button
                type="button"
                onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); }}
                className="p-1 rounded hover:bg-slate-105 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase cursor-pointer"
                title="Send GIF"
              >
                Gif
              </button>
            </div>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-3xs focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-3xs disabled:opacity-50 transition-colors cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
