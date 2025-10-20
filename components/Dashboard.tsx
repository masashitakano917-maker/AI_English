import React, { useState, useMemo } from 'react';
import { generateVocabularyTest, generateGrammarTest, generateComprehensionTest, generateJapaneseToEnglishVocabularyTest } from '../services/geminiService';
import type { PracticeSession, Question, PronunciationPracticeSession, TestResult } from '../types';
import type { Translations } from '../lib/translations';
import { TestViewer } from './TestViewer';
import { ReadingHistoryModal } from './ReadingHistoryModal';
import { TestHistoryModal } from './TestHistoryModal';


interface DashboardProps {
    history: PracticeSession[];
    pronunciationHistory: PronunciationPracticeSession[];
    testResults: TestResult[];
    onSaveTest: (resultData: Omit<TestResult, 'id' | 'date'>) => void;
    onViewTest: (result: TestResult) => void;
    onOpenPronunciationModal: (text: string) => void;
    onSelectSession: (session: PracticeSession) => void;
    t: Translations['ja'];
}

type TestType = 'vocabulary' | 'grammar' | 'comprehension' | 'vocab-ja-en';
type LoadingStates = {
    [key in TestType]?: boolean;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex items-center justify-center gap-3 text-slate-500">
      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        {/* FIX: Corrected the SVG path data and removed the invalidly placed JSX. */}
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
);

const HistoryIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ClipboardListIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);


