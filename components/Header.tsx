import React from 'react';

const BookOpenIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

interface HeaderProps {
    title: string;
    currentUser: string | null;
    onLogout: () => void;
    currentView: 'coach' | 'dashboard';
    setCurrentView: (view: 'coach' | 'dashboard') => void;
}

export const Header: React.FC<HeaderProps> = ({ title, currentUser, onLogout, currentView, setCurrentView }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
            <BookOpenIcon className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
        </div>

        {currentUser && currentUser !== 'admin' && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full p-1">
                <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${currentView === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => setCurrentView('coach')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${currentView === 'coach' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    Reading Coach
                </button>
            </div>
        )}

        <div className="flex items-center gap-4">
            {currentUser && (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 hidden sm:inline capitalize">
                        {currentUser}
                    </span>
                    <button onClick={onLogout} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 rounded-full transition-colors" aria-label="Logout">
                        <LogoutIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </header>
  );
};