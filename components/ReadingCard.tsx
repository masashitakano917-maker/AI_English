import React from 'react';
import type { Translations } from '../lib/translations';
import type { VoiceOption } from '../App';

interface ReadingCardProps {
  passage: string;
  transcription: string;
  isRecording: boolean;
  isExtractingText: boolean;
  isSynthesizingPassage: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSynthesizePassage: (text: string) => void;
  passageAudioSrc: string | null;
  passageAudioState: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  };
  selectedVoice: VoiceOption;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onRewind: () => void;
  onForward: () => void;
  onVoiceChange: (voice: VoiceOption) => void;
  passageFileName: string | null;
  t: Translations['ja'];
}

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h6v4H9z" />
    </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

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

const RewindIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.53 2.47a.75.75 0 010 1.06L4.81 8.25H15a6.75 6.75 0 010 13.5h-3a.75.75 0 010-1.5h3a5.25 5.25 0 100-10.5H4.81l4.72 4.72a.75.75 0 11-1.06 1.06l-6-6a.75.75 0 010-1.06l6-6a.75.75 0 011.06 0z" clipRule="evenodd" />
    </svg>
);

const ForwardIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M14.47 2.47a.75.75 0 011.06 0l6 6a.75.75 0 010 1.06l-6 6a.75.75 0 11-1.06-1.06L19.19 8.25H9a6.75 6.75 0 000 13.5h3a.75.75 0 010 1.5H9a5.25 5.25 0 010-10.5h10.19l-4.72-4.72a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
);

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex items-center justify-center gap-3 text-slate-500">
      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{text}</span>
    </div>
  );

const AudioPlayerControls: React.FC<Omit<ReadingCardProps, 'passage' | 'transcription' | 'isRecording' | 'isExtractingText' | 'onStartRecording' | 'onStopRecording' | 'onFileUpload' | 'passageFileName' | 'onSynthesizePassage'>> = ({
    passageAudioState: { isPlaying, currentTime, duration }, onPlayPause, onSeek, onRewind, onForward,
}) => {
    const formatTime = (time: number) => {
        if (isNaN(time) || time === 0) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    return (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
             <div className="flex items-center justify-center gap-4">
                <button onClick={onRewind} className="p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-full" aria-label="10秒戻る"><RewindIcon className="w-6 h-6" /></button>
                <button onClick={onPlayPause} className="p-2 bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-sm" aria-label={isPlaying ? '一時停止' : '再生'}>
                    {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                </button>
                <button onClick={onForward} className="p-2 text-slate-600 hover:text-blue-600 transition-colors rounded-full" aria-label="10秒進む"><ForwardIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono w-10 text-center">{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    value={currentTime}
                    onInput={(e: React.ChangeEvent<HTMLInputElement>) => onSeek(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full"
                    style={{ backgroundSize: `${(currentTime / duration) * 100}% 100%` }}
                />
                <span className="text-xs text-slate-500 font-mono w-10 text-center">{formatTime(duration)}</span>
            </div>
        </div>
    );
};

export const ReadingCard: React.FC<ReadingCardProps> = (props) => {
  const { passage, transcription, isRecording, isExtractingText, isSynthesizingPassage, onStartRecording, onStopRecording, onFileUpload, passageFileName, onSynthesizePassage, passageAudioSrc, selectedVoice, onVoiceChange, t } = props;
  const hasPassage = passage && passage.length > 0;
  const isBusyForUpload = isRecording || isExtractingText;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">{t.step1Title}</h2>
        <label htmlFor="passage-upload" className={`w-full flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg transition-colors ${isBusyForUpload ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-100'}`}>
            {isExtractingText ? (
                <LoadingSpinner text={t.extractingText} />
            ) : (
                <>
                    <UploadIcon className="w-8 h-8 text-slate-500 mb-2"/>
                    <span className="font-semibold text-blue-600">{t.uploadButton}</span>
                    <span className="text-sm text-slate-500 mt-1 text-center">{passageFileName || t.uploadPrompt}</span>
                </>
            )}
            <input id="passage-upload" type="file" className="hidden" accept=".txt,image/*" onChange={onFileUpload} disabled={isBusyForUpload} />
        </label>
      </div>

      <div className="relative">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-2">
            <h2 className="text-lg font-semibold text-slate-700">{t.step2Title}</h2>
            <div className="flex items-center gap-2">
                <label htmlFor="voice-select" className="text-sm font-medium text-slate-600">{t.voiceSelectLabel}:</label>
                <select 
                    id="voice-select" 
                    value={selectedVoice} 
                    onChange={e => onVoiceChange(e.target.value as VoiceOption)}
                    disabled={isRecording || isExtractingText || isSynthesizingPassage}
                    className="bg-slate-100 border-slate-300 rounded-md text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="Kore">{t.voiceFemaleTeen}</option>
                    <option value="Puck">{t.voiceMaleTeen}</option>
                </select>
            </div>
        </div>
        <div 
          className={`text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-200 min-h-[100px] ${!hasPassage && !isExtractingText ? 'italic text-slate-400' : ''}`}>
          {hasPassage ? passage : (isExtractingText ? '...' : t.passageAppearHere)}
        </div>
      </div>
      
      <div className="flex flex-col justify-center items-center gap-4">
        <div className="min-h-[90px] w-full flex items-center justify-center">
            {isSynthesizingPassage ? (
                <LoadingSpinner text={t.generatingAudio} />
            ) : passageAudioSrc ? (
                <AudioPlayerControls {...props} />
            ) : (
                <button
                    onClick={() => onSynthesizePassage(passage)}
                    disabled={!hasPassage || isRecording || isExtractingText}
                    className="flex items-center justify-center gap-2.5 px-6 py-2.5 bg-slate-700 text-white font-semibold rounded-full shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                    <PlayIcon className="w-5 h-5" />
                    <span>{t.playPassage}</span>
                </button>
            )}
        </div>
        
        {isRecording ? (
          <button
            onClick={onStopRecording}
            className="flex items-center justify-center gap-3 w-48 px-6 py-3 bg-red-600 text-white font-semibold rounded-full shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:scale-105"
          >
            <StopIcon className="w-6 h-6" />
            <span>{t.stopRecordingButton}</span>
          </button>
        ) : (
          <button
            onClick={onStartRecording}
            disabled={!hasPassage || isRecording || isExtractingText || isSynthesizingPassage}
            className="flex items-center justify-center gap-3 w-48 px-6 py-3 bg-blue-600 text-white font-semibold rounded-full shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            <MicrophoneIcon className="w-6 h-6" />
            <span>{t.startReadingButton}</span>
          </button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">{t.step3Title}</h2>
        <div className="min-h-[100px] text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-md border border-slate-200 italic">
          {transcription || <span className="text-slate-400">{t.transcriptionPlaceholder}</span>}
          {isRecording && <span className="inline-block w-2 h-2 ml-2 bg-red-500 rounded-full animate-pulse"></span>}
        </div>
      </div>
    </div>
  );
};