'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import FloatingChatbox from './FloatingChatbox';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
}

interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'reaction' | 'comment' | 'connection_request' | 'connection_accepted' | 'mention' | 'message';
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
  } | null;
}

export default function Navigation() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Notifications states
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  const loadNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey(id, full_name, profile_photo_url)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data);
        setUnreadNotifCount(data.filter((n) => !n.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [supabase]);

  const handleMarkAllRead = async () => {
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notif.id);
        
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }

    setNotifDropdownOpen(false);

    if (notif.type === 'message') {
      router.push(`/messages?convId=${notif.reference_id}`);
    } else if (notif.type === 'connection_request') {
      router.push('/requests');
    } else if (notif.type === 'connection_accepted') {
      router.push(`/profile/${notif.actor_id}`);
    } else if (notif.type === 'reaction' || notif.type === 'comment' || notif.type === 'mention') {
      router.push('/home');
    }
  };

  const getNotificationText = (notif: Notification) => {
    const name = notif.actor?.full_name || 'Someone';
    if (notif.type === 'reaction') return `${name} reacted to your post`;
    if (notif.type === 'comment') return `${name} commented on your post`;
    if (notif.type === 'connection_request') return `${name} sent you a connection request`;
    if (notif.type === 'connection_accepted') return `${name} accepted your connection request`;
    if (notif.type === 'mention') return `${name} mentioned you in a post`;
    if (notif.type === 'message') return `${name} sent you a message`;
    return `${name} triggered an action`;
  };

  const getElapsedTime = (isoString: string) => {
    const created = new Date(isoString).getTime();
    const now = new Date().getTime();
    const diffMs = now - created;

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    async function loadSessionAndData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        const { count } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('status', 'pending');

        setPendingCount(count || 0);

      } catch (err) {
        console.error('Error loading navigation data:', err);
      }
    }

    loadSessionAndData();
  }, [supabase]);

  useEffect(() => {
    if (!currentUserId) return;

    // Defer state update to next tick to satisfy eslint rule
    setTimeout(() => {
      loadNotifications(currentUserId);
    }, 0);

    const channel = supabase
      .channel(`notifs:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        () => {
          loadNotifications(currentUserId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, loadNotifications]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const activeTheme = savedTheme || systemTheme;
    
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Defer state update to next tick to satisfy eslint rule
    setTimeout(() => {
      setTheme(activeTheme as 'light' | 'dark');
    }, 0);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const navLinks = [
    { 
      name: 'Home', 
      href: '/home',
      icon: (
        <svg className="w-5.5 h-5.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      )
    },
    { 
      name: 'Classmates', 
      href: '/directory',
      icon: (
        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      name: 'Requests', 
      href: '/requests', 
      badge: pendingCount > 0 ? pendingCount : undefined,
      icon: (
        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    { 
      name: 'Opportunities', 
      href: '/opportunities',
      icon: (
        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: 'Notifications', 
      href: '#',
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      icon: (
        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    { 
      name: 'Messaging', 
      href: '/messages',
      badge: undefined,
      icon: (
        <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#1d2226] border-b border-[#dfdfdf] dark:border-slate-805 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Left Side: Logo & Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Link href="/home" className="flex items-center gap-1.5 hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded bg-[#0a66c2] flex items-center justify-center font-bold text-white text-base shadow-sm">
              ac
            </div>
            <span className="text-sm font-extrabold text-[#0a66c2] tracking-tight hidden lg:inline">ABES Connect</span>
          </Link>
          
          <div className="relative w-full hidden sm:block max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search classmates..."
              className="w-full bg-[#eef3f8] dark:bg-slate-800 text-xs border-none focus:outline-none focus:ring-1 focus:ring-[#0a66c2] rounded pl-9 pr-3 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  router.push(`/directory?search=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
            />
          </div>
        </div>

        {/* Right Side: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 h-full">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const isNotifications = link.name === 'Notifications';

            const linkContent = (
              <>
                <div className="relative">
                  {link.icon}
                  {link.badge && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.5 bg-red-500 text-white rounded-full text-[8px] font-black leading-none">
                      {link.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1 tracking-tight">{link.name}</span>
              </>
            );

            if (isNotifications) {
              return (
                <div key={link.name} className="relative h-full flex flex-col items-center">
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className={`h-14 flex flex-col items-center justify-center min-w-16 px-1 text-center transition-colors relative border-b-2 cursor-pointer ${
                      notifDropdownOpen 
                        ? 'text-slate-900 border-slate-900 dark:text-white dark:border-white' 
                        : 'text-slate-500 border-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {linkContent}
                  </button>

                  {/* Dropdown Menu */}
                  {notifDropdownOpen && (
                    <div className="absolute top-14 right-0 z-50 w-80 bg-white dark:bg-[#1d2226] border border-[#dfdfdf] dark:border-slate-800 shadow-2xl rounded-b-xl overflow-hidden py-1">
                      <div className="px-4 py-2 border-b border-[#dfdfdf] dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Notifications</span>
                        {unreadNotifCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[10px] font-extrabold text-[#0a66c2] hover:underline cursor-pointer"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-[#dfdfdf] dark:divide-slate-800">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-3 flex items-start gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-left ${
                                !notif.is_read ? 'bg-blue-50/30 dark:bg-blue-955/10' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={notif.actor?.profile_photo_url || defaultAvatar(notif.actor?.full_name || 'Member')}
                                  alt="Actor photo"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[10.5px] text-slate-700 dark:text-slate-350 leading-snug break-words ${
                                  !notif.is_read ? 'font-bold text-slate-900 dark:text-white' : ''
                                }`}>
                                  {getNotificationText(notif)}
                                </p>
                                <span className="text-[9px] text-slate-400 block mt-1">
                                  {getElapsedTime(notif.created_at)}
                                </span>
                              </div>
                              {!notif.is_read && (
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 mt-1.5" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`h-14 flex flex-col items-center justify-center min-w-16 px-1 text-center transition-colors relative border-b-2 ${
                  isActive 
                    ? 'text-slate-900 border-slate-900 dark:text-white dark:border-white' 
                    : 'text-slate-500 border-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {linkContent}
              </Link>
            );
          })}

          {/* "Me" Avatar & Profile dropdown */}
          {currentUserId && (
            <Link
              href={`/profile/${currentUserId}`}
              className={`h-14 flex flex-col items-center justify-center min-w-16 px-1 text-center transition-colors relative border-b-2 ${
                pathname === `/profile/${currentUserId}`
                  ? 'text-slate-900 border-slate-900 dark:text-white dark:border-white'
                  : 'text-slate-500 border-transparent hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <div className="w-5.5 h-5.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={profile?.profile_photo_url || defaultAvatar(profile?.full_name || 'Member')} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-[10px] font-semibold mt-1 flex items-center gap-0.5 tracking-tight">
                Me
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="h-14 flex flex-col items-center justify-center min-w-16 px-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border-b-2 border-transparent cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            )}
            <span className="text-[10px] font-semibold mt-1 tracking-tight">Theme</span>
          </button>

          {/* Simple Logout button modeled after premium dropdown */}
          <button
            onClick={handleLogout}
            className="h-14 flex flex-col items-center justify-center min-w-16 px-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border-b-2 border-transparent cursor-pointer"
          >
            <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[10px] font-semibold mt-1 tracking-tight">Logout</span>
          </button>
        </nav>

        {/* Mobile Navigation Toggle (Hamburger) */}
        <div className="flex items-center gap-3 md:hidden">
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-bold">
              {pendingCount}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-650 hover:text-blue-600 dark:text-slate-350 dark:hover:text-blue-400 cursor-pointer"
            title="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Expanding Drawer Panel */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 px-4 py-4 space-y-3 transition-all duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-450' 
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'
                }`}
              >
                <span>{link.name}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-805">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={profile?.profile_photo_url || defaultAvatar(profile?.full_name || 'Member')} 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{profile?.full_name || 'My Account'}</span>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Log out
            </button>
          </div>
        </nav>
      )}
      {/* Global Collapsible Chat Widget Support */}
      <FloatingChatbox />
    </header>
  );
}
