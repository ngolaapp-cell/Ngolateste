export type Screen = 
  | 'home' 
  | 'categories' 
  | 'tests' 
  | 'exam' 
  | 'result' 
  | 'activation' 
  | 'login' 
  | 'profile' 
  | 'admin';

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  statusTag?: 'LIBERADO' | 'GRÁTIS' | 'NOVO' | 'EM BREVE' | 'Inscrever agora' | string;
  statusColor?: string;
  subcategoriesCount?: number;
  featured?: boolean;
}

export interface Specialization {
  id: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  description: string;
  icon: string;
  image: string;
  isSelected?: boolean;
  isRecommended?: boolean;
}

export interface TestModule {
  id: string;
  title: string;
  year: number;
  questionCount: number;
  badge?: 'OFICIAL' | 'RECOMENDADO' | 'NOVO' | 'ESPECIAL' | string;
  category: string;
  specializationIds?: string[];
  specializationNames?: string[];
  description?: string;
  createdAt?: string;
}

export interface Question {
  id: string;
  moduleId?: string;
  category: string;
  banca: string;
  statement: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ExamState {
  questions: Question[];
  currentIndex: number;
  selectedAnswers: (number | null)[];
  timeElapsedSeconds: number;
  categoryTitle: string;
  testTitle: string;
  isFocusMode: boolean;
}

export interface ExamResult {
  score: number;
  total: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  finalGrade: number; // Max 20 valores
  studyTip: string;
  categoryName: string;
  testName: string;
  date: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  isActivated: boolean;
  activationCode?: string;
  expiresAt?: string;
  activatedSpecializations?: string[]; // IDs or Titles of activated specializations
  dailyGoalQuestions: number;
  dailyCompletedQuestions: number;
  totalTestsTaken: number;
  averageScore: number;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedAt?: string;
  role?: 'admin' | 'user' | string;
  isVip?: boolean;
  plan?: string;
  accountStatus?: string;
}

export interface AdminAnnouncement {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
  actionText?: string;
  actionUrl?: string;
  badge?: string;
  targetType: 'all' | 'single' | 'selected';
  targetPhones?: string[];
  active: boolean;
  dismissible?: boolean;
  createdAt: string;
}