export const Dashboard: React.FC<DashboardProps> = ({ history, pronunciationHistory, testResults, onSaveTest, onViewTest, onOpenPronunciationModal, onSelectSession, t }) => {
    const [timeFilter, setTimeFilter] = useState('7');
    const [loadingStates, setLoadingStates] = useState<LoadingStates>({});
    const [generatedTest, setGeneratedTest] = useState<{ type: TestType; questions: Question[] } | null>(null);
    const [practiceText, setPracticeText] = useState('');
    const [isReadingHistoryModalOpen, setIsReadingHistoryModalOpen] = useState(false);
    const [isTestHistoryModalOpen, setIsTestHistoryModalOpen] = useState(false);

    const filteredHistory = useMemo(() => {
        const daysToFilter = parseInt(timeFilter);
        
        if (timeFilter === '1') { // Today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            return history.filter(session => new Date(session.date) >= todayStart);
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(new Date().getDate() - daysToFilter);
        cutoffDate.setHours(0, 0, 0, 0);
        
        return history.filter(session => new Date(session.date) >= cutoffDate);
    }, [history, timeFilter]);

    const filteredPassages = useMemo(() => {
        if (filteredHistory.length === 0) return null;
        const passages = [...new Set(filteredHistory.map(s => s.passage))];
        return passages.join('\n\n---\n\n');
    }, [filteredHistory]);

    const handleGenerateTest = async (type: TestType) => {
        if (!filteredPassages) return;
        setLoadingStates(prev => ({ ...prev, [type]: true }));
        setGeneratedTest(null);
        try {
            let testResult: Question[] = [];
            switch (type) {
                case 'vocabulary':
                    testResult = await generateVocabularyTest(filteredPassages);
                    break;
                case 'vocab-ja-en':
                    testResult = await generateJapaneseToEnglishVocabularyTest(filteredPassages);
                    break;
                case 'grammar':
                    testResult = await generateGrammarTest(filteredPassages);
                    break;
                case 'comprehension':
                    testResult = await generateComprehensionTest(filteredPassages);
                    break;
            }
            setGeneratedTest({ type, questions: testResult });
        } catch (error) {
            console.error(`Error generating ${type} test:`, error);
            alert(t.testGenerationError);
        } finally {
            setLoadingStates(prev => ({ ...prev, [type]: false }));
        }
    };
    
    const testButtons = [
        { type: 'vocabulary' as TestType, label: t.testTypes.vocabulary, visible: true },
        { type: 'vocab-ja-en' as TestType, label: t.testTypes.vocabularyJaEn, visible: true },
        { type: 'grammar' as TestType, label: t.testTypes.grammar, visible: true },
        { type: 'comprehension' as TestType, label: t.testTypes.comprehension, visible: true },
    ];
    
    const handleSaveResult = (resultData: { score: number; userAnswers: Record<number, string> }) => {
        if (!generatedTest) return;

        const testTypeMap = {
            'vocabulary': t.testTypes.vocabulary,
            'vocab-ja-en': t.testTypes.vocabularyJaEn,
            'grammar': t.testTypes.grammar,
            'comprehension': t.testTypes.comprehension,
        };

        onSaveTest({
            testType: testTypeMap[generatedTest.type],
            score: `${resultData.score}/${generatedTest.questions.length}`,
            questions: generatedTest.questions,
            userAnswers: resultData.userAnswers,
        });
    };

    const handleSelectSessionFromModal = (session: PracticeSession) => {
      setIsReadingHistoryModalOpen(false);
      onSelectSession(session);
    }

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-slate-800 mb-1">{t.dashboardTitle}</h2>
                <p className="text-sm text-slate-500">{t.dashboardSubtitle}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
                    <HistoryIcon className="w-12 h-12 text-blue-500 mb-3" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">{t.viewReadingHistory}</h3>
                    <p className="text-sm text-slate-500 mb-4">{t.viewReadingHistoryDesc}</p>
                    <button onClick={() => setIsReadingHistoryModalOpen(true)} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700">
                        {t.openButton}
                    </button>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
                    <ClipboardListIcon className="w-12 h-12 text-green-500 mb-3" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">{t.viewTestHistory}</h3>
                    <p className="text-sm text-slate-500 mb-4">{t.viewTestHistoryDesc}</p>
                    <button onClick={() => setIsTestHistoryModalOpen(true)} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">
                        {t.openButton}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3">{t.freePronunciationTitle}</h3>
                    <p className="text-sm text-slate-600 mb-3">{t.freePronunciationPrompt}</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={practiceText}
                            onChange={(e) => setPracticeText(e.target.value)}
                            placeholder={t.wordOrPhrasePlaceholder}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={() => {
                                if (practiceText.trim()) {
                                    onOpenPronunciationModal(practiceText.trim());
                                    setPracticeText('');
                                }
                            }}
                            disabled={!practiceText.trim()}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 disabled:bg-slate-400 whitespace-nowrap"
                        >
                            {t.practiceButton}
                        </button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">{t.generateTestsTitle}</h3>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-600 mb-2">{t.selectPeriod}</label>
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(t.dateRanges).map(([days, label]) => (
                                <option key={days} value={days}>{label}</option>
                            ))}
                        </select>
                    </div>
            
                    <h4 className="text-md font-medium text-slate-700 mb-3">{t.passagesTitle}</h4>
                    {filteredPassages ? (
                        <div className="max-h-24 overflow-y-auto bg-slate-50 p-3 rounded-md border text-sm text-slate-600 whitespace-pre-wrap mb-4">
                            {filteredPassages}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic mb-4 text-center py-4">{t.noPassages}</p>
                    )}
                </div>
            </div>
            
            {filteredPassages && (
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {testButtons.filter(btn => btn.visible).map(btn => (
                            <button
                                key={btn.type}
                                onClick={() => handleGenerateTest(btn.type)}
                                disabled={!filteredPassages || Object.values(loadingStates).some(Boolean)}
                                className="flex items-center justify-center gap-3 w-full px-4 py-3 bg-slate-700 text-white font-semibold rounded-md shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {loadingStates[btn.type] ? (
                                    <>
                                        <LoadingSpinner />
                                        <span>{t.generatingTest}</span>
                                    </>
                                ) : (
                                    btn.label
                                )}
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-6 min-h-[100px] bg-slate-50 p-4 rounded-md border border-slate-200">
                        {generatedTest ? (
                            <TestViewer 
                                test={generatedTest.questions} 
                                title={
                                    generatedTest.type === 'vocab-ja-en' 
                                    ? t.testTypes.vocabularyJaEn 
                                    : t.testTypes[generatedTest.type as Exclude<TestType, 'vocab-ja-en'>]
                                } 
                                onSaveResult={handleSaveResult}
                                t={t} />
                        ) : (
                            <p className="text-slate-400 italic text-center py-8">{t.noTestGenerated}</p>
                        )}
                    </div>
                </div>
            )}

            <ReadingHistoryModal 
                isOpen={isReadingHistoryModalOpen}
                onClose={() => setIsReadingHistoryModalOpen(false)}
                readingHistory={history}
                pronunciationHistory={pronunciationHistory}
                onSelectReadingSession={handleSelectSessionFromModal}
                t={t}
            />

            <TestHistoryModal
                isOpen={isTestHistoryModalOpen}
                onClose={() => setIsTestHistoryModalOpen(false)}
                testHistory={testResults}
                onViewTest={onViewTest}
                t={t}
            />
        </div>
    );
};