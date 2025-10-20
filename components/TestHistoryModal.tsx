import React, { useMemo, useState } from 'react';
import type { TestResult } from '../types';
import type { Translations } from '../lib/translations';

interface TestHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    testHistory: TestResult[];
    onViewTest: (result: TestResult) => void;
    t: Translations['ja'];
}

const AccordionItem: React.FC<{ title: string, count: number, children: React.ReactNode }> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 text-left font-semibold text-slate-700 hover:bg-slate-50">
                <div className="flex items-center gap-2">
                    <span>{title}</span>
                    <span className="text-xs bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">{count}</span>
                </div>
                <svg className={`w-5 h-5 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {isOpen && <div className="p-3 bg-white">{children}</div>}
        </div>
    );
};

export const TestHistoryModal: React.FC<TestHistoryModalProps> = ({ isOpen, onClose, testHistory, onViewTest, t }) => {
    
    const groupedByType = useMemo(() => {
        return testHistory.reduce((acc, result) => {
            const type = result.testType;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(result);
            return acc;
        }, {} as Record<string, TestResult[]>);
    }, [testHistory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">{t.testHistoryModalTitle}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">&times;</button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {Object.keys(t.testTypes).length > 0 ? (
                        <div className="border rounded-md bg-slate-50">
                            {Object.values(t.testTypes).map((typeName) => {
                                const tests = groupedByType[typeName] || [];
                                if (tests.length === 0) {
                                    return (
                                         <div className="border-b p-3 text-slate-500" key={typeName}>
                                            {typeName} <span className="text-xs bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">0</span>
                                        </div>
                                    );
                                }
                                return (
                                    <AccordionItem key={typeName} title={typeName} count={tests.length}>
                                        <ul className="space-y-2">
                                            {tests.map(result => (
                                                <li key={result.id}>
                                                    <button 
                                                        onClick={() => onViewTest(result)}
                                                        className="w-full text-left p-3 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                                    >
                                                        <div className="flex justify-between items-center gap-4">
                                                            <p className="text-sm text-slate-600 mt-1">{new Date(result.date).toLocaleString()}</p>
                                                            <span className="font-bold text-slate-700 text-sm bg-slate-200 px-2.5 py-1 rounded-full">{result.score}</span>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </AccordionItem>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center py-10 text-slate-500 italic bg-slate-50 rounded-md">{t.noTestHistory}</p>
                    )}
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
