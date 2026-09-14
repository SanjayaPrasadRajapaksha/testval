export type User = {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  isEmailVerified: boolean;
  createdAt?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: User;
  coachId?: string;
  email?: string;
};

export type Skill = {
  id: string;
  label: string;
  symbol?: string;
  hint?: string;
};

export type Sport = {
  id: string;
  name: string;
  brand: string;
  tagline: string;
  heroTop?: string;
  heroAccent?: string;
  icon: string;
  positions: string[];
  skills: Skill[];
  sortOrder?: number;
  isActive?: boolean;
};

export type Evaluation = {
  id: string;
  playerId?: string;
  teamId?: string;
  sportId?: string | null;
  date?: string | Date;
  seasonName?: string;
  seasonYear?: string;
  evaluationType?: string;
  scores: Record<string, number>;
  skillNotes?: Record<string, string>;
  notes?: string;
  overallScore?: number | null;
};

export type Player = {
  id: string;
  coachId?: string;
  teamId?: string;
  sportId?: string | null;
  name: string;
  jerseyNumber?: string;
  birthday?: string;
  age?: string;
  position?: string;
  notes?: string;
  evaluations?: Evaluation[];
};

export type CoachProfile = {
  id?: string;
  coachName?: string;
  displayName?: string;
  coachEmail?: string;
  email?: string;
  phoneNumber?: string;
  organizationName?: string;
  teamName?: string;
  teamIdentifier?: string;
  sport?: string;
  role?: string;
  logoUrl?: string | null;
};

export type Settings = {
  theme?: "dark" | "light";
  reportLanguage?: "english" | "spanish" | "french" | "portuguese";
  defaultRosterSize?: number;
  notificationsEnabled?: boolean;
};

export type RankingRow = {
  player: Player;
  averageScore: number;
  evaluationCount: number;
};

export type RankingsResponse = {
  sportId: string;
  median: number | null;
  rankings: RankingRow[];
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  code?: string;
};
