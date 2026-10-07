export type BlockStatus = "not-started" | "in-progress" | "complete" | "interrupted";

export interface FocusBlock {
  id: string;
  plannedDuration: number; // minutes
  status: BlockStatus;
  note?: string;
  startedAt?: string; // ISO string
  completedAt?: string; // ISO string
}

export interface DailyLog {
  id: string;
  date: string; // "YYYY-MM-DD" in NZ time

  // Morning
  movement: boolean;
  water: boolean;
  centering: boolean;
  reading: boolean;
  readingTitle?: string;

  // Thought dump
  thoughtDump?: string;

  // Focus blocks
  blocks: FocusBlock[];

  // Evening
  reflection?: string;
  distractions?: string;

  // Calculated
  isComplete: boolean;

  createdAt: string;
  updatedAt: string;
}