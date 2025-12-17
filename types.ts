
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export type ViewMode = 'chat' | 'student' | 'code' | 'image' | 'voice' | 'live' | 'exam' | 'flashcard' | 'planner' | 'notes' | 'analytics' | 'settings' | 'builder' | 'workspace' | 'dashboard' | 'memory' | 'about';

export interface Attachment {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
  isOffline?: boolean;
  sources?: Source[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface ChatConfig {
  model: string;
  useThinking: boolean;
  useGrounding: boolean;
  interactionMode: 'standard' | 'teacher' | 'developer' | 'friend' | 'examiner';
  activePersonaId?: string;
  
  // --- Student-Centric Features ---
  examMode?: boolean;           // Strict syllabus answers
  integrityMode?: boolean;      // Paraphrasing & Originality Score
  notesMode?: boolean;          // Ask -> Notes Format
  
  // --- Advanced Cognitive Features ---
  socraticMode?: boolean;       // Guide via questions
  debateMode?: boolean;         // Challenge user views
  reverseLearning?: boolean;    // Explain wrong to test user
  learningGap?: boolean;        // Detect missing prerequisites
  
  // --- Meta-Cognition & Trust ---
  confidenceIndicator?: boolean;// High/Med/Low labels
  assumptionExposure?: boolean; // List assumptions made
  selfLimit?: boolean;          // Explicitly state AI limits
  errorExplanation?: boolean;   // Explain why AI might be wrong
  
  // --- Content Modifiers ---
  eli5?: boolean;               // Explain Like I'm 5
  multiPerspective?: boolean;   // 3 distinct viewpoints
  failureCase?: boolean;        // Show real-world failure scenarios
  moodDetection?: boolean;      // Adapt to user stress/confusion
}

export interface PersonalizationConfig {
  nickname: string;
  occupation: string;
  aboutYou: string;
  customInstructions: string;
  fontSize: 'small' | 'medium' | 'large';
  responseStyle: 'concise' | 'balanced' | 'detailed'; // Added feature
}

export interface SystemConfig {
  autoTheme: boolean;
  enableAnimations: boolean;
  density: 'comfortable' | 'compact';
  soundEffects: boolean;
}

// Exam Types
export type ExamType = 'Quiz' | 'Unit Test' | 'Semester';
export type ExamDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';
export type AppLanguage = 'English' | 'Tamil' | 'Tanglish';

export interface ExamConfig {
  subject: string;
  examType: ExamType;
  difficulty: ExamDifficulty;
  language: string;
  questionCount: number;
  includeTheory: boolean;
  durationMinutes: number;
}

export interface ExamQuestion {
  id: number;
  text: string;
  type: 'MCQ' | 'Theory';
  options?: string[];
  correctAnswer: string;
  marks: number;
}

export interface ExamAnswer {
  questionId: number;
  userAnswer: string;
  isEvaluated: boolean;
  score: number;
  feedback?: string;
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Record<number, ExamAnswer>;
  createdAt: number;
  completedAt?: number;
  totalScore?: number;
  maxScore?: number;
  isActive: boolean;
}

// Flashcard Types
export interface Flashcard {
  front: string;
  back: string;
  mastered: boolean;
}

export interface FlashcardSet {
  id: string;
  topic: string;
  cards: Flashcard[];
  createdAt: number;
}

// Study Planner Types
export interface Task {
  description: string;
  durationMinutes: number;
  completed: boolean;
}

export interface DaySchedule {
  day: string;
  tasks: Task[];
}

export interface StudyPlan {
  id: string;
  topic: string;
  startDate: number;
  weeklySchedule: DaySchedule[];
}

// Note Types
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// Saved Prompt Types
export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
}

// Prompt Template Types
export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
}

// Analytics Types
export interface DailyStats {
  date: string;
  messagesSent: number;
  minutesSpent: number;
  examsTaken: number;
}

// App Builder Types
export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

// Memory Types
export type MemoryCategory = 'fact' | 'preference' | 'project' | 'core' | 'emotional';

export interface MemoryNode {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  confidence: number;
  timestamp: number;
}

// Feedback Types
export interface AppFeedback {
  id: string;
  rating: number;
  category: string;
  text: string;
  timestamp: number;
}

// Live Mode
export interface MediaAction {
  type: 'play_media';
  query: string;
  platform: 'youtube' | 'spotify';
}

// Auth & Trust Types
export interface AuthUser {
  id: string;
  email: string;
  trustScore: number;
  deviceFingerprint: string;
  lastLogin: number;
  loginCount: number;
  createdAt: number;
}

export interface TrustFactors {
  behaviorScore: number;
  securityScore: number;
  signals: {
    deviceTrusted: boolean;
    locationStable: boolean;
    usageConsistent: boolean;
    recentFailure: boolean;
  };
}
