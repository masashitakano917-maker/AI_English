import React from 'react';
import type { Score } from '../types';
import type { Translations } from '../lib/translations';

interface ScoreDisplayProps {
    scores: Score,
    // FIX: Corrected the type to use 'ja' as it's the only available language.
    t: Translations['ja'] 
}

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
    <svg className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ scores, t }) => (
    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
        {(Object.keys(t.scores) as Array<keyof Score>).map((key) => (
            <div key={key} className="flex-1">
                <p className="text-sm font-semibold capitalize text-slate-600">{t.scores[key]}</p>
                <div className="flex items-center mt-1">
                    {[...Array(5)].map((_, i) => <StarIcon key={i} filled={i < scores[key]} />)}
                </div>
            </div>
        ))}
    </div>
);