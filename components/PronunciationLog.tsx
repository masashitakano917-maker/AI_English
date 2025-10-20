import React from 'react';
import type { PronunciationPracticeSession } from '../types';
import type { Translations } from '../lib/translations';

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
    <svg className={`w-4 h-4 ${filled ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);


interface PronunciationLogProps {
    history: PronunciationPracticeSession[];
    // FIX: Corrected the type to use 'ja' as it's the only available language.
    t: Translations['ja'];
}

export const PronunciationLog: React.FC<PronunciationLogProps> = ({ history, t }) => {
    if (history.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500 italic">
                {t.noPronunciationHistory}
            </div>
        );
    }
    
    return (
        <div className="max-h-80 overflow-y-auto pr-2 -mr-2">
            <ul className="space-y-3">
                {history.map(session => (
                    <li key={session.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-start gap-4">
                             <p className="font-semibold text-blue-700 flex-1 break-words">"{session.word}"</p>
                             <div className="flex items-center flex-shrink-0">
                                {[...Array(5)].map((_, i) => <StarIcon key={i} filled={i < session.feedback.score} />)}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{new Date(session.date).toLocaleString()}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};