import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors duration-300">
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full filter blur-[100px] opacity-20 dark:opacity-10 animate-pulse-slow -z-10" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-sky-400 rounded-full filter blur-[100px] opacity-20 dark:opacity-10 animate-pulse-slow -z-10" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Custom SVG Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">ABES</span>
              <span className="text-xl font-medium tracking-tight text-slate-800 dark:text-slate-200"> Connect</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
            <a href="#stats" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Our Network</a>
            <a href="#testimonials" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Success Stories</a>
            <a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-sm font-semibold rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-900 transition-all duration-200 cursor-pointer">
              Log in
            </button>
            <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all duration-200 cursor-pointer">
              Sign up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 sm:pt-16 sm:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left">
            <div className="inline-flex items-center justify-center lg:justify-start gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold w-fit mx-auto lg:mx-0 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
              Empowering ABES Alumni & Students
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
              Bridging the Gap Between
              <span className="block mt-2 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 bg-clip-text text-transparent">
                Learning & Leadership
              </span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Welcome to the exclusive professional network for ABES Engineering College. Connect with industry veterans, find mentors, discover job referrals, and collaborate with your peers.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
                Join ABES Connect
              </button>
              <button className="px-8 py-4 rounded-xl font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
                Welcome Back
              </button>
            </div>

            {/* Quick trust metrics */}
            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
              <div>
                <span className="block text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">10k+</span>
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Verified Alumni</span>
              </div>
              <div>
                <span className="block text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">500+</span>
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Active Mentors</span>
              </div>
              <div>
                <span className="block text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">95%</span>
                <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Career Growth</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md sm:max-w-lg aspect-square lg:aspect-auto lg:h-[480px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 animate-float bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <Image
                src="/hero_networking.png"
                alt="ABES Connect Network Illustration"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 500px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-blue-950/20 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Designed Exclusively for ABESians
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Everything you need to navigate your career from a campus freshman to an industry expert.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-slate-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">Alumni Directory</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Filter and find alumni by graduation year, industry, target companies, or geographic location.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-slate-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">1-on-1 Mentorship</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect directly with seniors for resume reviews, mock interviews, and career roadmaps.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-slate-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">Exclusive Jobs Board</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Apply for internal job postings and internships recommended or posted directly by alumni.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-slate-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">Project Collaboration</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Build hackathon teams, share open-source college repositories, and co-develop software.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials / Success Stories */}
      <section id="testimonials" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Success Stories from Our Campus
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              See how connecting on ABES Connect has accelerated careers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Testimonial 1 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-md flex flex-col justify-between">
              <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                &ldquo;ABES Connect completely changed my placement preparation. I reached out to a senior who graduated in 2022 working at Microsoft. He reviewed my resume, suggested key projects, and gave me two mock interviews. I landed my dream software developer offer!&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                  AP
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-950 dark:text-white">Aditya Pathak</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Batch of 2026 (CSE) • Placed at Microsoft</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-md flex flex-col justify-between">
              <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                &ldquo;As an alumnus, I always wanted a structured way to give back to ABES. With this platform, I have mentored over a dozen students and referred three high-potential graduates directly into our engineering team at Amazon.&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-lg shadow-inner">
                  NS
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-950 dark:text-white">Neha Sharma</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Batch of 2021 (IT) • SDE-II at Amazon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-800 py-12 px-6 sm:px-12 lg:px-16 text-center shadow-xl shadow-blue-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_50%)] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to unlock your professional potential?
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Create your profile today, align with industry experts, and join the exclusive professional ecosystem of ABES Engineering College.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-col sm:flex-row max-w-md mx-auto">
            <button className="px-6 py-3.5 rounded-xl font-bold bg-white text-blue-700 shadow-md hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
              Get Started for Free
            </button>
            <button className="px-6 py-3.5 rounded-xl font-bold bg-transparent border border-white/60 text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
              Explore Directory
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">ABES Connect</span>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center sm:text-left">
            &copy; 2026 ABES Connect. Built for the ABES Engineering College Community. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <a href="#" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a href="#" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 4.161c-.81.36-1.683.603-2.597.712.932-.56 1.65-1.444 1.987-2.502-.872.518-1.84.896-2.868 1.1-.823-.878-1.996-1.428-3.3-1.428-2.497 0-4.524 2.027-4.524 4.524 0 .355.04.702.118 1.034-3.758-.188-7.09-1.99-9.32-4.725-.39.669-.614 1.44-.614 2.264 0 1.57.8 2.955 2.015 3.766-.74-.022-1.438-.227-2.046-.565v.057c0 2.193 1.56 4.02 3.63 4.437-.38.104-.78.16-1.19.16-.29 0-.57-.028-.85-.08.575 1.796 2.24 3.102 4.214 3.138-1.543 1.21-3.49 1.93-5.605 1.93-.364 0-.724-.02-1.078-.06 2.002 1.282 4.38 2.03 6.93 2.03 8.31 0 12.85-6.884 12.85-12.85 0-.195-.005-.39-.014-.583.882-.638 1.65-1.436 2.26-2.548z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
