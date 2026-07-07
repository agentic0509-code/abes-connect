'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface Profile {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  headline: string | null;
  branch: string | null;
}

interface Opportunity {
  id: string;
  poster_id: string;
  title: string;
  organization: string;
  type: 'internship' | 'full_time' | 'research' | 'other';
  location: string;
  work_mode: 'onsite' | 'remote' | 'hybrid';
  description: string;
  eligible_branches: string[];
  stipend_or_salary: string | null;
  application_url: string | null;
  deadline: string;
  created_at: string;
  poster?: Profile | null;
}

interface Application {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  status: 'applied' | 'shortlisted' | 'rejected';
  note: string | null;
  created_at: string;
  applicant?: Profile | null;
  opportunity?: Opportunity | null;
}

const BRANCHES = ['CSE', 'IT', 'ECE', 'ME', 'CE', 'EN', 'MBA', 'MCA'];

export default function OpportunitiesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'postings' | 'applications'>('explore');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data states
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]); // current user's applications
  const [postings, setPostings] = useState<Opportunity[]>([]); // postings created by current user
  const [selectedPostingApps, setSelectedPostingApps] = useState<Application[]>([]); // applicants for selected posting
  const [selectedPostingId, setSelectedPostingId] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterWorkMode, setFilterWorkMode] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [showClosed, setShowClosed] = useState(false);

  // Modals state
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyNote, setApplyNote] = useState('');

  // Post form state
  const [formTitle, setFormTitle] = useState('');
  const [formOrg, setFormOrg] = useState('');
  const [formType, setFormType] = useState<'internship' | 'full_time' | 'research' | 'other'>('internship');
  const [formLocation, setFormLocation] = useState('');
  const [formWorkMode, setFormWorkMode] = useState<'onsite' | 'remote' | 'hybrid'>('onsite');
  const [formDesc, setFormDesc] = useState('');
  const [formBranches, setFormBranches] = useState<string[]>([]);
  const [formSalary, setFormSalary] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDeadline, setFormDeadline] = useState('');

  const loadData = useCallback(async (userId: string) => {
    try {
      // 1. Fetch all opportunities (ordered newest first) joined with posters profiles
      const { data: oppsData, error: oppsError } = await supabase
        .from('opportunities')
        .select('*, poster:profiles!opportunities_poster_id_fkey(id, full_name, profile_photo_url, headline, branch)')
        .order('created_at', { ascending: false });

      if (oppsError) throw oppsError;
      setOpportunities(oppsData || []);

      // 2. Fetch my applications joined with opportunities and posters
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('*, opportunity:opportunities(*)')
        .eq('applicant_id', userId)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;
      setApplications(appsData || []);

      // 3. Filter my postings
      if (oppsData) {
        setPostings(oppsData.filter((o) => o.poster_id === userId));
      }

    } catch (err) {
      console.error('Error loading opportunities board:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      loadData(user.id);
    }
    init();
  }, [supabase, router, loadData]);

  // Load applicants for a specific posting
  const loadApplicants = async (oppId: string) => {
    setSelectedPostingId(oppId);
    setSelectedPostingApps([]);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, applicant:profiles!applications_applicant_id_fkey(id, full_name, profile_photo_url, headline, branch)')
        .eq('opportunity_id', oppId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSelectedPostingApps(data || []);
    } catch (err) {
      console.error('Error loading applicants list:', err);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || submitting) return;

    if (!formTitle || !formOrg || !formLocation || !formDeadline || !formDesc) {
      alert('Please fill in all required fields!');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('opportunities')
        .insert({
          poster_id: currentUserId,
          title: formTitle.trim(),
          organization: formOrg.trim(),
          type: formType,
          location: formLocation.trim(),
          work_mode: formWorkMode,
          description: formDesc.trim(),
          eligible_branches: formBranches,
          stipend_or_salary: formSalary.trim() || null,
          application_url: formUrl.trim() || null,
          deadline: formDeadline,
        })
        .select()
        .single();

      if (error) throw error;

      alert('Opportunity posted successfully!');
      setShowPostModal(false);
      
      // Reset form
      setFormTitle('');
      setFormOrg('');
      setFormType('internship');
      setFormLocation('');
      setFormWorkMode('onsite');
      setFormDesc('');
      setFormBranches([]);
      setFormSalary('');
      setFormUrl('');
      setFormDeadline('');

      loadData(currentUserId);

    } catch (err) {
      console.error('Error creating opportunity:', err);
      alert('Failed to post opportunity.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !selectedOpp || submitting) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          opportunity_id: selectedOpp.id,
          applicant_id: currentUserId,
          status: 'applied',
          note: applyNote.trim() || null,
        });

      if (error) {
        if (error.code === '23505') {
          alert('You have already applied to this opportunity!');
        } else {
          throw error;
        }
        return;
      }

      alert('Application submitted successfully!');
      setShowApplyModal(false);
      setApplyNote('');
      setShowDetailModal(false);
      loadData(currentUserId);

    } catch (err) {
      console.error('Error applying:', err);
      alert('Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (appId: string, newStatus: 'shortlisted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) throw error;

      // Update state locally
      setSelectedPostingApps((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      );

      // Trigger a notification to the applicant!
      const targetApp = selectedPostingApps.find((app) => app.id === appId);
      if (targetApp && currentUserId) {
        await supabase.from('notifications').insert({
          recipient_id: targetApp.applicant_id,
          actor_id: currentUserId,
          type: 'connection_accepted', // Map approval notification style
          reference_id: targetApp.opportunity_id
        });
      }

    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const toggleBranchCheckbox = (branch: string) => {
    if (formBranches.includes(branch)) {
      setFormBranches(formBranches.filter((b) => b !== branch));
    } else {
      setFormBranches([...formBranches, branch]);
    }
  };

  // Filtering Logic
  const filteredOpps = opportunities.filter((opp) => {
    // Search query
    const matchSearch = 
      opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.organization.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Type filter
    const matchType = filterType === 'all' || opp.type === filterType;
    
    // Work mode filter
    const matchWorkMode = filterWorkMode === 'all' || opp.work_mode === filterWorkMode;
    
    // Branch filter
    const matchBranch = 
      filterBranch === 'all' || 
      opp.eligible_branches.length === 0 || 
      opp.eligible_branches.includes(filterBranch);

    // Deadline closed filter
    const isClosed = new Date(opp.deadline).getTime() < new Date().setHours(0, 0, 0, 0);
    const matchClosed = showClosed || !isClosed;

    return matchSearch && matchType && matchWorkMode && matchBranch && matchClosed;
  });

  const getStatusBadgeColor = (status: string) => {
    if (status === 'shortlisted') return 'bg-green-100 text-green-700 dark:bg-green-955/20 dark:text-green-400';
    if (status === 'rejected') return 'bg-red-100 text-red-750 dark:bg-red-955/20 dark:text-red-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-955/20 dark:text-blue-400';
  };

  const defaultAvatar = (name: string) => 
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div className="min-h-screen bg-[#f3f2ef] dark:bg-[#1d2226] text-[#191919] dark:text-[#f3f2ef] transition-colors duration-300">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header Board Dashboard Menu */}
        <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 border-b sm:border-b-0 border-[#dfdfdf] pb-2 sm:pb-0 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-4 py-2 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                activeTab === 'explore' 
                  ? 'text-[#0a66c2] border-[#0a66c2]' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Explore Board
            </button>
            <button
              onClick={() => setActiveTab('postings')}
              className={`px-4 py-2 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                activeTab === 'postings' 
                  ? 'text-[#0a66c2] border-[#0a66c2]' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              My Postings
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-4 py-2 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                activeTab === 'applications' 
                  ? 'text-[#0a66c2] border-[#0a66c2]' 
                  : 'text-slate-500 border-transparent hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              My Applications
            </button>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="w-full sm:w-auto px-5 py-2 bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs rounded-full shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Post an Opportunity
          </button>
        </div>

        {/* 1. EXPLORE OPPORTUNITIES BOARD VIEW */}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar Filters */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 space-y-4 h-fit">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Filters</h3>
              
              {/* Type Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Opportunity Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-[#f3f2ef] dark:bg-slate-800 text-xs border-none rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                >
                  <option value="all">All Types</option>
                  <option value="internship">Internship</option>
                  <option value="full_time">Full Time</option>
                  <option value="research">Research</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Work Mode Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Work Mode</label>
                <select
                  value={filterWorkMode}
                  onChange={(e) => setFilterWorkMode(e.target.value)}
                  className="w-full bg-[#f3f2ef] dark:bg-slate-800 text-xs border-none rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                >
                  <option value="all">All Modes</option>
                  <option value="onsite">On-Site</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Eligible Branch</label>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="w-full bg-[#f3f2ef] dark:bg-slate-800 text-xs border-none rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                >
                  <option value="all">All Branches</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Closed Opportunities Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500">Show closed postings</span>
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0a66c2] focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Opportunities List Container */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Quick Search */}
              <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-3 flex items-center gap-2">
                <svg className="w-4.5 h-4.5 text-slate-455 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search openings by title or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none text-xs focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-455"
                />
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 font-bold text-xs">Loading board...</div>
              ) : filteredOpps.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-12 text-center text-slate-400 text-xs">
                  No matching opportunities found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOpps.map((opp) => {
                    const isClosed = new Date(opp.deadline).getTime() < new Date().setHours(0, 0, 0, 0);
                    return (
                      <div
                        key={opp.id}
                        onClick={() => { setSelectedOpp(opp); setShowDetailModal(true); }}
                        className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between hover:shadow-md"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-3xs uppercase px-2 py-0.5 rounded-full font-bold bg-blue-55 dark:bg-blue-955/20 text-[#0a66c2] dark:text-blue-400">
                              {opp.type.replace('_', ' ')}
                            </span>
                            {isClosed ? (
                              <span className="text-3xs font-black text-red-600 bg-red-50 dark:bg-red-955/15 px-2 py-0.5 rounded-full">
                                Closed
                              </span>
                            ) : (
                              <span className="text-3xs font-semibold text-slate-400">
                                Apply by {new Date(opp.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 hover:underline line-clamp-1">
                            {opp.title}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-655 dark:text-slate-300">
                            {opp.organization}
                          </p>

                          <div className="flex items-center gap-1.5 text-3xs text-slate-455 mt-3">
                            <span>{opp.location}</span>
                            <span>•</span>
                            <span className="capitalize">{opp.work_mode}</span>
                            {opp.stipend_or_salary && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-slate-600 dark:text-slate-300">{opp.stipend_or_salary}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {opp.eligible_branches && opp.eligible_branches.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1">
                            {opp.eligible_branches.map((b) => (
                              <span key={b} className="text-[9px] bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. MY POSTINGS LIST VIEW */}
        {activeTab === 'postings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side list */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Your Postings</h3>
              
              {postings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-6 text-center text-slate-400 text-xs">
                  You haven&apos;t posted any opportunities yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {postings.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => loadApplicants(post.id)}
                      className={`p-4 border rounded-xl shadow-xs transition-all cursor-pointer ${
                        selectedPostingId === post.id
                          ? 'bg-blue-50/20 border-blue-505 dark:bg-blue-955/5 dark:border-blue-900'
                          : 'bg-white dark:bg-slate-900 border-[#dfdfdf] dark:border-slate-800 hover:border-slate-350'
                      }`}
                    >
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{post.title}</h4>
                      <p className="text-[10px] text-slate-500">{post.organization}</p>
                      <p className="text-[9px] text-slate-400 mt-2">Deadline: {post.deadline}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right side applicant details */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 space-y-4 min-h-[300px]">
              {selectedPostingId ? (
                <div>
                  <div className="border-b border-slate-100 dark:border-slate-805 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Applicants List</h3>
                    <p className="text-[10px] text-slate-500">Review student applications and status details.</p>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-805 mt-2">
                    {selectedPostingApps.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">No applicants yet.</div>
                    ) : (
                      selectedPostingApps.map((app) => (
                        <div key={app.id} className="py-4 flex items-start justify-between gap-3">
                          <div className="flex gap-2.5">
                            <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={app.applicant?.profile_photo_url || defaultAvatar(app.applicant?.full_name || 'Member')}
                                alt="Applicant Avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-850 dark:text-white">{app.applicant?.full_name}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{app.applicant?.headline || 'Classmate'}</p>
                              {app.applicant?.branch && (
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium text-slate-500 mt-1 inline-block">
                                  Branch: {app.applicant.branch}
                                </span>
                              )}
                              {app.note && (
                                <p className="text-[10px] italic text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-2">
                                  &ldquo;{app.note}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${getStatusBadgeColor(app.status)}`}>
                              {app.status}
                            </span>
                            
                            {app.status === 'applied' && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUpdateStatus(app.id, 'shortlisted')}
                                  className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] rounded-lg transition-colors cursor-pointer"
                                >
                                  Shortlist
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                  className="px-2.5 py-1 bg-red-655 hover:bg-red-700 text-white font-bold text-[9px] rounded-lg transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-455 text-xs text-center py-12">
                  <svg className="w-8 h-8 text-slate-350 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Select one of your postings on the left to review applicants.
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. MY APPLICATIONS LIST VIEW */}
        {activeTab === 'applications' && (
          <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Your Applications</h3>

            {applications.length === 0 ? (
              <div className="text-center py-12 text-slate-455 text-xs">
                You haven&apos;t applied to any opportunities yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-805">
                {applications.map((app) => (
                  <div key={app.id} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:underline cursor-pointer" onClick={() => { setSelectedOpp(app.opportunity!); setShowDetailModal(true); }}>
                        {app.opportunity?.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-bold">{app.opportunity?.organization}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>

                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${getStatusBadgeColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* A. POST AN OPPORTUNITY MODAL */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowPostModal(false)} />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden z-10 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Post Opportunity</h3>
              <button onClick={() => setShowPostModal(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-4 space-y-4 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineer"
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Organization *</label>
                  <input
                    type="text"
                    required
                    value={formOrg}
                    onChange={(e) => setFormOrg(e.target.value)}
                    placeholder="e.g. Google ABES Cell"
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'internship' | 'full_time' | 'research' | 'other')}
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  >
                    <option value="internship">Internship</option>
                    <option value="full_time">Full Time</option>
                    <option value="research">Research</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Work Mode *</label>
                  <select
                    value={formWorkMode}
                    onChange={(e) => setFormWorkMode(e.target.value as 'onsite' | 'remote' | 'hybrid')}
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  >
                    <option value="onsite">On-Site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Location *</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Ghaziabad"
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Salary or Stipend</label>
                  <input
                    type="text"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    placeholder="e.g. ₹25,000/month or unpaid"
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase">Deadline Date *</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Application URL (optional)</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="e.g. https://careers.org/apply"
                  className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Eligible Branches</label>
                <div className="grid grid-cols-4 gap-2">
                  {BRANCHES.map((b) => {
                    const checked = formBranches.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => toggleBranchCheckbox(b)}
                        className={`py-1.5 px-3 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                          checked
                            ? 'bg-[#0a66c2]/10 border-[#0a66c2] text-[#0a66c2]'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Explain roles, requirements, and eligibility branch criteria..."
                  className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-40 transition-all"
              >
                {submitting ? 'Posting...' : 'Publish Opening'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* B. OPPORTUNITY DETAILS DRAWER / MODAL */}
      {showDetailModal && selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowDetailModal(false)} />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden z-10 flex flex-col max-h-[80vh]">
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-955 text-[#0a66c2]">
                  {selectedOpp.type.replace('_', ' ')}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1.5">{selectedOpp.title}</h3>
                <p className="text-xs font-bold text-slate-655 dark:text-slate-350">{selectedOpp.organization}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Work Mode</span>
                  <p className="font-bold capitalize">{selectedOpp.work_mode}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Location</span>
                  <p className="font-bold">{selectedOpp.location}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Deadline</span>
                  <p className="font-bold">{selectedOpp.deadline}</p>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Stipend / Salary</span>
                  <p className="font-bold">{selectedOpp.stipend_or_salary || 'Not specified'}</p>
                </div>
              </div>

              {selectedOpp.eligible_branches && selectedOpp.eligible_branches.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase font-medium">Eligible Branches</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedOpp.eligible_branches.map((b) => (
                      <span key={b} className="bg-slate-100 dark:bg-slate-800 text-slate-655 font-bold px-2 py-0.5 rounded text-[10px]">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-medium block">Job Description</span>
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedOpp.description}
                </p>
              </div>

              {selectedOpp.application_url && (
                <div className="pt-2">
                  <a
                    href={selectedOpp.application_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0a66c2] hover:underline font-bold"
                  >
                    External Application Link &rarr;
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
              {applications.some((app) => app.opportunity_id === selectedOpp.id) ? (
                <button
                  disabled
                  className="w-full py-2 bg-green-100 text-green-700 dark:bg-green-955/20 dark:text-green-400 font-bold text-xs rounded-xl border border-green-200 dark:border-green-800"
                >
                  Applied
                </button>
              ) : new Date(selectedOpp.deadline).getTime() < new Date().setHours(0, 0, 0, 0) ? (
                <button
                  disabled
                  className="w-full py-2 bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 font-bold text-xs rounded-xl"
                >
                  Closed
                </button>
              ) : (
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="w-full py-2 bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Apply Now
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* C. APPLY NOTE MODAL */}
      {showApplyModal && selectedOpp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setShowApplyModal(false)} />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden z-10 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Apply to {selectedOpp.title}</h3>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleApply} className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-450 uppercase">Add a note to your application (optional)</label>
                <textarea
                  rows={3}
                  value={applyNote}
                  onChange={(e) => setApplyNote(e.target.value)}
                  placeholder="Share a short note about why you are interested or paste a resume link..."
                  className="w-full bg-[#f3f2ef] dark:bg-slate-800 border-none rounded p-2 text-xs focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-[#0a66c2] hover:bg-[#004182] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
