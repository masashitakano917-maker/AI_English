import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { connectToLiveSession, getPronunciationFeedback } from '../services/geminiService';
import type { PronunciationFeedback, PronunciationPracticeSession } from '../types';
import type { Translations } from '../lib/translations';

type LiveSession = Awaited<ReturnType<typeof connectToLiveSession>>['session'];

interface PronunciationPracticeModalProps {
    word: string;
    isOpen: boolean;
    onClose: () => void;
    onSavePractice: (session: PronunciationPracticeSession) => void;
    t: Translations['ja'];
}

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
    <svg className={`w-5 h-5 ${filled ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const createMarkup = (markdownText: string) => {
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
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

export const PronunciationPracticeModal: React.FC<PronunciationPracticeModalProps> = ({ word, isOpen, onClose, onSavePractice, t }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const sessionRef = useRef<LiveSession | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const resourcesRef = useRef<{
        audioContext: AudioContext;
        // FIX: Replaced deprecated ScriptProcessorNode with AudioWorkletNode to match the service's return type.
        workletNode: AudioWorkletNode;
        source: MediaStreamAudioSourceNode;
    } | null>(null);

    const resetState = useCallback(() => {
        setIsRecording(false);
        setTranscription('');
        setFeedback(null);
        setIsLoading(false);
    }, []);

    const handleStartRecording = useCallback(async () => {
        resetState();
        setIsRecording(true);
        try {
            // FIX: Destructuring 'workletNode' from the service call instead of 'scriptProcessor'.
            const { session, audioContext, workletNode, source, stream } = await connectToLiveSession(
                (text) => setTranscription((prev) => prev + text),
                word
            );
            sessionRef.current = session;
            mediaStreamRef.current = stream;
            // FIX: Storing the correct 'workletNode' in the ref and removing manual node connection, which is now handled by the service.
            resourcesRef.current = { audioContext, workletNode, source };
        } catch (err) {
            console.error('Error starting recording in modal:', err);
            alert(t.micError);
            setIsRecording(false);
        }
    }, [t, resetState, word]);
    
    const cleanupRecording = useCallback(() => {
        if (resourcesRef.current) {
            // FIX: Disconnecting the workletNode and source node correctly.
            resourcesRef.current.workletNode.disconnect();
            resourcesRef.current.source.disconnect();
        }
        sessionRef.current?.close();
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        sessionRef.current = null;
        resourcesRef.current = null;
    }, []);

    const handleStopRecording = useCallback(async () => {
        setIsRecording(false);
        cleanupRecording();
        
        const finalTranscription = transcription.trim();
        if (finalTranscription.length === 0) {
            alert(t.noSpeechError);
            return;
        }

        setIsLoading(true);
        try {
            const result = await getPronunciationFeedback(word, finalTranscription);
            setFeedback(result);
            
            const newPractice: PronunciationPracticeSession = {
                id: new Date().toISOString(),
                date: new Date().toISOString(),
                word: word,
                transcription: finalTranscription,
                feedback: result,
            };
            onSavePractice(newPractice);

        } catch (error) {
            console.error('Error getting pronunciation feedback:', error);
            setFeedback({ score: 0, analysis: t.feedbackError });
        } finally {
            setIsLoading(false);
        }
    }, [transcription, word, t, cleanupRecording, onSavePractice]);

    useEffect(() => {
        return () => {
            cleanupRecording();
        };
    }, [cleanupRecording]);
    
    useEffect(() => {
      if (isOpen) {
        resetState();
      }
    }, [isOpen, resetState]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                <h2 className="text-xl font-bold text-slate-800">{t.pronunciationModalTitle}</h2>
                
                <div>
                    <label className="text-sm font-medium text-slate-600">{t.wordToPracticeLabel}</label>
                    <p className="mt-1 text-lg font-semibold text-blue-700 bg-blue-50 p-3 rounded-md">"{word}"</p>
                </div>

                <div className="flex justify-center my-4">
                    {!isRecording ? (
                        <button
                            onClick={handleStartRecording}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105"
                        >
                            <MicrophoneIcon className="w-5 h-5"/>
                            {t.recordAttemptButton}
                        </button>
                    ) : (
                        <button
                            onClick={handleStopRecording}
                            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-full shadow-md hover:bg-red-700 transition-transform transform hover:scale-105"
                        >
                            {t.stopRecordingButton}
                        </button>
                    )}
                </div>
                
                <div className="min-h-[60px] bg-slate-100 p-3 rounded-md text-slate-700 italic border">
                    {isRecording ? t.speakNow : transcription || '...'}
                    {isRecording && <span className="inline-block w-2 h-2 ml-2 bg-red-500 rounded-full animate-pulse"></span>}
                </div>

                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">{t.pronunciationFeedbackTitle}</h3>
                    <div className="min-h-[100px] bg-slate-50 p-4 rounded-md border border-slate-200">
                        {isLoading ? (
                            <LoadingSpinner text={t.loadingPronunciationFeedback} />
                        ) : feedback ? (
                             <>
                                <div className="flex items-center gap-4 mb-3">
                                    <p className="text-sm font-semibold capitalize text-slate-600">{t.pronunciationScoreLabel}</p>
                                    <div className="flex items-center">
                                        {[...Array(5)].map((_, i) => <StarIcon key={i} filled={i < feedback.score} />)}
                                    </div>
                                </div>
                                <div 
                                    className="prose prose-sm max-w-none prose-p:text-slate-600 prose-ul:text-slate-600 prose-strong:text-slate-700"
                                    dangerouslySetInnerHTML={createMarkup(feedback.analysis)} 
                                />
                            </>
                        ) : (
                            <p className="text-slate-400 italic text-center py-6">{t.pronunciationPlaceholder}</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    {feedback && !isLoading && (
                        <button onClick={handleStartRecording} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300 transition-colors">
                            {t.tryAgainButton}
                        </button>
                    )}
                     <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 rounded-md hover:bg-slate-800 transition-colors">
                        {t.closeButton}
                    </button>
                </div>
            </div>
        </div>
    );
};