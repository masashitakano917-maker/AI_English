import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PracticeSession, Score, VocabularyWord, AllHistory, PronunciationPracticeSession, TestResult } from './types';
import { getReadingFeedback, connectToLiveSession, getVocabularyHelp, extractTextFromImage, getSpeechFromText, createWavUrl } from './services/geminiService';
import { Header } from './components/Header';
import { ReadingCard } from './components/ReadingCard';
import { FeedbackCard } from './components/FeedbackCard';
import { CalendarHistory } from './components/HistorySidebar';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PronunciationPracticeModal } from './components/PronunciationPracticeModal';
import { TestResultModal } from './components/TestResultModal';
import { translations } from './lib/translations';

type LiveSession = Awaited<ReturnType<typeof connectToLiveSession>>['session'];
export type VoiceOption = 'Kore' | 'Puck';

const App: React.FC = () => {
  const language = 'ja' as const;
  const t = translations.ja;
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'coach' | 'dashboard'>('coach');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [isLoadingVocabulary, setIsLoadingVocabulary] = useState<boolean>(false);
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [isSynthesizingFeedback, setIsSynthesizingFeedback] = useState<boolean>(false);
  const [isSynthesizingPassage, setIsSynthesizingPassage] = useState<boolean>(false);
  const [currentTranscription, setCurrentTranscription] = useState<string>('');
  const [finalFeedback, setFinalFeedback] = useState<string | null>(null);
  const [scores, setScores] = useState<Score | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyWord[] | null>(null);
  const [passage, setPassage] = useState<string>('');
  
  // User History State
  const [history, setHistory] = useState<PracticeSession[]>([]);
  const [pronunciationHistory, setPronunciationHistory] = useState<PronunciationPracticeSession[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  const [allHistory, setAllHistory] = useState<AllHistory>({});
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null);
  const [passageFileName, setPassageFileName] = useState<string | null>(null);

  // State for Pronunciation Practice Modal
  const [isPronunciationModalOpen, setIsPronunciationModalOpen] = useState(false);
  const [textToPractice, setTextToPractice] = useState('');

  // State for Test Result Modal
  const [viewedTestResult, setViewedTestResult] = useState<TestResult | null>(null);

  // State for Passage Audio Player
  const [passageAudioSrc, setPassageAudioSrc] = useState<string | null>(null);
  const [passageAudioState, setPassageAudioState] = useState({ isPlaying: false, currentTime: 0, duration: 0 });
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>('Kore'); // Kore: female, Puck: male

  // State for Feedback Audio Player
  const [feedbackAudioSrc, setFeedbackAudioSrc] = useState<string | null>(null);
  const [feedbackAudioState, setFeedbackAudioState] = useState({ isPlaying: false, playbackRate: 1 });

  const sessionRef = useRef<LiveSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const passageAudioRef = useRef<HTMLAudioElement>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement>(null);
  
  const loadAllHistoryFromStorage = (): AllHistory => {
    try {
      const allHistoryJson = localStorage.getItem('englishReadingHistory');
      if (!allHistoryJson) return {};
      
      let loadedHistory = JSON.parse(allHistoryJson);

      // --- Migration for old data structure ---
      let needsUpdate = false;
      for (const user in loadedHistory) {
        if (Array.isArray(loadedHistory[user])) { // Very old structure
            loadedHistory[user] = { readingSessions: loadedHistory[user], pronunciationSessions: [], testResults: [] };
            needsUpdate = true;
        } else {
            if (!loadedHistory[user].readingSessions) {
                loadedHistory[user].readingSessions = [];
                needsUpdate = true;
            }
            if (!loadedHistory[user].pronunciationSessions) {
                loadedHistory[user].pronunciationSessions = [];
                needsUpdate = true;
            }
            if (!loadedHistory[user].testResults) {
                loadedHistory[user].testResults = [];
                needsUpdate = true;
            }
        }
      }

      if (needsUpdate) {
        localStorage.setItem('englishReadingHistory', JSON.stringify(loadedHistory));
      }
      // --- End Migration ---

      return loadedHistory;
    } catch (error) {
      console.error("Failed to load all history from localStorage", error);
      return {};
    }
  };
  
  // Effect for handling session restoration on page load
  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('currentUser');
    if (loggedInUser) {
        const storedHistory = loadAllHistoryFromStorage();
        setAllHistory(storedHistory);
        const userHistory = storedHistory[loggedInUser] || { readingSessions: [], pronunciationSessions: [], testResults: [] };

        setHistory(userHistory.readingSessions);
        setPronunciationHistory(userHistory.pronunciationSessions);
        setTestResults(userHistory.testResults);
        setCurrentUser(loggedInUser);
        
        if(loggedInUser !== 'admin') {
            setCurrentView('dashboard');
        }
    }
  }, []);

  // Effect for saving history. This is the new, robust implementation.
  useEffect(() => {
    // Do not save if there is no logged-in user or if the user is an admin.
    if (!currentUser || currentUser === 'admin') {
      return;
    }

    // Check for changes using string comparison to avoid infinite loops from object references.
    const hasChanges = 
      !allHistory[currentUser] ||
      JSON.stringify(allHistory[currentUser].readingSessions) !== JSON.stringify(history) ||
      JSON.stringify(allHistory[currentUser].pronunciationSessions) !== JSON.stringify(pronunciationHistory) ||
      JSON.stringify(allHistory[currentUser].testResults) !== JSON.stringify(testResults);

    if (hasChanges) {
      // Construct the updated history object for the current user.
      const updatedUserHistory = {
        readingSessions: history,
        pronunciationSessions: pronunciationHistory,
        testResults: testResults,
      };

      // Create a new `allHistory` object with the updated data for the current user.
      // This is immutable and safe.
      const newAllHistory = {
        ...allHistory,
        [currentUser]: updatedUserHistory,
      };

      try {
        // First, update the application's main state.
        setAllHistory(newAllHistory);
        // Then, persist this new state to localStorage.
        localStorage.setItem('englishReadingHistory', JSON.stringify(newAllHistory));
      } catch (error) {
        console.error("Failed to save history to localStorage", error);
      }
    }
  }, [currentUser, history, pronunciationHistory, testResults, allHistory]);


  const handleLogin = (username: string) => {
    if (!username) return;

    const normalizedUser = username.trim().toLowerCase();
    
    // 1. Read the entire history from storage first.
    const currentAllHistory = loadAllHistoryFromStorage();
    
    // 2. Ensure user exists in history, if not, create an empty record.
    if (normalizedUser !== 'admin' && !currentAllHistory[normalizedUser]) {
        currentAllHistory[normalizedUser] = { readingSessions: [], pronunciationSessions: [], testResults: [] };
        localStorage.setItem('englishReadingHistory', JSON.stringify(currentAllHistory));
    }
    
    // 3. Get the specific user's history.
    const userHistory = currentAllHistory[normalizedUser] || { readingSessions: [], pronunciationSessions: [], testResults: [] };

    // 4. Set all state in one go to prevent race conditions with useEffect.
    setAllHistory(currentAllHistory);
    setHistory(userHistory.readingSessions);
    setPronunciationHistory(userHistory.pronunciationSessions);
    setTestResults(userHistory.testResults);
    setCurrentUser(normalizedUser);

    sessionStorage.setItem('currentUser', normalizedUser);
    
    if (normalizedUser === 'admin') {
        // Clear student-specific data for admin view
        setHistory([]);
        setPronunciationHistory([]);
        setTestResults([]);
    } else {
        setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
    setHistory([]);
    setPronunciationHistory([]);
    setTestResults([]);
    // DO NOT clear allHistory state on logout, as it's the single source of truth.
    startNewSession();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';
    startNewSession('', file.name);

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => setPassage(e.target?.result as string);
      reader.onerror = (e) => {
        console.error("File reading error:", e);
        alert(t.fileReadError);
        startNewSession();
      }
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
        setIsExtractingText(true);
        try {
            const extractedText = await extractTextFromImage(file);
            if (!extractedText) throw new Error("No text found in image.");
            setPassage(extractedText);
        } catch (error) {
            console.error("Text extraction error:", error);
            alert(t.textExtractionError);
            startNewSession();
        } finally {
            setIsExtractingText(false);
        }
    } else {
      alert(t.fileTypeError);
      startNewSession();
    }
  };
  
  const handleStartRecording = useCallback(async () => {
    if (!passage) {
      alert(t.uploadPassageFirst);
      return;
    }
    setIsRecording(true);
    setCurrentTranscription('');
    setFinalFeedback(null);
    setScores(null);
    setVocabulary(null);
    
    if (selectedSession) {
        const currentPassageStillSelected = history.find(s => s.id === selectedSession.id)?.passage === passage;
        if (!currentPassageStillSelected) {
            setSelectedSession(null);
        }
    }

    try {
      const { session, audioContext, workletNode, source, stream } = await connectToLiveSession(
        (transcription) => setCurrentTranscription((prev) => prev + transcription),
        passage
      );
      sessionRef.current = session;
      audioContextRef.current = audioContext;
      workletNodeRef.current = workletNode;
      mediaStreamSourceRef.current = source;
      mediaStreamRef.current = stream;
    } catch (err) {
      console.error('Error starting recording:', err);
      alert(t.micError);
      setIsRecording(false);
    }
  }, [passage, t, history, selectedSession]);

  const handleStopRecording = useCallback(async () => {
    setIsRecording(false);
    
    if (workletNodeRef.current && mediaStreamSourceRef.current) {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
        mediaStreamSourceRef.current.disconnect();
    }
    sessionRef.current?.close();

    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }

    if (currentTranscription.trim().length < 5) {
        alert(t.noSpeechError);
        setCurrentTranscription('');
        return;
    }

    setIsLoadingFeedback(true);
    setIsLoadingVocabulary(true);
    try {
      const [feedbackResult, vocabResult] = await Promise.all([
        getReadingFeedback(passage, currentTranscription),
        getVocabularyHelp(passage)
      ]);
      
      setScores(feedbackResult.scores);
      setFinalFeedback(feedbackResult.analysis);
      setVocabulary(vocabResult);
      
      const newSession: PracticeSession = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        passage: passage,
        passageFileName: passageFileName || undefined,
        transcription: currentTranscription,
        scores: feedbackResult.scores,
        feedback: feedbackResult.analysis,
        vocabulary: vocabResult,
      };
      setHistory(prev => [newSession, ...prev]);
      setSelectedSession(newSession);

    } catch (error) {
      console.error('Error getting feedback:', error);
      setFinalFeedback(t.feedbackError);
      
      const failedSession: PracticeSession = {
        id: new Date().toISOString(),
        date: new Date().toISOString(),
        passage: passage,
        passageFileName: passageFileName || undefined,
        transcription: currentTranscription,
        scores: { accuracy: 0, fluency: 0, pronunciation: 0 },
        feedback: t.feedbackError,
        vocabulary: [],
      };
      setHistory(prev => [failedSession, ...prev]);
      setSelectedSession(failedSession);

    } finally {
      setIsLoadingFeedback(false);
      setIsLoadingVocabulary(false);
    }
  }, [currentTranscription, passage, t, passageFileName]);
  
  useEffect(() => {
    return () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (sessionRef.current) {
            sessionRef.current.close();
        }
    };
  }, []);

  const handleSelectSession = (session: PracticeSession) => {
    if (isRecording || isExtractingText) return;
    setPassage(session.passage);
    setPassageFileName(session.passageFileName || null);
    setCurrentTranscription(session.transcription);
    setScores(session.scores);
    setFinalFeedback(session.feedback);
    setVocabulary(session.vocabulary);
    setSelectedSession(session);
    setPassageAudioSrc(null);
    setPassageAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
    setFeedbackAudioSrc(null);
    setFeedbackAudioState({ isPlaying: false, playbackRate: 1 });
    setCurrentView('coach');
  };
  
  const startNewSession = (defaultPassage: string = '', fileName: string | null = null) => {
    if(isRecording || isExtractingText) return;
    setPassage(defaultPassage);
    setPassageFileName(fileName);
    setCurrentTranscription('');
    setFinalFeedback(null);
    setScores(null);
    setVocabulary(null);
    setSelectedSession(null);
    setPassageAudioSrc(null);
    setPassageAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
    setFeedbackAudioSrc(null);
    setFeedbackAudioState({ isPlaying: false, playbackRate: 1 });
  };

  const handleOpenPronunciationModal = (text: string) => {
      if (isRecording) return;
      setTextToPractice(text);
      setIsPronunciationModalOpen(true);
  };

  const handleClosePronunciationModal = () => {
      setTextToPractice('');
      setIsPronunciationModalOpen(false);
  };

  const handleSavePronunciationPractice = (session: PronunciationPracticeSession) => {
    setPronunciationHistory(prev => [session, ...prev]);
  };

  const handleSaveTestResult = (resultData: Omit<TestResult, 'id' | 'date'>) => {
    const newTestResult: TestResult = {
      ...resultData,
      id: new Date().toISOString(),
      date: new Date().toISOString(),
    };
    setTestResults(prev => [newTestResult, ...prev]);
  };

  const handleViewTestResult = (result: TestResult) => {
    setViewedTestResult(result);
  };

  const handleSynthesizeFeedback = async (textToPlay: string) => {
    if (isSynthesizingFeedback || !textToPlay) return;
    setIsSynthesizingFeedback(true);
    if(feedbackAudioRef.current) feedbackAudioRef.current.pause();
    setFeedbackAudioSrc(null);

    try {
        const plainText = textToPlay.replace(/\*+/g, '').replace(/#+\s/g, '');
        const audioData = await getSpeechFromText(plainText, 'Kore');
        const wavUrl = createWavUrl(audioData);
        setFeedbackAudioSrc(wavUrl);
    } catch (error) {
        console.error("Failed to play feedback:", error);
        alert(t.audioGenerationError);
    } finally {
        setIsSynthesizingFeedback(false);
    }
  };

  // --- Passage Audio Player Logic ---
  const handleSynthesizeAndPlayPassage = async (textToPlay: string) => {
    if (isSynthesizingPassage || !textToPlay) return;
    setIsSynthesizingPassage(true);
    setPassageAudioSrc(null);
    try {
        const plainText = textToPlay.replace(/\*+/g, '').replace(/#+\s/g, '');
        const audioData = await getSpeechFromText(plainText, selectedVoice);
        const wavUrl = createWavUrl(audioData);
        setPassageAudioSrc(wavUrl);
    } catch (error) {
        console.error("Failed to play passage:", error);
        alert(t.audioGenerationError);
    } finally {
        setIsSynthesizingPassage(false);
    }
  };

  useEffect(() => {
    const audio = passageAudioRef.current;
    if (!audio) return;
    
    const setAudioData = () => setPassageAudioState(prev => ({...prev, duration: audio.duration}));
    const setTime = () => setPassageAudioState(prev => ({...prev, currentTime: audio.currentTime}));
    const setPlaying = () => setPassageAudioState(prev => ({...prev, isPlaying: true}));
    const setPaused = () => setPassageAudioState(prev => ({...prev, isPlaying: false}));

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setTime);
    audio.addEventListener('play', setPlaying);
    audio.addEventListener('pause', setPaused);
    audio.addEventListener('ended', setPaused);

    return () => {
        audio.removeEventListener('loadedmetadata', setAudioData);
        audio.removeEventListener('timeupdate', setTime);
        audio.removeEventListener('play', setPlaying);
        audio.removeEventListener('pause', setPaused);
        audio.removeEventListener('ended', setPaused);
        if (passageAudioSrc) {
            URL.revokeObjectURL(passageAudioSrc);
        }
    };
  }, [passageAudioSrc]);

  useEffect(() => {
    if (passageAudioSrc && passageAudioRef.current) {
        passageAudioRef.current.play().catch(e => console.error("Audio autoplay failed:", e));
    }
  }, [passageAudioSrc]);

  const handlePlayPause = () => {
    if (passageAudioRef.current) {
        passageAudioRef.current.paused ? passageAudioRef.current.play() : passageAudioRef.current.pause();
    }
  };
  const handleSeek = (time: number) => {
    if (passageAudioRef.current) passageAudioRef.current.currentTime = time;
  };
  const handleRewind = () => {
    if (passageAudioRef.current) passageAudioRef.current.currentTime = Math.max(0, passageAudioRef.current.currentTime - 10);
  };
  const handleForward = () => {
    if (passageAudioRef.current) passageAudioRef.current.currentTime = Math.min(passageAudioRef.current.duration, passageAudioRef.current.currentTime + 10);
  };
  const handleVoiceChange = (voice: VoiceOption) => {
      setSelectedVoice(voice);
      setPassageAudioSrc(null);
      setPassageAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
  }

  // --- Feedback Audio Player Logic ---
  useEffect(() => {
    const audio = feedbackAudioRef.current;
    if (!audio) return;
    
    const setPlaying = () => setFeedbackAudioState(prev => ({...prev, isPlaying: true}));
    const setPaused = () => setFeedbackAudioState(prev => ({...prev, isPlaying: false}));
    const setRate = () => setFeedbackAudioState(prev => ({...prev, playbackRate: audio.playbackRate}));

    audio.addEventListener('play', setPlaying);
    audio.addEventListener('pause', setPaused);
    audio.addEventListener('ended', setPaused);
    audio.addEventListener('ratechange', setRate);

    // Auto-play when src is set
    if (feedbackAudioSrc && audio.paused) {
        audio.play().catch(e => console.error("Feedback audio autoplay failed:", e));
    }

    return () => {
        audio.removeEventListener('play', setPlaying);
        audio.removeEventListener('pause', setPaused);
        audio.removeEventListener('ended', setPaused);
        audio.removeEventListener('ratechange', setRate);
        if (feedbackAudioSrc) {
            URL.revokeObjectURL(feedbackAudioSrc);
        }
    };
  }, [feedbackAudioSrc]);
  
  const handleFeedbackPlayPause = () => {
    if (feedbackAudioRef.current) {
        if (feedbackAudioRef.current.paused) {
            feedbackAudioRef.current.play().catch(e => console.error("Error playing feedback audio:", e));
        } else {
            feedbackAudioRef.current.pause();
        }
    }
  };

  const handleFeedbackSpeedChange = (rate: number) => {
      if (feedbackAudioRef.current) {
          feedbackAudioRef.current.playbackRate = rate;
      }
  };


  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} t={t} />;
  }

  const renderStudentView = () => (
    <main className="flex-grow flex flex-col md:flex-row p-4 lg:p-8 gap-8 overflow-hidden">
      <CalendarHistory 
          history={history} 
          pronunciationHistory={pronunciationHistory}
          onSelectSession={handleSelectSession} 
          selectedSessionId={selectedSession?.id} 
          onNewSession={() => { startNewSession(); setCurrentView('coach'); }} 
          disabled={isRecording || isExtractingText}
          t={t}
          language={language}
      />
      <div className="flex-grow flex flex-col gap-8 overflow-y-auto pr-2">
        {currentView === 'coach' && (
          <>
            <ReadingCard
              passage={passage}
              transcription={currentTranscription}
              isRecording={isRecording}
              isExtractingText={isExtractingText}
              isSynthesizingPassage={isSynthesizingPassage}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onFileUpload={handleFileUpload}
              onSynthesizePassage={handleSynthesizeAndPlayPassage}
              passageAudioSrc={passageAudioSrc}
              passageAudioState={passageAudioState}
              selectedVoice={selectedVoice}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onRewind={handleRewind}
              onForward={handleForward}
              onVoiceChange={handleVoiceChange}
              passageFileName={passageFileName}
              t={t}
            />
            <FeedbackCard
              feedback={finalFeedback}
              scores={scores}
              vocabulary={vocabulary}
              isLoading={isLoadingFeedback}
              isLoadingVocabulary={isLoadingVocabulary}
              isSynthesizingFeedback={isSynthesizingFeedback}
              onSynthesizeFeedback={handleSynthesizeFeedback}
              feedbackAudioSrc={feedbackAudioSrc}
              feedbackAudioState={feedbackAudioState}
              onFeedbackPlayPause={handleFeedbackPlayPause}
              onFeedbackSpeedChange={handleFeedbackSpeedChange}
              t={t}
            />
          </>
        )}
        {currentView === 'dashboard' && (
          <Dashboard 
            history={history}
            pronunciationHistory={pronunciationHistory}
            testResults={testResults}
            onSaveTest={handleSaveTestResult}
            onViewTest={handleViewTestResult}
            onOpenPronunciationModal={handleOpenPronunciationModal}
            onSelectSession={handleSelectSession}
            t={t}
          />
        )}
      </div>
    </main>
  );
  
  const renderAdminView = () => (
      <main className="flex-grow p-4 lg:p-8 overflow-y-auto">
          <AdminDashboard allHistory={allHistory} t={t} language={language}/>
      </main>
  );

  return (
    <div className="h-screen flex flex-col font-sans">
      <Header 
        title={currentUser === 'admin' ? t.adminHeaderTitle : t.headerTitle}
        currentUser={currentUser}
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
      />
      <audio ref={passageAudioRef} src={passageAudioSrc ?? undefined}></audio>
      <audio ref={feedbackAudioRef} src={feedbackAudioSrc ?? undefined}></audio>
      {currentUser === 'admin' ? renderAdminView() : renderStudentView()}
      {isPronunciationModalOpen && (
        <PronunciationPracticeModal
          word={textToPractice}
          isOpen={isPronunciationModalOpen}
          onClose={handleClosePronunciationModal}
          onSavePractice={handleSavePronunciationPractice}
          t={t}
        />
      )}
      {viewedTestResult && (
        <TestResultModal
          result={viewedTestResult}
          isOpen={!!viewedTestResult}
          onClose={() => setViewedTestResult(null)}
          t={t}
        />
      )}
    </div>
  );
};

export default App;