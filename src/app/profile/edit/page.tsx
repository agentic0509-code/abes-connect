'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Profile form state
  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [branch, setBranch] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [skills, setSkills] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Branches list for ABES Engineering College
  const branches = [
    'Computer Science & Engineering (CSE)',
    'Information Technology (IT)',
    'Computer Science & Engineering (AIML)',
    'Computer Science & Engineering (DS)',
    'Electronics & Communication Engineering (ECE)',
    'Electrical & Electronics Engineering (EEE)',
    'Mechanical Engineering (ME)',
    'Civil Engineering (CE)',
    'MCA (Master of Computer Applications)',
    'MBA (Master of Business Administration)',
    'Other'
  ];

  useEffect(() => {
    async function loadProfile() {
      try {
        setError(null);
        // Get user session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }

        setUserId(user.id);

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 means row not found (which is fine, they can create one)
          throw profileError;
        }

        if (profile) {
          setFullName(profile.full_name || '');
          setHeadline(profile.headline || '');
          setAbout(profile.about || '');
          setBranch(profile.branch || '');
          setGradYear(profile.graduation_year ? String(profile.graduation_year) : '');
          setSkills(profile.skills ? profile.skills.join(', ') : '');
          setPhotoUrl(profile.profile_photo_url || '');
          setPreviewUrl(profile.profile_photo_url || null);
        } else {
          // Default fallbacks from email if profile doesn't exist
          const defaultName = (user.email || '').split('@')[0] || '';
          setFullName(defaultName);
          setHeadline('ABES Engineering College Member');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Photo size must be less than 2MB.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let finalPhotoUrl = photoUrl;

      // 1. Upload photo if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, {
            upsert: true,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        // Retrieve public URL
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (data) {
          finalPhotoUrl = data.publicUrl;
        }
      }

      // 2. Format skills as text array
      const skillsArray = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // 3. Upsert profile row
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: fullName,
        headline,
        about,
        branch,
        graduation_year: gradYear ? parseInt(gradYear, 10) : null,
        skills: skillsArray,
        profile_photo_url: finalPhotoUrl,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) throw upsertError;

      setSuccess('Profile updated successfully!');
      
      // Delay redirect to allow user to see success
      setTimeout(() => {
        router.push(`/profile/${userId}`);
        router.refresh();
      }, 1500);

    } catch (err) {
      console.error('Error saving profile:', err);
      const errMsg = err instanceof Error ? err.message : 'An error occurred while saving your profile.';
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-650 dark:text-slate-400 font-semibold text-sm">Loading your profile details...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href={userId ? `/profile/${userId}` : '/home'} 
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Cancel & Go Back
          </Link>
          <h1 className="text-xl font-bold">Edit Profile</h1>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-3xl border border-slate-200/50 dark:border-slate-800/80 p-8 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Status Messages */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-sm text-green-600 dark:text-green-400 flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Avatar Section */}
            <div className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner cursor-pointer hover:opacity-80 transition-opacity group"
                title="Click to upload photo"
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {/* Visual hover overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Profile Photo</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Accepts PNG, JPG, or JPEG. Maximum 2MB size.</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Upload New Photo
                </button>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aditya Pathak"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">
                  Headline
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Software Engineer | CSE Graduate 2026"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">
                  College Branch / Department
                </label>
                <select
                  required
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-sm transition-colors"
                >
                  <option value="" disabled>Select Branch</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">
                  Graduation Year
                </label>
                <input
                  type="number"
                  required
                  min="2000"
                  max="2035"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-sm transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">
                  Skills (Comma-separated)
                </label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Next.js, React, Node.js, Python, TypeScript"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-sm transition-colors"
                />
                <p className="mt-1 text-xs text-slate-500">Provide skills separated by a comma (e.g. React, Docker).</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-705 dark:text-slate-300 mb-1.5">
                  About Me / Bio
                </label>
                <textarea
                  rows={5}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell the community about your background, achievements, academic interest, and target career fields..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white text-sm transition-colors"
                />
              </div>

            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving Changes...
                  </span>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
