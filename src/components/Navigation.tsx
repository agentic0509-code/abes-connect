'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import FloatingChatbox from './FloatingChatbox';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
}

export default function Navigation() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  useEffect(() => {
    async function loadSessionAndData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

        // 1. Fetch user profile details
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, profile_photo_url')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // 2. Fetch pending requests count
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
      name: 'Messaging', 
      href: '/messages',
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
                <div className="relative">
                  {link.icon}
                  {link.badge && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.5 bg-red-500 text-white rounded-full text-[8px] font-black leading-none">
                      {link.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-1 tracking-tight">{link.name}</span>
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
