import React, { useState, useMemo } from 'react';
import type { PracticeSession, PronunciationPracticeSession } from '../types';
import type { Translations } from '../lib/translations';
import { ScoreBadge } from './ScoreBadge';

interface CalendarHistoryProps {
  history: PracticeSession[];
  pronunciationHistory: PronunciationPracticeSession[];
  selectedSessionId?: string | null;
  onSelectSession: (session: PracticeSession) => void;
  onNewSession: () => void;
  disabled: boolean;
  // FIX: Corrected the type to use 'ja' as it's the only available language.
  t: Translations['ja'];
  language: 'en' | 'ja';
}

const PlusIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const toYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const CalendarHistory: React.FC<CalendarHistoryProps> = ({ history, pronunciationHistory, selectedSessionId, onSelectSession, onNewSession, disabled, t, language }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const practiceDays = useMemo(() => {
        const daysWithPractice = new Set<string>();
        history.forEach(session => daysWithPractice.add(toYYYYMMDD(new Date(session.date))));
        pronunciationHistory.forEach(session => daysWithPractice.add(toYYYYMMDD(new Date(session.date))));
        return daysWithPractice;
    }, [history, pronunciationHistory]);

    const { days, firstDayOfMonth, weekdays } = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const numDays = new Date(year, month + 1, 0).getDate();
        const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);
        const weekdayNames = [...Array(7).keys()].map(i => new Date(2023, 0, i + 1).toLocaleDateString(language, { weekday: 'narrow' }));
        return { days: daysArray, firstDayOfMonth: firstDay, weekdays: weekdayNames };
    }, [year, month, language]);

    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };
    
    const sessionsOnSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        return history
            .filter(s => isSameDay(new Date(s.date), selectedDate))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedDate, history]);

    const today = new Date();

    return (
        <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-white p-4 rounded-xl shadow-lg flex flex-col">
            <h2 className="text-lg font-semibold text-slate-700 pb-2 border-b border-slate-200 mb-2">{t.calendarTitle}</h2>
            <button 
                onClick={onNewSession}
                disabled={disabled}
                className="w-full flex items-center justify-center gap-2 mb-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed">
                <PlusIcon className="w-5 h-5"/>
                {t.newSessionButton}
            </button>
            
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon className="w-5 h-5 text-slate-600"/></button>
                <span className="font-semibold text-slate-700">
                    {currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon className="w-5 h-5 text-slate-600"/></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 font-medium mb-2">
                {weekdays.map(d => <div key={d}>{d}</div>)}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {days.map(day => {
                    const date = new Date(year, month, day);
                    const dateStr = toYYYYMMDD(date);
                    const hasPractice = practiceDays.has(dateStr);
                    const isToday = isSameDay(date, today);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    
                    const fullDateStr = date.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' });
                    const ariaLabel = hasPractice ? `${t.practiceOn} ${fullDateStr}` : fullDateStr;

                    return (
                        <div key={day} className="relative">
                            <button
                                onClick={() => setSelectedDate(date)}
                                aria-label={ariaLabel}
                                aria-current={isSelected ? "date" : undefined}
                                className={`w-full aspect-square rounded-full flex items-center justify-center text-sm transition-colors
                                    ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                                    ${!isSelected && isToday ? 'bg-blue-100 text-blue-700' : ''}
                                    ${!isSelected && !isToday ? 'hover:bg-slate-100' : ''}
                                `}
                            >
                                {day}
                            </button>
                            {hasPractice && <div aria-hidden="true" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>}
                        </div>
                    );
                })}
            </div>
            
            <div className="flex-grow overflow-y-auto mt-4 pt-4 border-t pr-2 -mr-2">
                {selectedDate && sessionsOnSelectedDate.length > 0 ? (
                    <ul className="space-y-2">
                        {sessionsOnSelectedDate.map(session => (
                            <li key={session.id}>
                                <button
                                    onClick={() => onSelectSession(session)}
                                    disabled={disabled}
                                    className={`w-full text-left p-3 rounded-md transition-colors ${
                                        selectedSessionId === session.id 
                                        ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200' 
                                        : 'hover:bg-slate-100 text-slate-600'
                                    } disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400`}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold truncate pr-2 flex-1">{session.passageFileName || session.passage}</p>
                                        {session.scores && <ScoreBadge scores={session.scores} />}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(session.date).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : selectedDate ? (
                     <p className="text-sm text-slate-500 text-center mt-4">{t.noPracticeOnDate}</p>
                ) : (
                    <p className="text-sm text-slate-500 text-center mt-4">{t.noHistory}</p>
                )}
            </div>
        </aside>
    );
};