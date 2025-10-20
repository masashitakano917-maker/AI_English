import React, { useState } from 'react';
import { marked } from 'marked';
import type { Score, VocabularyWord } from '../types';
import type { Translations } from '../lib/translations';
import { ScoreDisplay } from './ScoreDisplay';

interface FeedbackCardProps {
  feedback: string | null;
  scores: Score | null;
  vocabulary: VocabularyWord[] | null;
  isLoading: boolean;
  isLoadingVocabulary: boolean;
  isSynthesizingFeedback: boolean;
  onSynthesizeFeedback: (text: string) => void;
  feedbackAudioSrc: string | null;
  feedbackAudioState: { isPlaying: boolean; playbackRate: number };
  onFeedbackPlayPause: () => void;
  onFeedbackSpeedChange: (rate: number) => void;
  t: Translations['ja'];
}

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.648c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm9 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const FeedbackAudioPlayer: React.FC<{
    state: { isPlaying: boolean; playbackRate: number };
    onPlayPause: () => void;
    onSpeedChange: (rate: number) => void;
}> = ({ state, onPlayPause, onSpeedChange }) => {
    const playbackRates = [1, 1.5, 2];
    return (
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-full">
            <button onClick={onPlayPause} className="p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-full" aria-label={state.isPlaying ? 'Pause' : 'Play'}>
                {state.isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
            </button>
            <div className="flex items-center gap-1">
                {playbackRates.map(rate => (
                    <button
                        key={rate}
                        onClick={() => onSpeedChange(rate)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                            state.playbackRate === rate
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        {rate}x
                    </button>
                ))}
            </div>
        </div>
    );
};

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center gap-3 text-slate-500">
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>{text}</span>
  </div>
);

const createMarkup = (markdownText: string) => {
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ 
    feedback, scores, vocabulary, isLoading, isLoadingVocabulary,
    isSynthesizingFeedback, onSynthesizeFeedback, feedbackAudioSrc,
    feedbackAudioState, onFeedbackPlayPause, onFeedbackSpeedChange, t 
}) => {
  const [activeTab, setActiveTab] = useState<'feedback' | 'vocabulary'>('feedback');
  
  const renderFeedbackContent = () => {
      if (isLoading) return <LoadingSpinner text={t.loadingFeedback} />;
      if (!feedback || !scores) return <p className="text-slate-400 italic text-center py-8">{t.feedbackPlaceholder}</p>;

      return (
          <>
              <ScoreDisplay scores={scores} t={t}/>
              <div 
                className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-slate-700 prose-p:text-slate-600 prose-ul:text-slate-600 prose-strong:text-slate-700"
                dangerouslySetInnerHTML={createMarkup(feedback)} 
              />
          </>
      );
  };
  
  const renderVocabularyContent = () => {
    if (isLoadingVocabulary) return <LoadingSpinner text={t.loadingVocabulary} />;
    if (!vocabulary) return <p className="text-slate-400 italic text-center py-8">{t.vocabularyPlaceholder}</p>;
    if (vocabulary.length === 0) return <p className="text-slate-500 text-center py-8">{t.noVocabulary}</p>;
    
    return (
        <ul className="space-y-4">
            {vocabulary.map((item, index) => (
                <li key={index} className="prose prose-sm max-w-none">
                    <strong className="text-slate-800">{item.word}</strong>
                    <p className="!my-0 !ml-4 text-slate-600"><strong>{t.definitionLabel}:</strong> {item.definition}</p>
                    <p className="!my-0 !ml-4 text-slate-600 italic"><strong>{t.exampleLabel}:</strong> "{item.example}"</p>
                </li>
            ))}
        </ul>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col">
       <div className="flex justify-between items-center mb-4 min-h-[44px]">
         <h2 className="text-lg font-semibold text-slate-700">{t.feedbackCardTitle}</h2>
         {isSynthesizingFeedback ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t.generatingAudio}</span>
            </div>
         ) : feedbackAudioSrc ? (
            <FeedbackAudioPlayer
                state={feedbackAudioState}
                onPlayPause={onFeedbackPlayPause}
                onSpeedChange={onFeedbackSpeedChange}
            />
         ) : (
            <button
                onClick={() => feedback && onSynthesizeFeedback(feedback)}
                disabled={!feedback || isLoading || isLoadingVocabulary}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                aria-label={t.playFeedback}
            >
                <PlayIcon className="w-5 h-5" />
            </button>
         )}
      </div>
      
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`${
              activeTab === 'feedback'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
            aria-current={activeTab === 'feedback' ? 'page' : undefined}
          >
            {t.readingFeedbackTab}
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`${
              activeTab === 'vocabulary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
            aria-current={activeTab === 'vocabulary' ? 'page' : undefined}
          >
            {t.vocabularyHelperTab}
          </button>
        </nav>
      </div>

      <div className="mt-4 min-h-[150px] bg-slate-50 p-4 rounded-md border border-slate-200 flex flex-col justify-center">
        {activeTab === 'feedback' ? renderFeedbackContent() : renderVocabularyContent()}
      </div>
    </div>
  );
};