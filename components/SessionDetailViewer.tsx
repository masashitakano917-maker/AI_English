import React from 'react';
import { marked } from 'marked';
import type { PracticeSession } from '../types';
import type { Translations } from '../lib/translations';
import { ScoreDisplay } from './ScoreDisplay';

interface SessionDetailViewerProps {
    session: PracticeSession;
    // FIX: Corrected the type to use 'ja' as it's the only available language.
    t: Translations['ja'];
}

const createMarkup = (markdownText: string) => {
    const rawMarkup = marked(markdownText, { breaks: true, gfm: true });
    return { __html: rawMarkup };
};

const Section: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div>
        <h4 className="text-md font-semibold text-slate-600 mb-2 border-b border-slate-200 pb-1">{title}</h4>
        <div className="text-sm text-slate-700 leading-relaxed space-y-2">
            {children}
        </div>
    </div>
);

export const SessionDetailViewer: React.FC<SessionDetailViewerProps> = ({ session, t }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
            <h3 className="text-lg font-bold text-slate-800">{t.sessionDetailsTitle}</h3>
            
            <p className="text-sm text-slate-500">
                {new Date(session.date).toLocaleString()}
            </p>

            <Section title={t.passage}>
                <div className="max-h-40 overflow-y-auto bg-slate-50 p-3 rounded-md border text-slate-600">
                    {session.passage}
                </div>
            </Section>
            
            <Section title={t.transcription}>
                 <div className="max-h-40 overflow-y-auto bg-slate-50 p-3 rounded-md border text-slate-600 italic">
                    {session.transcription}
                </div>
            </Section>

            <Section title={t.feedback}>
                <ScoreDisplay scores={session.scores} t={t} />
                <div 
                    className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-slate-700 prose-p:text-slate-600 prose-ul:text-slate-600 prose-strong:text-slate-700"
                    dangerouslySetInnerHTML={createMarkup(session.feedback)} 
                />
            </Section>
            
            <Section title={t.vocabulary}>
                {session.vocabulary && session.vocabulary.length > 0 ? (
                    <ul className="space-y-3">
                        {session.vocabulary.map((item, index) => (
                            <li key={index} className="prose prose-sm max-w-none">
                                <strong className="text-slate-800">{item.word}</strong>
                                <p className="!my-0 !ml-4 text-slate-600"><strong>{t.definitionLabel}:</strong> {item.definition}</p>
                                <p className="!my-0 !ml-4 text-slate-600 italic"><strong>{t.exampleLabel}:</strong> "{item.example}"</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-slate-500 italic">{t.noVocabulary}</p>
                )}
            </Section>
        </div>
    );
};