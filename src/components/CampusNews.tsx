'use client';

import { useState } from 'react';

export default function CampusNews() {
  const [showAllNews, setShowAllNews] = useState(false);
  const [showPuzzleModal, setShowPuzzleModal] = useState(false);

  // WordPlay puzzle game state
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  
  const targetWord = 'STUDY'; // 5-letter campus word

  const newsItems = [
    { id: 1, title: 'Campus placement drive peaks', time: '2d ago', readers: '1,248 readers' },
    { id: 2, title: 'ABES Internal Hackathon 2026 registration starts', time: '1d ago', readers: '842 readers' },
    { id: 3, title: 'Alumni Meet scheduled for next month', time: '4d ago', readers: '2,110 readers' },
    { id: 4, title: 'AI Research center inaugurated at college', time: '5d ago', readers: '593 readers' },
    { id: 5, title: 'Classmate interaction guidelines updated', time: '6d ago', readers: '312 readers' },
    // Expanded news
    { id: 6, title: 'Annual cultural fest registration opens next Monday', time: '7d ago', readers: '1,980 readers' },
    { id: 7, title: 'Tech seminar on Web3 architecture scheduled', time: '8d ago', readers: '421 readers' },
    { id: 8, title: 'ABES sports club trials to begin this weekend', time: '1w ago', readers: '702 readers' },
    { id: 9, title: 'Library expands digital subscription resources', time: '1w ago', readers: '512 readers' },
    { id: 10, title: 'New student orientation schedule published', time: '2w ago', readers: '918 readers' }
  ];

  const visibleNews = showAllNews ? newsItems : newsItems.slice(0, 5);

  const handlePuzzleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedGuess = guess.toUpperCase().trim();
    
    if (formattedGuess.length !== 5) {
      alert('Guess must be exactly 5 letters!');
      return;
    }

    const nextAttempts = [...attempts, formattedGuess];
    setAttempts(nextAttempts);
    setGuess('');

    if (formattedGuess === targetWord) {
      setGameWon(true);
      setGameOver(true);
    } else if (nextAttempts.length >= 3) {
      setGameOver(true);
    }
  };

  const resetPuzzle = () => {
    setGuess('');
    setAttempts([]);
    setGameOver(false);
    setGameWon(false);
  };

  return (
    <div className="space-y-4">
      {/* ABES Connect News Card */}
      <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">ABES Connect News</h3>
          <svg className="w-4 h-4 text-slate-500 hover:text-slate-700 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <div className="space-y-3">
          {visibleNews.map((item) => (
            <div key={item.id} className="group cursor-pointer">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                {item.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {item.time} • {item.readers}
              </p>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setShowAllNews(!showAllNews)}
          className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-755 dark:hover:text-white mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          {showAllNews ? 'Show less' : 'Show more'}
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllNews ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Puzzles Widget Card */}
      <div className="bg-white dark:bg-slate-900 border border-[#dfdfdf] dark:border-slate-800/80 shadow-sm rounded-xl p-4 transition-colors">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Today&apos;s puzzles</h3>
        <div 
          onClick={() => setShowPuzzleModal(true)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-955 flex items-center justify-center text-amber-700 dark:text-amber-400 font-black text-xs">
            W
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">WordPlay #25</h4>
            <p className="text-[10px] text-slate-400 font-medium">3 connections played</p>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Puzzle Modal Overlay */}
      {showPuzzleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative space-y-4">
            <button 
              onClick={() => { setShowPuzzleModal(false); resetPuzzle(); }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-805 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Campus WordPlay</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Guess the 5-letter campus-themed word in 3 attempts!
              </p>
            </div>

            {/* Word Grid */}
            <div className="space-y-2">
              {[0, 1, 2].map((rowIndex) => {
                const attempt = attempts[rowIndex];
                return (
                  <div key={rowIndex} className="flex justify-center gap-1.5">
                    {[0, 1, 2, 3, 4].map((colIndex) => {
                      const letter = attempt ? attempt[colIndex] : '';
                      let bgColor = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                      let textColor = 'text-slate-900 dark:text-white';
                      
                      if (attempt) {
                        if (targetWord[colIndex] === letter) {
                          bgColor = 'bg-green-500 border-green-600';
                          textColor = 'text-white font-bold';
                        } else if (targetWord.includes(letter)) {
                          bgColor = 'bg-yellow-500 border-yellow-600';
                          textColor = 'text-white font-bold';
                        } else {
                          bgColor = 'bg-slate-400 border-slate-500';
                          textColor = 'text-white';
                        }
                      }

                      return (
                        <div 
                          key={colIndex} 
                          className={`w-9 h-9 border rounded-lg flex items-center justify-center text-sm font-semibold uppercase ${bgColor} ${textColor}`}
                        >
                          {letter}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Input & Form */}
            {!gameOver ? (
              <form onSubmit={handlePuzzleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={5}
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder="Type guess..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-sm uppercase text-center focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={guess.length !== 5}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl disabled:opacity-50 transition-all cursor-pointer"
                >
                  Guess
                </button>
              </form>
            ) : (
              <div className="text-center space-y-3">
                {gameWon ? (
                  <p className="text-xs font-bold text-green-600 dark:text-green-400">🎉 Correct! You solved the puzzle!</p>
                ) : (
                  <p className="text-xs font-bold text-red-650">😢 Game Over! The word was {targetWord}.</p>
                )}
                <button 
                  onClick={resetPuzzle}
                  className="px-4 py-1.5 border border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Play again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
