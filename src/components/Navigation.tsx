'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

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
    { name: 'Home', href: '/home' },
    { name: 'Directory', href: '/directory' },
    { 
      name: 'Requests', 
      href: '/requests', 
      badge: pendingCount > 0 ? pendingCount : undefined 
    },
    { name: 'My Profile', href: currentUserId ? `/profile/${currentUserId}` : '/profile/edit' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-850/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo and Brand */}
        <Link href="/home" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20">
            <svg className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">ABES</span>
            <span className="text-lg font-medium tracking-tight text-slate-800 dark:text-slate-200"> Connect</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`text-sm font-semibold relative transition-colors ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400'
                }`}
              >
                {link.name}
                {link.badge && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-bold">
                    {link.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </Link>
            );
          })}

          {/* User Mini Avatar / Edit Profile Link */}
          {currentUserId && (
            <Link 
              href="/profile/edit"
              className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 hover:opacity-85 transition-opacity"
              title="Edit Profile"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profile?.profile_photo_url || defaultAvatar(profile?.full_name || 'Member')} 
                alt="Profile Avatar" 
                className="w-full h-full object-cover"
              />
            </Link>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
          >
            Log out
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
    </header>
  );
}
