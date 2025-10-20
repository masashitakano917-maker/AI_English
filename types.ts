// FIX: Define the Question type, which was missing and causing circular import errors.
export interface Question {
  question: string;
  options: string[];
  answer: string;
}

// FIX: Removed a circular self-import of 'PracticeSession' which was causing a conflict.

export interface Score {
  accuracy: number; // Score from 1-5
  fluency: number; // Score from 1-5
  pronunciation: number; // Score from 1-5
}

export interface VocabularyWord {
  word: string;
  definition: string;
  example: string;
}

export interface PracticeSession {
  id: string;
  date: string;
  passage: string;
  passageFileName?: string;
  transcription: string;
  feedback: string; // This will now be the markdown analysis
  scores: Score;
  vocabulary: VocabularyWord[];
}

// FIX: Added the missing ReadingFeedback interface.
export interface ReadingFeedback {
  scores: Score;
  analysis: string;
}

export interface PronunciationFeedback {
  score: number; // Score from 1-5
  analysis: string; // Markdown analysis
}

export interface PronunciationPracticeSession {
  id: string;
  date: string;
  word: string;
  transcription: string;
  feedback: PronunciationFeedback;
}

// --- New Types for Test Generation ---

export type VocabularyTest = Question[];
export type GrammarTest = Question[];
export type ComprehensionTest = Question[];

// --- New Type for Test Results ---
export interface TestResult {
  id: string;
  date: string;
  testType: string;
  score: string; // e.g., "4/5"
  questions: Question[];
  userAnswers: Record<number, string>;
}


// --- New Type for Admin Dashboard & Unified History ---
export interface UserHistory {
  readingSessions: PracticeSession[];
  pronunciationSessions: PronunciationPracticeSession[];
  testResults: TestResult[];
}

export type AllHistory = {
  [user: string]: UserHistory;
};
