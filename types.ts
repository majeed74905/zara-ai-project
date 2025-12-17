
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export type ViewMode = 
  | 'chat' 
  | 'student' 
  | 'code' 
  | 'live' 
  | 'voice' 
  | 'workspace' 
  | 'settings' 
  | 'exam' 
  | 'analytics' 
  | 'planner' 
  | 'mastery' 
  | 'notes' 
  | 'about' 
  | 'builder'
  | 'dashboard'
  | 'life-os'
  | 'skills'
  | 'memory'
  | 'creative'
  | 'pricing'
  | 'video'
  | 'repo';

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

export interface MediaAction {
  action: 'PLAY_MEDIA';
  media_type: 'song' | 'video' | 'playlist' | 'podcast';
  title: string;
  artist?: string;
  platform: 'youtube' | 'spotify';
  url: string;
  embedUrl?: string;
  query: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  sources?: Source[];
  timestamp: number;
  isError?: boolean;
  isStreaming?: boolean;
  isPinned?: boolean;
  isOffline?: boolean; // New flag for offline messages
  mediaAction?: MediaAction;
}

export interface GeneratedFile {
  name: string;
  path: string;
  content: string;
  language: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface StudentConfig {
  topic: string;
  mode: 'summary' | 'mcq' | '5mark' | '20mark' | 'simple';
  mcqConfig?: {
    count: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  };
  studyMaterial?: string;
}

export interface CodeConfig {
  language: string;
  task: 'debug' | 'explain' | 'optimize' | 'generate';
}

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-3-pro-preview' | 'gemini-flash-lite-latest';
export type AppLanguage = 'English' | 'Tamil' | 'Tanglish';
export type InteractionMode = 'default' | 'teacher' | 'developer' | 'friend' | 'examiner';

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  isDefault?: boolean;
}

export interface ChatConfig {
  model: GeminiModel;
  useThinking: boolean;
  useGrounding: boolean;
  activePersonaId?: string;
  
  // --- CORE FEATURES ---
  interactionMode: InteractionMode;
  
  // --- STUDENT TOOLS ---
  examMode: boolean;           // 8. Exam Mode
  integrityMode: boolean;      // 9. Assignment Integrity
  notesFormat: boolean;        // 10. Notes Generator
  reverseMode: boolean;        // 11. Reverse Question Mode
  
  // --- AI ENHANCEMENTS ---
  explainErrors: boolean;      // 12. Error Explanation
  multiPerspective: boolean;   // 13. Multi-Answer
  moodDetection: boolean;      // 15. Mood Detection
  showConfidence: boolean;     // 12. Confidence Indicator (Trust-Weighted)
  eli5: boolean;               // 13. ELI5
  
  // --- ADVANCED EDUCATIONAL FEATURES (PREVIOUS) ---
  adaptiveLeveling: boolean;   // 1. Adaptive Intelligence Leveling
  conceptMapping: boolean;     // 2. Concept Dependency Mapping
  selfVerification: boolean;   // 3. Self-Verification Mode
  mistakeAnalyzer: boolean;    // 4. Mistake Pattern Analyzer
  thoughtPath: boolean;        // 6. Thought-Path Visualization
  goalDriven: boolean;         // 7. Goal-Driven Sessions
  cognitiveLoad: boolean;      // 8. Cognitive Load Control
  learningCompass: boolean;    // 10. AI Learning Compass
  gamification: boolean;       // 11. Gamified Mastery Levels
  contextGuard: boolean;       // 12. Context Switching Guard
  questionScorer: boolean;     // 13. Question Quality Scorer
  hypotheticals: boolean;      // 14. Hypothetical Scenario Generator
  knowledgeBoundaries: boolean;// 15. Knowledge Boundary Detector

  // --- NEXT-GEN COGNITIVE FEATURES (NEW) ---
  learningGap: boolean;        // 1. Learning Gap Discovery
  aiDebate: boolean;           // 2. AI Debate
  conceptCompression: boolean; // 3. Concept Compression/Expansion
  tutorMemory: boolean;        // 4. Long-Term Tutor Memory
  explainMistakes: boolean;    // 5. Explain-My-Mistake
  confusionQuestions: boolean; // 6. Question-Generation-From-Confusion
  confidenceCorrectness: boolean; // 7. Confidence vs Correctness
  knowledgeTimeline: boolean;  // 8. Knowledge Timeline Builder
  mentorEvolution: boolean;    // 9. Mentor Personality Evolution
  socraticMethod: boolean;     // 10. Socratic Teaching
  assumptionExposure: boolean; // 11. Assumption Exposure
  reverseLearning: boolean;    // 12. Reverse Learning (Explain It Wrong)
  failureCases: boolean;       // 13. Real-World Failure Case
  styleDetection: boolean;     // 14. Learning Style Detection
  selfLimit: boolean;          // 15. AI Self-Limit Declaration
}

export interface PersonalizationConfig {
  nickname: string;
  occupation: string;
  aboutYou: string;
  customInstructions: string;
  fontSize: 'small' | 'medium' | 'large';
}

export interface SystemConfig {
  autoTheme: boolean;
  enableAnimations: boolean;
  density: 'comfortable' | 'compact';
  soundEffects: boolean;
}

export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
  category?: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
}

// --- MEMORY ENGINE ---
export type MemoryCategory = 'core' | 'preference' | 'project' | 'emotional' | 'fact';

export interface MemoryNode {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  confidence: number;
  timestamp: number;
}

// --- EXAM MODE TYPES ---
export type ExamType = 'Quiz' | 'Unit Test' | 'Semester';
export type ExamDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';
export type QuestionType = 'MCQ' | 'SHORT' | 'LONG';

export interface ExamConfig {
  subject: string;
  examType: ExamType;
  difficulty: ExamDifficulty;
  language: AppLanguage;
  questionCount: number;
  includeTheory: boolean;
  durationMinutes: number;
}

export interface ExamQuestion {
  id: number;
  type: QuestionType;
  text: string;
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
  isActive: boolean;
  totalScore?: number;
  maxScore?: number;
}

// --- ANALYTICS ---
export interface DailyStats {
  date: string;
  messagesSent: number;
  minutesSpent: number;
  examsTaken: number;
}

// --- STUDY PLANNER ---
export interface Task {
  id: string;
  description: string;
  completed: boolean;
  durationMinutes: number;
}

export interface DayPlan {
  day: string; // "Monday"
  tasks: Task[];
}

export interface StudyPlan {
  id: string;
  topic: string;
  weeklySchedule: DayPlan[];
  createdAt: number;
  startDate: string;
}

// --- TOPIC MASTERY ---
export interface TopicMastery {
  topic: string;
  masteryLevel: number; // 0-100
  status: 'Novice' | 'Intermediate' | 'Expert';
  lastPracticed: number;
}

// --- FLASHCARDS ---
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

// --- NOTES ---
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// --- FEEDBACK ---
export interface AppFeedback {
  id: string;
  rating: number;
  category: string;
  text: string;
  timestamp: number;
}

// --- AUTHENTICATION & TRUST ---
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
  }
}
