import React from 'react';
import type { TestResult } from '../types';
import type { Translations } from '../lib/translations';

interface TestHistoryLogProps {
    history: TestResult[];
    onViewResult: (result: TestResult) => void;
    // FIX: Corrected the type to use 'ja' as it's the only available language.
    t: Translations['ja'];
}

const DocumentTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);


export const TestHistoryLog: React.FC<TestHistoryLogProps> = ({ history, onViewResult, t }) => {
    if (history.length === 0) {
        return (
            <div className="text-center py-10 text-slate-500 italic">
                {t.noTestHistory}
            </div>
        );
    }
    
    return (
        <div className="max-h-80 overflow-y-auto pr-2 -mr-2">
            <ul className="space-y-3">
                {history.map(result => (
                    <li key={result.id}>
                        <button 
                            onClick={() => onViewResult(result)}
                            className="w-full text-left p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <p className="font-semibold text-blue-700 break-words">{result.testType}</p>
                                    <p className="text-xs text-slate-500 mt-1">{new Date(result.date).toLocaleString()}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className="font-bold text-slate-600 text-sm bg-slate-200 px-2.5 py-1 rounded-full">{result.score}</span>
                                </div>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};