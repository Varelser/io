import React, { useState, useRef, useCallback, useEffect } from "react";
import type { HistoryFrame } from "../../types";
import { Button } from "../ui/Button";

export function HistoryPanel({ title, frames, applyLabel, onCapture, onApply, onDelete }: { title: string; frames: HistoryFrame[]; applyLabel: string; onCapture: () => void; onApply: (frameId: string) => void; onDelete: (frameId: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [speed, setSpeed] = useState(1500);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (frames.length < 2) return;
    setPlayIndex(0);
    setPlaying(true);
    onApply(frames[0].id);
  }, [frames, onApply]);

  useEffect(() => {
    if (!playing) return;
    if (playIndex >= frames.length - 1) {
      stopPlayback();
      return;
    }
    timerRef.current = setTimeout(() => {
      const nextIndex = playIndex + 1;
      setPlayIndex(nextIndex);
      onApply(frames[nextIndex].id);
    }, speed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, playIndex, frames, speed, onApply, stopPlayback]);

  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
      {(() => {
        const isJa = title === "履歴";
        return (
          <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[9px] text-white/92">{title}</div>
        <Button onClick={onCapture}>{isJa ? "保存" : "Snapshot"}</Button>
      </div>

      {/* Playback controls */}
      {frames.length >= 2 && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {playing ? (
            <Button onClick={stopPlayback} className="w-full">⏹ {isJa ? "停止" : "Stop"}</Button>
          ) : (
            <Button onClick={startPlayback} className="w-full">▶ {isJa ? `再生 (${frames.length}件)` : `Play (${frames.length} frames)`}</Button>
          )}
          <select
            className="rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] text-white/60"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={500}>0.5s</option>
            <option value={1000}>1s</option>
            <option value={1500}>1.5s</option>
            <option value={2000}>2s</option>
            <option value={3000}>3s</option>
          </select>
        </div>
      )}

      {playing && (
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-blue-400/60 transition-all duration-300" style={{ width: `${((playIndex + 1) / frames.length) * 100}%` }} />
          </div>
          <div className="text-[7px] text-white/40">{playIndex + 1}/{frames.length}</div>
        </div>
      )}

      <div className="mt-1.5 space-y-1">
        {frames.map((frame, i) => (
          <div key={frame.id} className={`rounded-md border px-2 py-1 ${playing && i === playIndex ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-black/40"}`}>
            <div className="flex items-center justify-between gap-1.5 text-[9px] text-white/72">
              <span className="truncate">{frame.label}</span>
              <span className="text-white/34">{new Date(frame.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              <Button onClick={() => onApply(frame.id)} className="w-full">{applyLabel}</Button>
              <Button danger onClick={() => onDelete(frame.id)} className="w-full">{isJa ? "削除" : "Delete"}</Button>
            </div>
          </div>
        ))}
      </div>
          </>
        );
      })()}
    </div>
  );
}
