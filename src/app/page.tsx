"use client";

import { useEffect, useState } from "react";
import { DailyLog, FocusBlock } from "@/types";
import { getTodayLog, saveLog, calculateStreak, getAllLogs } from "@/lib/storage";
import { getNZDisplayDate, getNZDateString } from "@/lib/date";

export default function Home() {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [streak, setStreak] = useState(0);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [view, setView] = useState<"today" | "history">("today");
  const [selectedHistoryLog, setSelectedHistoryLog] = useState<DailyLog | null>(null);

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [timerPhase, setTimerPhase] = useState<"breathing" | "work" | "stretch" | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.1;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    const todayLog = getTodayLog();
    setLog(todayLog);
    const logs = getAllLogs();
    setAllLogs(logs);
    setStreak(calculateStreak(logs));
  }, []);

  useEffect(() => {
    if (!timerPhase || secondsLeft <= 0 || isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          playChime();

          if (timerPhase === "breathing") {
            setTimerPhase("work");
            setSecondsLeft(25 * 60);
            setIsPaused(false);
          } else if (timerPhase === "work") {
            setTimerPhase("stretch");
            setSecondsLeft(60);
            setIsPaused(false);
          } else if (timerPhase === "stretch") {
            setTimerPhase(null);
            setActiveBlockId(null);
            setIsPaused(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerPhase, secondsLeft, isPaused]);

  if (!log) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  const updateLog = (updates: Partial<DailyLog>) => {
    const updated = { ...log, ...updates };
    const saved = saveLog(updated);
    setLog(saved);
    const logs = getAllLogs();
    setAllLogs(logs);
    setStreak(calculateStreak(logs));
  };

  const handleManualSave = () => {
    const saved = saveLog(log);
    setLog(saved);
    const logs = getAllLogs();
    setAllLogs(logs);
    setStreak(calculateStreak(logs));
    setSaveMessage("Saved successfully");
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const startBlock = (blockId: string) => {
    let updatedBlocks = log.blocks.map((b) => {
      if (b.status === "in-progress" && b.id !== blockId) {
        return {
          ...b,
          status: "interrupted" as const,
          completedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    updatedBlocks = updatedBlocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            status: "in-progress" as const,
            startedAt: new Date().toISOString(),
          }
        : b
    );

    updateLog({ blocks: updatedBlocks });
    setActiveBlockId(blockId);
    setTimerPhase("breathing");
    setSecondsLeft(16);
    setIsPaused(false);
  };

  const updateBlockName = (blockId: string, name: string) => {
    const updatedBlocks = log.blocks.map((b) =>
      b.id === blockId ? { ...b, note: name } : b
    );
    updateLog({ blocks: updatedBlocks });
  };

  // ========== HISTORY VIEW ==========
  if (view === "history") {
    return (
      <main className="min-h-screen max-w-lg mx-auto px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">History</h1>
            <p className="text-zinc-400 text-sm mt-1">Past days</p>
          </div>
          <button
            onClick={() => {
              setView("today");
              setSelectedHistoryLog(null);
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            ← Today
          </button>
        </header>

        {selectedHistoryLog ? (
          // Detailed view of one past day
          <div>
            <button
              onClick={() => setSelectedHistoryLog(null)}
              className="text-sm text-zinc-400 hover:text-zinc-200 mb-4"
            >
              ← Back to list
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-medium">
                {getNZDisplayDate(new Date(selectedHistoryLog.date + "T12:00:00"))}
              </h2>
              <p className={`text-sm mt-1 ${selectedHistoryLog.isComplete ? "text-emerald-400" : "text-zinc-500"}`}>
                {selectedHistoryLog.isComplete ? "✓ Day Complete" : "Incomplete"}
              </p>
            </div>

            {/* Morning summary */}
            <section className="mb-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-medium mb-2 text-zinc-300">Morning</h3>
              <div className="text-sm space-y-1 text-zinc-400">
                <p>{selectedHistoryLog.movement ? "✓" : "○"} Movement</p>
                <p>{selectedHistoryLog.water ? "✓" : "○"} Water</p>
                <p>{selectedHistoryLog.centering ? "✓" : "○"} Centering</p>
                <p>{selectedHistoryLog.reading ? "✓" : "○"} Reading {selectedHistoryLog.readingTitle ? `(${selectedHistoryLog.readingTitle})` : ""}</p>
              </div>
            </section>

            {selectedHistoryLog.thoughtDump && (
              <section className="mb-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-sm font-medium mb-2 text-zinc-300">Thought Dump</h3>
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">{selectedHistoryLog.thoughtDump}</p>
              </section>
            )}

            <section className="mb-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
              <h3 className="text-sm font-medium mb-2 text-zinc-300">Focus Blocks</h3>
              {selectedHistoryLog.blocks.length === 0 ? (
                <p className="text-sm text-zinc-500">No blocks</p>
              ) : (
                <div className="space-y-2">
                  {selectedHistoryLog.blocks.map((block, i) => (
                    <div key={block.id} className="text-sm">
                      <p className="font-medium">
                        {block.note || `Block ${i + 1}`} · {block.plannedDuration} min
                      </p>
                      <p className={`text-xs capitalize ${
                        block.status === "complete" ? "text-emerald-400" :
                        block.status === "interrupted" ? "text-red-400" : "text-zinc-500"
                      }`}>
                        {block.status.replace("-", " ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {(selectedHistoryLog.reflection || selectedHistoryLog.distractions) && (
              <section className="mb-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-sm font-medium mb-2 text-zinc-300">Evening</h3>
                {selectedHistoryLog.reflection && (
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap mb-2">{selectedHistoryLog.reflection}</p>
                )}
                {selectedHistoryLog.distractions && (
                  <p className="text-sm text-zinc-500">Distractions: {selectedHistoryLog.distractions}</p>
                )}
              </section>
            )}
          </div>
        ) : (
          // List of all past days
          <div className="space-y-2">
            {allLogs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No history yet.</p>
            ) : (
              allLogs.map((dayLog) => (
                <button
                  key={dayLog.id}
                  onClick={() => setSelectedHistoryLog(dayLog)}
                  className="w-full text-left p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {getNZDisplayDate(new Date(dayLog.date + "T12:00:00"))}
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {dayLog.blocks.length} block{dayLog.blocks.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`text-xs ${dayLog.isComplete ? "text-emerald-400" : "text-zinc-500"}`}>
                      {dayLog.isComplete ? "Complete" : "Incomplete"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </main>
    );
  }

  // ========== TODAY VIEW ==========
  return (
    <main className="min-h-screen max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dopamine Delayer</h1>
            <p className="text-zinc-400 text-sm mt-1">{getNZDisplayDate()}</p>
          </div>
          <button
            onClick={() => setView("history")}
            className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            History
          </button>
        </div>
        <p className="text-amber-400 text-sm mt-2">
          Current streak: <span className="font-medium">{streak}</span> day
          {streak !== 1 ? "s" : ""}
        </p>
        <div className="mt-3">
          {log.isComplete ? (
            <p className="text-emerald-400 text-sm font-medium">✓ Day Complete</p>
          ) : (
            <p className="text-zinc-500 text-sm">Day in progress</p>
          )}
        </div>
      </header>

      {/* Morning */}
      <section className="mb-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <h2 className="text-lg font-medium mb-4">Morning</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={log.movement} onChange={(e) => updateLog({ movement: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500" />
            <span>Movement</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={log.water} onChange={(e) => updateLog({ water: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500" />
            <span>Glass of water</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={log.centering} onChange={(e) => updateLog({ centering: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500" />
            <span>Centering / quiet time</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={log.reading} onChange={(e) => updateLog({ reading: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500" />
            <span>Reading</span>
          </label>
          {log.reading && (
            <input type="text" placeholder="What are you reading? (optional)" value={log.readingTitle || ""}
              onChange={(e) => updateLog({ readingTitle: e.target.value })}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-amber-500" />
          )}
        </div>
      </section>

      {/* Thought Dump */}
      <section className="mb-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <h2 className="text-lg font-medium mb-3">Thought Dump</h2>
        <textarea placeholder="Get whatever is in your head out of the way..." value={log.thoughtDump || ""}
          onChange={(e) => updateLog({ thoughtDump: e.target.value })} rows={4}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-amber-500 resize-none" />
      </section>

      {/* Focus Blocks */}
      <section className="mb-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Focus Blocks</h2>
          <button
            onClick={() => {
              const newBlock: FocusBlock = {
                id: crypto.randomUUID(),
                plannedDuration: 25,
                status: "not-started",
                note: "",
              };
              updateLog({ blocks: [...log.blocks, newBlock] });
            }}
            className="px-3 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-medium transition"
            disabled={!!timerPhase}
          >
            + New Block
          </button>
        </div>

        {log.blocks.length === 0 ? (
          <p className="text-zinc-500 text-sm">No blocks yet. Start one when you’re ready.</p>
        ) : (
          <div className="space-y-3">
            {log.blocks.map((block, index) => {
              const isActive = block.id === activeBlockId && timerPhase === "work";

              return (
                <div key={block.id} className={`p-3 rounded-lg border ${isActive ? "bg-zinc-800 border-emerald-600" : "bg-zinc-800 border-zinc-700"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder={`Block ${index + 1} name (e.g. Client proposal)`}
                        value={block.note || ""}
                        onChange={(e) => updateBlockName(block.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-medium border-b border-zinc-700 focus:border-amber-500 outline-none pb-1"
                      />
                      <p className="text-xs text-zinc-400 mt-1 capitalize">
                        {block.status.replace("-", " ")} · {block.plannedDuration} min
                      </p>
                    </div>

                    {block.status === "not-started" && !timerPhase && (
                      <button onClick={() => startBlock(block.id)}
                        className="px-3 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                        Start
                      </button>
                    )}
                    {block.status === "complete" && <span className="text-xs text-emerald-400 shrink-0">Done</span>}
                    {block.status === "interrupted" && <span className="text-xs text-red-400 shrink-0">Interrupted</span>}
                  </div>

                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-zinc-700">
                      <p className="text-2xl font-light text-center mb-1">
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                      </p>
                      <p className="text-xs text-center text-zinc-400 mb-3">
                        {isPaused ? "Paused" : "Focus time remaining"}
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => setIsPaused(!isPaused)}
                          className="px-3 py-1.5 text-xs rounded-md bg-zinc-700 hover:bg-zinc-600">
                          {isPaused ? "Resume" : "Pause"}
                        </button>
                        <button
                          onClick={() => {
                            const updatedBlocks = log.blocks.map((b) =>
                              b.id === activeBlockId
                                ? { ...b, status: "interrupted" as const, completedAt: new Date().toISOString() }
                                : b
                            );
                            updateLog({ blocks: updatedBlocks });
                            setTimerPhase(null);
                            setActiveBlockId(null);
                            setIsPaused(false);
                          }}
                          className="px-3 py-1.5 text-xs rounded-md bg-zinc-700 hover:bg-zinc-600"
                        >
                          Interrupted
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Evening */}
      <section className="mb-8 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <h2 className="text-lg font-medium mb-3">Evening Reflection</h2>
        <textarea placeholder="How did the day go? Any distractions?" value={log.reflection || ""}
          onChange={(e) => updateLog({ reflection: e.target.value })} rows={3}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-amber-500 resize-none mb-3" />
        <textarea placeholder="Distractions / focus killers (optional)" value={log.distractions || ""}
          onChange={(e) => updateLog({ distractions: e.target.value })} rows={2}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm focus:outline-none focus:border-amber-500 resize-none" />
      </section>

      {/* Save */}
      <div className="mt-6 mb-10">
        <button onClick={handleManualSave}
          className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-medium transition">
          Save Progress
        </button>
        {saveMessage && <p className="text-center text-emerald-400 text-sm mt-3">{saveMessage}</p>}
      </div>

      {/* Overlay for Breathing & Stretch */}
      {timerPhase && activeBlockId && (timerPhase === "breathing" || timerPhase === "stretch") && (
        <div className="fixed inset-0 bg-zinc-950/95 flex flex-col items-center justify-center z-50 p-6">
          <div className="text-center max-w-sm w-full">
            {timerPhase === "breathing" && (
              <>
                <p className="text-amber-400 text-sm mb-2">Box Breathing</p>
                <p className="text-4xl font-light mb-4">{secondsLeft}s</p>
                <p className="text-zinc-400 text-sm">Inhale 4 → Hold 4 → Exhale 4 → Hold 4</p>
              </>
            )}
            {timerPhase === "stretch" && (
              <>
                <p className="text-sky-400 text-sm mb-2">Stretch</p>
                <p className="text-4xl font-light mb-4">{secondsLeft}s</p>
                <p className="text-zinc-400 text-sm mb-6">Move a little</p>
                <button
                  onClick={() => {
                    const updatedBlocks = log.blocks.map((b) =>
                      b.id === activeBlockId
                        ? { ...b, status: "complete" as const, completedAt: new Date().toISOString() }
                        : b
                    );
                    updateLog({ blocks: updatedBlocks });
                    setTimerPhase(null);
                    setActiveBlockId(null);
                    setIsPaused(false);
                  }}
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium"
                >
                  Mark Complete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}