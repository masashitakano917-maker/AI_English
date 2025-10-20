import React from 'react';
import type { TestResult, Question } from '../types';
import type { Translations } from '../lib/translations';

interface TestResultModalProps {
    result: TestResult | null;
    isOpen: boolean;
    onClose: () => void;
    // FIX: Corrected the type to use 'ja' as it's the only available language.
    t: Translations['ja'];
}

export const TestResultModal: React.FC<TestResultModalProps> = ({ result, isOpen, onClose, t }) => {
    if (!isOpen || !result) return null;

    const getOptionClass = (question: Question, option: string, userAnswer: string) => {
        const isCorrect = option === question.answer;
        const isSelected = userAnswer === option;

        if (isCorrect) return 'bg-green-100 border-green-400 text-green-800 font-semibold';
        if (isSelected && !isCorrect) return 'bg-red-100 border-red-400 text-red-800';
        return 'bg-slate-50 border-slate-200 text-slate-600';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{t.testResultModalTitle}</h2>
                            <p className="text-sm text-slate-500 mt-1">{result.testType} - {new Date(result.date).toLocaleString()}</p>
                        </div>
                        <div className="text-lg font-bold text-slate-700">
                            {t.yourScore} <span className="text-blue-600">{result.score}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {result.questions.map((q, index) => (
                        <div key={index}>
                            <p className="font-semibold text-slate-700 mb-2">{index + 1}. {q.question}</p>
                            <div className="space-y-2">
                                {q.options.map((option, optIndex) => (
                                    <div
                                        key={optIndex}
                                        className={`w-full text-left p-3 border rounded-md text-sm ${getOptionClass(q, option, result.userAnswers[index])}`}
                                    >
                                        {option}
                                    </div>
                                ))}
                            </div>
                            {result.userAnswers[index] !== q.answer && (
                                <div className="mt-2 text-sm space-y-1">
                                    <p className="font-medium"><span className="text-red-700">{t.yourAnswer}</span> {result.userAnswers[index] || 'N/A'}</p>
                                    <p className="font-medium"><span className="text-green-700">{t.correctAnswer}</span> {q.answer}</p>
                                </div>
                            )}
                        </div>
                    ))}
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