import { createClient } from '@/utils/supabase/server';
import { logout } from '@/app/auth/actions';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If there's no user, fall back to showing a nice redirect message or link,
  // although Next.js middleware handles the redirect to /login automatically.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">You must be logged in to view this page.</p>
          <Link href="/login" className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      {/* Background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-850 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">ABES</span>
              <span className="text-xl font-medium tracking-tight text-slate-850 dark:text-slate-205"> Connect</span>
            </div>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-350 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      {/* Main Home Dashboard */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-xl rounded-3xl p-8 md:p-12 relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 text-xs font-semibold mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                Authenticated Session
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Welcome
              </h1>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-400 font-medium">
                {user.email}
              </p>
            </div>
            
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 hover:border-blue-500/20 transition-all">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 mb-2">My Profile</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Set up your professional networking details to help other ABESians find you.</p>
              <Link
                href="/profile/edit"
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors inline-block"
              >
                Edit Profile &rarr;
              </Link>
            </div>

            <div className="p-6 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 hover:border-blue-500/20 transition-all">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 mb-2">Connections</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Search through the directory of verified alumni and students from your campus.</p>
              <Link
                href={`/profile/${user.id}`}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors inline-block"
              >
                View My Profile &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
