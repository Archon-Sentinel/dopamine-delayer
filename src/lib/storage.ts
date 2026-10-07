import { v4 as uuidv4 } from "uuid";
import { DailyLog, FocusBlock } from "@/types";
import { getNZDateString } from "./date";

const STORAGE_KEY = "dopamine-delayer-logs";

function loadAllLogs(): DailyLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllLogs(logs: DailyLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

export function getTodayLog(): DailyLog {
  const today = getNZDateString();
  const logs = loadAllLogs();
  let log = logs.find((l) => l.date === today);

  if (!log) {
    log = createEmptyLog(today);
    logs.push(log);
    saveAllLogs(logs);
  }

  return log;
}

export function saveLog(updatedLog: DailyLog) {
  const logs = loadAllLogs();
  const index = logs.findIndex((l) => l.date === updatedLog.date);

  updatedLog.updatedAt = new Date().toISOString();

  // Recalculate isComplete
  const morningDone =
    updatedLog.movement &&
    updatedLog.water &&
    updatedLog.centering &&
    updatedLog.reading;

  const eveningDone = Boolean(updatedLog.reflection?.trim());

  const completedBlocks = updatedLog.blocks.filter((b) => b.status === "complete").length;
  const totalBlocks = updatedLog.blocks.length;
  const blocksOk = totalBlocks === 0 ? false : completedBlocks / totalBlocks >= 0.8;

  updatedLog.isComplete = morningDone && eveningDone && blocksOk;

  if (index >= 0) {
    logs[index] = updatedLog;
  } else {
    logs.push(updatedLog);
  }

  saveAllLogs(logs);
  return updatedLog;
}

export function createEmptyLog(date: string): DailyLog {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    date,
    movement: false,
    water: false,
    centering: false,
    reading: false,
    blocks: [],
    isComplete: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function getAllLogs(): DailyLog[] {
  return loadAllLogs().sort((a, b) => b.date.localeCompare(a.date));
}

export function calculateStreak(logs: DailyLog[]): number {
  if (logs.length === 0) return 0;

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let current = getNZDateString();

  for (const log of sorted) {
    if (log.date === current && log.isComplete) {
      streak++;
      // Move current back one day
      const d = new Date(current + "T12:00:00");
      d.setDate(d.getDate() - 1);
      current = getNZDateString(d);
    } else if (log.date < current) {
      break;
    }
  }

  return streak;
}