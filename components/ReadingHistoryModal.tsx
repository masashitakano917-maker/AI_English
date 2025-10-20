import React, { useMemo, useState } from 'react';
import type { PracticeSession, PronunciationPracticeSession } from '../types';
import type { Translations } from '../lib/translations';
import { PerformanceChart } from './PerformanceChart';
import { ScoreBadge } from './ScoreBadge';
import { PronunciationLog } from './PronunciationLog';

interface ReadingHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    readingHistory: PracticeSession[];
    pronunciationHistory: PronunciationPracticeSession[];
    onSelectReadingSession: (session: PracticeSession) => void;
    t: Translations['ja'];
}

const AccordionItem: React.FC<{ title: string, children: React.ReactNode, startOpen?: boolean }> = ({ title, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    return (
        <div className="border-b">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left font-semibold text-slate-700 hover:bg-slate-50">
                <span>{title}</span>
                <svg className={`w-5 h-5 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && <div className="p-3 bg-white">{children}</div>}
        </div>
    );
};

export const ReadingHistoryModal: React.FC<ReadingHistoryModalProps> = ({ isOpen, onClose, readingHistory, pronunciationHistory, onSelectReadingSession, t }) => {
    
    const groupedByDate = useMemo(() => {
        return readingHistory.reduce((acc, session) => {
            const date = new Date(session.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(session);
            return acc;
        }, {} as Record<string, PracticeSession[]>);
    }, [readingHistory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">{t.readingHistoryModalTitle}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">&times;</button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">{t.performanceHistoryTitle}</h3>
                        {readingHistory.length > 1 ? (
                            <PerformanceChart history={readingHistory} t={t} />
                        ) : (
                            <div className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-md">
                                {t.noHistoryForChart}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">{t.readingSessionsTab}</h3>
                         {Object.keys(groupedByDate).length > 0 ? (
                            <div className="border rounded-md bg-slate-50">
                                {Object.entries(groupedByDate).map(([date, sessions], index) => (
                                    <AccordionItem key={date} title={date} startOpen={index === 0}>
                                        <ul className="space-y-2">
                                            {sessions.map(session => (
                                                <li key={session.id}>
                                                     <button
                                                        onClick={() => onSelectReadingSession(session)}
                                                        className="w-full text-left p-3 rounded-md transition-colors bg-white hover:bg-blue-50 border border-slate-200"
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <p className="text-sm font-semibold truncate pr-2 flex-1 text-slate-800">{session.passageFileName || session.passage}</p>
                                                            {session.scores && <ScoreBadge scores={session.scores} />}
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">{new Date(session.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionItem>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-md">{t.noReadingSessions}</p>
                        )}
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3">{t.pronunciationLogTitle}</h3>
                        <div className="bg-slate-50 p-4 rounded-md border">
                            <PronunciationLog history={pronunciationHistory} t={t} />
                        </div>
                    </div>
                </div>
                 <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors">
                        {t.closeButton}
                    </button>
                </div>
            </div>
        </div>
    );
};
