'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import ConnectButton from './ConnectButton';

interface Profile {
  id: string;
  full_name: string;
  headline: string | null;
  about: string | null;
  branch: string | null;
  graduation_year: number | null;
  skills: string[] | null;
  profile_photo_url: string | null;
  banner_image_url: string | null;
}

interface Experience {
  id: string;
  profile_id: string;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

interface Education {
  id: string;
  profile_id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number;
  end_year: number | null;
  grade: string | null;
  description: string | null;
}

interface Certification {
  id: string;
  profile_id: string;
  name: string;
  issuing_org: string;
  issue_date: string;
  expiry_date: string | null;
  credential_url: string | null;
}

interface Project {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  project_url: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface ProfileDetailsProps {
  profile: Profile;
  isOwner: boolean;
  currentUserId: string;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  initialExperiences: Experience[];
  initialEducation: Education[];
  initialCertifications: Certification[];
  initialProjects: Project[];
}

export default function ProfileDetails({
  profile,
  isOwner,
  currentUserId,
  connectionStatus,
  initialExperiences,
  initialEducation,
  initialCertifications,
  initialProjects,
}: ProfileDetailsProps) {
  const supabase = createClient();

  // Core Section States
  const [about, setAbout] = useState(profile.about || '');
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);

  const [skills, setSkills] = useState<string[]>(profile.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [savingSkills, setSavingSkills] = useState(false);

  const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
  const [education, setEducation] = useState<Education[]>(initialEducation);
  const [certifications, setCertifications] = useState<Certification[]>(initialCertifications);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Banner upload states
  const [bannerUrl, setBannerUrl] = useState(profile.banner_image_url || null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Modal States
  const [activeModal, setActiveModal] = useState<'experience' | 'education' | 'certification' | 'project' | null>(null);
  const [editingItem, setEditingItem] = useState<Experience | Education | Certification | Project | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Modals Input States
  // Experience Form
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expLocation, setExpLocation] = useState('');
  const [expStartDate, setExpStartDate] = useState('');
  const [expEndDate, setExpEndDate] = useState('');
  const [expIsCurrent, setExpIsCurrent] = useState(false);
  const [expDescription, setExpDescription] = useState('');

  // Education Form
  const [eduSchool, setEduSchool] = useState('');
  const [eduDegree, setEduDegree] = useState('');
  const [eduField, setEduField] = useState('');
  const [eduStartYear, setEduStartYear] = useState('');
  const [eduEndYear, setEduEndYear] = useState('');
  const [eduGrade, setEduGrade] = useState('');
  const [eduDescription, setEduDescription] = useState('');

  // Certification Form
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [certUrl, setCertUrl] = useState('');

  // Project Form
  const [projTitle, setProjTitle] = useState('');
  const [projDescription, setProjDescription] = useState('');
  const [projUrl, setProjUrl] = useState('');
  const [projStartDate, setProjStartDate] = useState('');
  const [projEndDate, setProjEndDate] = useState('');

  // Helper date formatters
  const formatDateRange = (start: string | null, end: string | null, isCurrent?: boolean) => {
    if (!start) return '';
    const format = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };
    return `${format(start)} — ${isCurrent ? 'Present' : end ? format(end) : 'Present'}`;
  };

  const formatYearRange = (start: number, end: number | null) => {
    return `${start} — ${end || 'Present'}`;
  };

  // ----------------------------------------------------
  // About Editor Handlers
  // ----------------------------------------------------
  const handleSaveAbout = async () => {
    setSavingAbout(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ about: about.trim() })
        .eq('id', currentUserId);

