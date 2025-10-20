import React, { useState, useMemo } from 'react';
import type { Question } from '../types';
import type { Translations } from '../lib/translations';

interface TestViewerProps {
    test: Question[];
    title: string;
    // FIX: Corrected the type to use 'ja' as it's the only available language.
    t: Translations['ja'];
    onSaveResult?: (resultData: { score: number, userAnswers: Record<number, string> }) => void;
}

export const TestViewer: React.FC<TestViewerProps> = ({ test, title, t, onSaveResult }) => {
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);

    const handleAnswerChange = (questionIndex: number, option: string) => {
        if (submitted) return;
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: option,
        }));
    };

    const score = useMemo(() => {
        // This calculates the score based on current answers, regardless of submission state.
        return test.reduce((correctCount, question, index) => {
            return answers[index] === question.answer ? correctCount + 1 : correctCount;
        }, 0);
    }, [answers, test]);
    
    const handleSubmit = () => {
        setSubmitted(true);
        if (onSaveResult) {
            onSaveResult({ score: score, userAnswers: answers });
        }
    };

    const getOptionClass = (question: Question, option: string, index: number) => {
        if (!submitted) {
            return answers[index] === option 
              ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' 
              : 'bg-white border-slate-300 hover:bg-slate-50';
        }
        
        const isCorrect = option === question.answer;
        const isSelected = answers[index] === option;

        if (isCorrect) return 'bg-green-100 border-green-400 text-green-800 font-semibold';
        if (isSelected && !isCorrect) return 'bg-red-100 border-red-400 text-red-800';
        return 'bg-slate-50 border-slate-200 text-slate-500';
    }


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                {submitted && (
                    <div className="text-lg font-bold text-slate-700">
                        {t.yourScore} <span className="text-blue-600">{score} / {test.length}</span>
                    </div>
                )}
            </div>
            
            <div className="space-y-6">
                {test.map((q, index) => (
                    <div key={index}>
                        <p className="font-semibold text-slate-700 mb-2">{index + 1}. {q.question}</p>
                        <div className="space-y-2">
                            {q.options.map((option, optIndex) => (
                                <button
                                    key={optIndex}
                                    onClick={() => handleAnswerChange(index, option)}
                                    disabled={submitted}
                                    className={`w-full text-left p-3 border rounded-md transition-all text-sm ${getOptionClass(q, option, index)} disabled:cursor-not-allowed`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                        {submitted && answers[index] !== q.answer && (
                            <p className="text-sm text-green-700 mt-2 font-medium">{t.correctAnswer} {q.answer}</p>
                        )}
                    </div>
                ))}
            </div>

            {!submitted && (
                <div className="mt-6 text-center">
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700"
                    >
                        {t.checkAnswers}
                    </button>
                </div>
            )}
        </div>
    );
};