import React, { useState, useMemo } from 'react';
import type { AllHistory, PracticeSession, UserHistory } from '../types';
import type { Translations } from '../lib/translations';
import { StudentStats } from './StudentStats';
import { SessionDetailViewer } from './SessionDetailViewer';
import { ScoreBadge } from './ScoreBadge';

interface AdminDashboardProps {
  allHistory: AllHistory;
  // FIX: Corrected the type to use 'ja' as it's the only available language.
  t: Translations['ja'];
  language: 'en' | 'ja';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ allHistory, t, language }) => {
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [viewedSession, setViewedSession] = useState<PracticeSession | null>(null);

  const studentNames = useMemo(() => {
    return Object.keys(allHistory).filter(name => name !== 'admin').sort();
  }, [allHistory]);
  
  const studentHistory = useMemo(() => {
    if (!selectedStudent || !allHistory[selectedStudent]) return null;
    return allHistory[selectedStudent];
  }, [selectedStudent, allHistory]);
  
  const handleSelectStudent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStudent(e.target.value);
    setViewedSession(null); // Reset detail view when student changes
  };

  const readingSessions = studentHistory?.readingSessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{t.adminDashboardTitle}</h2>
        <div className="mb-4">
          <label htmlFor="student-select" className="block text-sm font-medium text-slate-600 mb-2">
            {t.selectStudentLabel}
          </label>
          <select
            id="student-select"
            value={selectedStudent}
            onChange={handleSelectStudent}
            className="w-full md:w-1/2 p-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
          >
            <option value="">{t.selectStudentPlaceholder}</option>
            {studentNames.map(name => (
              <option key={name} value={name} className="capitalize">{name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {!selectedStudent ? (
        <div className="text-center py-12 text-slate-500 italic bg-white p-6 rounded-xl shadow-lg">
            {t.noStudentSelected}
        </div>
      ) : readingSessions.length === 0 ? (
        <div className="text-center py-12 text-slate-500 italic bg-white p-6 rounded-xl shadow-lg">
            {t.noHistoryForStudent}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1 space-y-8">
                <StudentStats history={readingSessions} t={t} />
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">{t.studentHistoryTitle}</h3>
                    <ul className="space-y-2 max-h-96 overflow-y-auto pr-2 -mr-2">
                        {readingSessions.map(session => (
                            <li key={session.id}>
                                <button
                                    onClick={() => setViewedSession(session)}
                                    className={`w-full text-left p-3 rounded-md transition-colors ${viewedSession?.id === session.id ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-slate-50'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold truncate pr-2 flex-1">{new Date(session.date).toLocaleDateString()}</p>
                                        <ScoreBadge scores={session.scores} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 truncate">{session.passageFileName || session.passage}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="lg:col-span-2">
                {viewedSession ? (
                    <SessionDetailViewer session={viewedSession} t={t} />
                ) : (
                    <div className="text-center py-20 text-slate-500 italic bg-white p-6 rounded-xl shadow-lg h-full flex items-center justify-center">
                        Select a session from the history list to see details.
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};