      if (error) throw error;
      setIsEditingAbout(false);
    } catch (err) {
      console.error('Error saving bio:', err);
      alert('Failed to save about section.');
    } finally {
      setSavingAbout(false);
    }
  };

  // ----------------------------------------------------
  // Skills Tag Editor Handlers
  // ----------------------------------------------------
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSkill = newSkill.trim();
    if (!cleanSkill || skills.includes(cleanSkill)) return;

    setSavingSkills(true);
    const updatedSkills = [...skills, cleanSkill];
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ skills: updatedSkills })
        .eq('id', currentUserId);

      if (error) throw error;
      setSkills(updatedSkills);
      setNewSkill('');
    } catch (err) {
      console.error('Error adding skill:', err);
    } finally {
      setSavingSkills(false);
    }
  };

  const handleRemoveSkill = async (skillToRemove: string) => {
    setSavingSkills(true);
    const updatedSkills = skills.filter((s) => s !== skillToRemove);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ skills: updatedSkills })
        .eq('id', currentUserId);

      if (error) throw error;
      setSkills(updatedSkills);
    } catch (err) {
      console.error('Error removing skill:', err);
    } finally {
      setSavingSkills(false);
    }
  };

  // ----------------------------------------------------
  // Banner Image Upload
  // ----------------------------------------------------
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Banner photo size must be less than 3MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUserId}/banner-${crypto.randomUUID()}.${fileExt}`;

      // Upload to avatars bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      if (data?.publicUrl) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ banner_image_url: data.publicUrl })
          .eq('id', currentUserId);

        if (updateError) throw updateError;
        setBannerUrl(data.publicUrl);
      }
    } catch (err) {
      console.error('Error uploading banner:', err);
      alert('Failed to upload banner image.');
    } finally {
      setUploadingBanner(false);
    }
  };

  // ----------------------------------------------------
  // Modals Add / Edit triggers
  // ----------------------------------------------------
  const openModal = (
    type: 'experience' | 'education' | 'certification' | 'project',
    item?: Experience | Education | Certification | Project
  ) => {
    setActiveModal(type);
    setEditingItem(item || null);

    if (type === 'experience') {
      const exp = item as Experience | undefined;
      setExpTitle(exp?.title || '');
      setExpCompany(exp?.company || '');
      setExpLocation(exp?.location || '');
      setExpStartDate(exp?.start_date || '');
      setExpEndDate(exp?.end_date || '');
      setExpIsCurrent(exp?.is_current || false);
      setExpDescription(exp?.description || '');
    } else if (type === 'education') {
      const edu = item as Education | undefined;
      setEduSchool(edu?.school || '');
      setEduDegree(edu?.degree || '');
      setEduField(edu?.field_of_study || '');
      setEduStartYear(edu?.start_year ? String(edu.start_year) : '');
      setEduEndYear(edu?.end_year ? String(edu.end_year) : '');
      setEduGrade(edu?.grade || '');
      setEduDescription(edu?.description || '');
    } else if (type === 'certification') {
      const cert = item as Certification | undefined;
      setCertName(cert?.name || '');
      setCertIssuer(cert?.issuing_org || '');
      setCertIssueDate(cert?.issue_date || '');
      setCertExpiryDate(cert?.expiry_date || '');
      setCertUrl(cert?.credential_url || '');
    } else if (type === 'project') {
      const proj = item as Project | undefined;
      setProjTitle(proj?.title || '');
      setProjDescription(proj?.description || '');
      setProjUrl(proj?.project_url || '');
      setProjStartDate(proj?.start_date || '');
      setProjEndDate(proj?.end_date || '');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingItem(null);
  };

  // ----------------------------------------------------
  // Database CRUD Handlers
  // ----------------------------------------------------
  // Experience CRUD
  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || !expCompany || !expStartDate) {
      alert('Title, Company, and Start Date are required.');
      return;
    }

    setModalLoading(true);
    const payload = {
      profile_id: currentUserId,
      title: expTitle,
      company: expCompany,
      location: expLocation || null,
      start_date: expStartDate,
      end_date: expIsCurrent ? null : (expEndDate || null),
      is_current: expIsCurrent,
      description: expDescription || null,
    };

    try {
      if (editingItem) {
        // Update
        const { data, error } = await supabase
          .from('experiences')
          .update(payload)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setExperiences(experiences.map((e) => (e.id === editingItem.id ? data : e)));
      } else {
        // Insert
        const { data, error } = await supabase
          .from('experiences')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setExperiences([data, ...experiences]);
      }
      closeModal();
    } catch (err) {
      console.error('Error saving experience:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experience?')) return;
    try {
      const { error } = await supabase.from('experiences').delete().eq('id', id);
      if (error) throw error;
      setExperiences(experiences.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Error deleting experience:', err);
    }
  };

  // Education CRUD
  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduSchool || !eduStartYear) {
      alert('School and Start Year are required.');
      return;
    }

    setModalLoading(true);
    const payload = {
      profile_id: currentUserId,
      school: eduSchool,
      degree: eduDegree || null,
      field_of_study: eduField || null,
      start_year: parseInt(eduStartYear),
      end_year: eduEndYear ? parseInt(eduEndYear) : null,
      grade: eduGrade || null,
      description: eduDescription || null,
    };

    try {
      if (editingItem) {
        const { data, error } = await supabase
          .from('education')
          .update(payload)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setEducation(education.map((edu) => (edu.id === editingItem.id ? data : edu)));
      } else {
        const { data, error } = await supabase
          .from('education')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setEducation([data, ...education]);
      }
      closeModal();
    } catch (err) {
      console.error('Error saving education:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education entry?')) return;
    try {
      const { error } = await supabase.from('education').delete().eq('id', id);
      if (error) throw error;
      setEducation(education.filter((edu) => edu.id !== id));
    } catch (err) {
      console.error('Error deleting education:', err);
    }
  };

  // Certification CRUD
  const handleSaveCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName || !certIssuer || !certIssueDate) {
      alert('Name, Issuing Organization, and Issue Date are required.');
      return;
    }

    setModalLoading(true);
    const payload = {
      profile_id: currentUserId,
      name: certName,
      issuing_org: certIssuer,
      issue_date: certIssueDate,
      expiry_date: certExpiryDate || null,
      credential_url: certUrl || null,
    };

    try {
      if (editingItem) {
        const { data, error } = await supabase
          .from('certifications')
          .update(payload)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setCertifications(certifications.map((c) => (c.id === editingItem.id ? data : c)));
      } else {
        const { data, error } = await supabase
          .from('certifications')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setCertifications([data, ...certifications]);
      }
      closeModal();
    } catch (err) {
      console.error('Error saving certification:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCertification = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    try {
      const { error } = await supabase.from('certifications').delete().eq('id', id);
      if (error) throw error;
      setCertifications(certifications.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting certification:', err);
    }
  };

  // Project CRUD
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle) {
      alert('Title is required.');
      return;
    }

    setModalLoading(true);
    const payload = {
      profile_id: currentUserId,
      title: projTitle,
      description: projDescription || null,
      project_url: projUrl || null,
      start_date: projStartDate || null,
      end_date: projEndDate || null,
    };

    try {
      if (editingItem) {
        const { data, error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingItem.id)
          .select()
          .single();

        if (error) throw error;
        setProjects(projects.map((p) => (p.id === editingItem.id ? data : p)));
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setProjects([data, ...projects]);
      }
      closeModal();
    } catch (err) {
      console.error('Error saving project:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Profile Details Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-xl rounded-3xl overflow-hidden transition-colors relative">
        
        {/* Banner Section */}
        <div className="h-48 relative bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 overflow-hidden group">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={bannerUrl} 
              alt="Profile Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_60%)]" />
          )}

          {/* Banner Edit Overlay */}
          {isOwner && (
            <label className="absolute right-4 top-4 p-2 bg-slate-900/60 backdrop-blur-md rounded-xl text-white hover:bg-slate-900/80 transition-all cursor-pointer shadow-lg flex items-center gap-1.5 text-xs font-semibold">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleBannerFileChange}
                disabled={uploadingBanner}
              />
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {uploadingBanner ? 'Uploading...' : 'Change Cover'}
            </label>
          )}
        </div>

        {/* Profile Card Header overlay */}
        <div className="px-8 pb-8 relative">
          
          {/* Avatar overlay */}
          <div className="relative -mt-20 mb-4 inline-block">
            <div className="w-32 h-32 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profile.profile_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.full_name)}`} 
                alt={profile.full_name} 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {profile.full_name}
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-350 font-medium mt-1">
                {profile.headline || 'ABES Engineering College Member'}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-slate-500 dark:text-slate-400">
                {profile.branch && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {profile.branch}
                  </span>
                )}
                {profile.graduation_year && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                    Class of {profile.graduation_year}
                  </span>
                )}
              </div>
            </div>

            {!isOwner && (
              <div className="flex items-center gap-3">
                <ConnectButton
                  profileId={profile.id}
                  currentUserId={currentUserId}
                  initialStatus={connectionStatus}
                />
                <button className="px-5 py-2.5 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm transition-all cursor-pointer">
                  Message
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. About Me Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-8 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">About Me</h2>
          {isOwner && (
            <button
              onClick={() => setIsEditingAbout(!isEditingAbout)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {isEditingAbout ? (
          <div className="space-y-4">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Write a brief bio about your career path, aspirations, and professional interests..."
              rows={4}
              className="w-full rounded-xl border border-slate-300 focus:ring-blue-500 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-white p-3 text-sm focus:outline-none transition-colors"
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setAbout(profile.about || '');
                  setIsEditingAbout(false);
                }}
                disabled={savingAbout}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAbout}
                disabled={savingAbout}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {savingAbout ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-slate-650 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-line">
            {about ? about : (
              isOwner ? (
                <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer" onClick={() => setIsEditingAbout(true)}>
                  No about summary added yet. Click here to add a summary about yourself!
                </div>
              ) : 'No bio summary added yet.'
            )}
          </div>
        )}
      </div>

      {/* 3. Experiences Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-8 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Experience</h2>
          {isOwner && (
            <button
              onClick={() => openModal('experience')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Experience
            </button>
          )}
        </div>

        {experiences.length === 0 ? (
          isOwner && (
            <div 
              onClick={() => openModal('experience')}
              className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
            >
              No experience added yet. Add your work experience to highlight your professional history!
            </div>
          )
        ) : (
          <div className="space-y-6">
            {experiences.map((exp, idx) => (
              <div 
                key={exp.id} 
                className={`flex justify-between items-start ${idx > 0 ? 'border-t border-slate-100 dark:border-slate-800/80 pt-6' : ''}`}
              >
                <div>
                  <h3 className="font-bold text-base text-slate-950 dark:text-white">{exp.title}</h3>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{exp.company}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <span>{formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</span>
                    {exp.location && <span>• {exp.location}</span>}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 whitespace-pre-line leading-relaxed">{exp.description}</p>
                  )}
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openModal('experience', exp)}
                      className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="p-1 rounded-lg text-slate-450 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-955/20 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Education Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-8 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Education</h2>
          {isOwner && (
            <button
              onClick={() => openModal('education')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Education
            </button>
          )}
        </div>

        {education.length === 0 ? (
          isOwner && (
            <div 
              onClick={() => openModal('education')}
              className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
            >
              No education credentials listed yet. Add your school or university history!
            </div>
          )
        ) : (
          <div className="space-y-6">
            {education.map((edu, idx) => (
              <div 
                key={edu.id} 
                className={`flex justify-between items-start ${idx > 0 ? 'border-t border-slate-100 dark:border-slate-800/80 pt-6' : ''}`}
              >
                <div>
                  <h3 className="font-bold text-base text-slate-950 dark:text-white">{edu.school}</h3>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 mt-0.5">
                    {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <span>{formatYearRange(edu.start_year, edu.end_year)}</span>
                    {edu.grade && <span>• Grade: {edu.grade}</span>}
                  </p>
                  {edu.description && (
                    <p className="text-xs text-slate-650 dark:text-slate-405 mt-3 whitespace-pre-line leading-relaxed">{edu.description}</p>
                  )}
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openModal('education', edu)}
                      className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="p-1 rounded-lg text-slate-455 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-955/20 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Skills Tag Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-8 transition-colors">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-6">Skills</h2>

        {/* Add Skill Form for Owner */}
        {isOwner && (
          <form onSubmit={handleAddSkill} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="e.g. React, Python, Cloud Computing"
              className="flex-1 rounded-xl border border-slate-300 focus:ring-blue-500 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-white px-4 py-2 text-sm focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={savingSkills}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-755 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Add Tag
            </button>
          </form>
        )}

        {skills.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No skills added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {skills.map((skill) => (
              <span 
                key={skill}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100/50 dark:border-blue-900/30"
              >
                <span>{skill}</span>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="p-0.5 rounded-full hover:bg-blue-200/50 dark:hover:bg-blue-900/60 text-blue-500 dark:text-blue-400 hover:text-blue-800 transition-colors cursor-pointer"
                    title={`Remove ${skill}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 6. Certifications Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-8 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Certifications</h2>
          {isOwner && (
            <button
              onClick={() => openModal('certification')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Certification
            </button>
          )}
        </div>

        {certifications.length === 0 ? (
          isOwner && (
            <div 
              onClick={() => openModal('certification')}
              className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
            >
              No certifications listed yet. Highlight your badges and qualifications!
            </div>
          )
        ) : (
          <div className="space-y-6">
            {certifications.map((cert, idx) => (
              <div 
                key={cert.id} 
                className={`flex justify-between items-start ${idx > 0 ? 'border-t border-slate-100 dark:border-slate-800/80 pt-6' : ''}`}
              >
                <div>
                  <h3 className="font-bold text-base text-slate-950 dark:text-white">{cert.name}</h3>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 mt-0.5">{cert.issuing_org}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Issued: {formatDateRange(cert.issue_date, cert.expiry_date)}
                  </p>
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-2.5"
                    >
                      View Credential
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openModal('certification', cert)}
                      className="p-1 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCertification(cert.id)}
                      className="p-1 rounded-lg text-slate-455 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-955/20 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Projects Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-md rounded-3xl p-8 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Projects</h2>
          {isOwner && (
            <button
              onClick={() => openModal('project')}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          isOwner && (
            <div 
              onClick={() => openModal('project')}
              className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
            >
              No projects added yet. Showcase your academic or coding creations!
            </div>
          )
        ) : (
          <div className="space-y-6">
            {projects.map((proj, idx) => (
              <div 
                key={proj.id} 
                className={`flex justify-between items-start ${idx > 0 ? 'border-t border-slate-100 dark:border-slate-800/80 pt-6' : ''}`}
              >
                <div>
                  <h3 className="font-bold text-base text-slate-950 dark:text-white">{proj.title}</h3>
                  {proj.start_date && (
                    <p className="text-xs text-slate-500 dark:text-slate-405 mt-0.5">
                      {formatDateRange(proj.start_date, proj.end_date)}
                    </p>
                  )}
                  {proj.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 whitespace-pre-line leading-relaxed">{proj.description}</p>
                  )}
                  {proj.project_url && (
                    <a
                      href={proj.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-3"
                    >
                      Project Link
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>

                {isOwner && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openModal('project', proj)}
                      className="p-1 rounded-lg text-slate-455 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="p-1 rounded-lg text-slate-455 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-955/20 dark:hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------
          FORM OVERLAY MODALS
          ---------------------------------------------------- */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200/50 dark:border-slate-800/80 transition-colors max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white capitalize">
                {editingItem ? 'Edit' : 'Add'} {activeModal}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* EXPERIENCE FORM */}
            {activeModal === 'experience' && (
              <form onSubmit={handleSaveExperience} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="e.g. Software Engineer Intern"
                    className="w-full rounded-xl border border-slate-350 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="e.g. Google India"
                    className="w-full rounded-xl border border-slate-350 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    value={expLocation}
                    onChange={(e) => setExpLocation(e.target.value)}
                    placeholder="e.g. Noida, UP (Hybrid)"
                    className="w-full rounded-xl border border-slate-350 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={expStartDate}
                      onChange={(e) => setExpStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-350 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                  {!expIsCurrent && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        value={expEndDate}
                        onChange={(e) => setExpEndDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-350 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="expCurrent"
                    checked={expIsCurrent}
                    onChange={(e) => setExpIsCurrent(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="expCurrent" className="text-xs font-bold text-slate-655 dark:text-slate-350 cursor-pointer">
                    I currently work in this role
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    value={expDescription}
                    onChange={(e) => setExpDescription(e.target.value)}
                    placeholder="Describe your accomplishments, technologies used, or duties..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-350 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-705 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {modalLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* EDUCATION FORM */}
            {activeModal === 'education' && (
              <form onSubmit={handleSaveEducation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">School / College *</label>
                  <input
                    type="text"
                    required
                    value={eduSchool}
                    onChange={(e) => setEduSchool(e.target.value)}
                    placeholder="e.g. ABES Engineering College"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Degree</label>
                  <input
                    type="text"
                    value={eduDegree}
                    onChange={(e) => setEduDegree(e.target.value)}
                    placeholder="e.g. Bachelor of Technology"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Field of Study</label>
                  <input
                    type="text"
                    value={eduField}
                    onChange={(e) => setEduField(e.target.value)}
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Year *</label>
                    <input
                      type="number"
                      required
                      value={eduStartYear}
                      onChange={(e) => setEduStartYear(e.target.value)}
                      placeholder="e.g. 2022"
                      className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Year (or Expected)</label>
                    <input
                      type="number"
                      value={eduEndYear}
                      onChange={(e) => setEduEndYear(e.target.value)}
                      placeholder="e.g. 2026"
                      className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Grade (CGPA / %)</label>
                  <input
                    type="text"
                    value={eduGrade}
                    onChange={(e) => setEduGrade(e.target.value)}
                    placeholder="e.g. 8.4 CGPA or 84%"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    value={eduDescription}
                    onChange={(e) => setEduDescription(e.target.value)}
                    placeholder="Describe your societies, clubs, or academic accomplishments..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-705 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {modalLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* CERTIFICATION FORM */}
            {activeModal === 'certification' && (
              <form onSubmit={handleSaveCertification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    placeholder="e.g. AWS Certified Cloud Practitioner"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Issuing Organization *</label>
                  <input
                    type="text"
                    required
                    value={certIssuer}
                    onChange={(e) => setCertIssuer(e.target.value)}
                    placeholder="e.g. Amazon Web Services (AWS)"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Issue Date *</label>
                    <input
                      type="date"
                      required
                      value={certIssueDate}
                      onChange={(e) => setCertIssueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={certExpiryDate}
                      onChange={(e) => setCertExpiryDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Credential URL</label>
                  <input
                    type="url"
                    value={certUrl}
                    onChange={(e) => setCertUrl(e.target.value)}
                    placeholder="https://credentials.example.com/verify/..."
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-705 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {modalLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            {/* PROJECT FORM */}
            {activeModal === 'project' && (
              <form onSubmit={handleSaveProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    placeholder="e.g. Chat Application"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Project Link (GitHub / Live)</label>
                  <input
                    type="url"
                    value={projUrl}
                    onChange={(e) => setProjUrl(e.target.value)}
                    placeholder="https://github.com/my-profile/chat-app"
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      value={projStartDate}
                      onChange={(e) => setProjStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={projEndDate}
                      onChange={(e) => setProjEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</label>
                  <textarea
                    value={projDescription}
                    onChange={(e) => setProjDescription(e.target.value)}
                    placeholder="Explain the project scope, architectures used, or specific features..."
                    rows={4}
                    className="w-full rounded-xl border border-slate-355 dark:border-slate-700 p-2.5 text-sm dark:bg-slate-850 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-705 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    {modalLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
