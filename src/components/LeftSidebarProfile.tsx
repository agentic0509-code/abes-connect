'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  headline: string | null;
}

interface LeftSidebarProfileProps {
  currentUserProfile: Profile | null;
  currentUserId: string;
  userEmail?: string;
  connectionCount: number;
}

export default function LeftSidebarProfile({
  currentUserProfile,
  currentUserId,
  userEmail,
  connectionCount,
}: LeftSidebarProfileProps) {
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div className="space-y-4">
      {/* Profile summary card */}
      <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl transition-colors relative overflow-hidden">
        {/* Banner Background */}
        <div className="h-14 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 absolute inset-x-0 top-0" />
        
        <div className="relative pt-6 pb-4 px-4 text-center">
          <div className="w-18 h-18 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-sm mx-auto relative -mt-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={currentUserProfile?.profile_photo_url || defaultAvatar(currentUserProfile?.full_name || userEmail || 'Member')} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <Link 
            href={`/profile/${currentUserId}`}
            className="font-extrabold text-slate-900 dark:text-white mt-3 text-sm hover:underline block truncate"
          >
            {currentUserProfile?.full_name || userEmail?.split('@')[0]}
          </Link>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 px-1 font-medium">
            {currentUserProfile?.headline || 'ABES Engineering College Member'}
          </p>
        </div>

        {/* Profile Statistics */}
        <div className="py-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-2">
          <Link 
            href="/directory"
            className="flex items-center justify-between px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 py-1 cursor-pointer transition-colors"
          >
            <span className="font-semibold">Profile viewers</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">181</span>
          </Link>
          <Link 
            href="/directory"
            className="flex items-center justify-between px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 py-1 cursor-pointer transition-colors"
          >
            <span className="font-semibold">Connections</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">{connectionCount}</span>
          </Link>
        </div>

        {/* Premium Promotion */}
        <div 
          onClick={() => setShowPremiumModal(true)}
          className="p-3 border-t border-slate-100 dark:border-slate-800 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all"
        >
          <p className="text-slate-400">Grow your career with Premium</p>
          <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs inline-block" />
            Don&apos;t miss: Premium for ₹0
          </p>
        </div>

        {/* Saved Items */}
        <div 
          onClick={() => setShowSavedModal(true)}
          className="p-3 border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors rounded-b-xl flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>Saved items</span>
        </div>
      </div>

      {/* Premium Upgrade Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative text-center space-y-4">
            <button 
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-955 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Upgrade to ABES Premium</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Get exclusive access to direct recruiter lists, advanced profiling tools, mock interview sets, and priority classmate networking for ₹0!
              </p>
            </div>
            <button 
              onClick={() => { alert('Congratulations! You are now an ABES Premium Member (Free Tier).'); setShowPremiumModal(false); }}
              className="w-full py-2 bg-gradient-to-r from-amber-505 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Activate Free Premium Now
            </button>
          </div>
        </div>
      )}

      {/* Saved Items Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative space-y-4">
            <button 
              onClick={() => setShowSavedModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Saved Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your bookmarks and starred campus resources.
              </p>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
              <div className="py-2.5">
                <span className="text-3xs bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded">Placement Guide</span>
                <p className="text-xs font-bold text-slate-850 dark:text-slate-200 mt-1">ABES placement prep questions 2026</p>
              </div>
              <div className="py-2.5">
                <span className="text-3xs bg-green-55 dark:bg-green-955 text-green-600 dark:text-green-400 font-bold px-2 py-0.5 rounded">Syllabus</span>
                <p className="text-xs font-bold text-slate-850 dark:text-slate-200 mt-1">CSE branch final semester roadmap</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
