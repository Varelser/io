import React from "react";
import { Button } from "../ui/Button";
import { FieldLabel } from "../ui/FieldLabel";

export function RecoveryPanel({ canUndo, canRedo, onUndo, onRedo, onRepair, onRestore, repairMessage, importReport }: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; onRepair: () => void; onRestore: () => void; repairMessage: string; importReport: string }) {
  return (
    <div className="mt-3 rounded-md border border-white/10 bg-black/30 p-2">
      <FieldLabel>Recovery</FieldLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <Button active={canUndo} onClick={onUndo} className="w-full">undo</Button>
        <Button active={canRedo} onClick={onRedo} className="w-full">redo</Button>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Button onClick={onRepair} className="w-full">repair</Button>
        <Button onClick={onRestore} className="w-full">restore</Button>
      </div>
      <div className="mt-1.5 text-[8px] text-white/34">⌘/Ctrl+Z / ⇧+⌘/Ctrl+Z</div>
      {repairMessage ? <div className="mt-1.5 text-[8px] text-white/46">{repairMessage}</div> : null}
      {importReport ? <div className="mt-1 text-[8px] leading-4 text-white/34">{importReport}</div> : null}
    </div>
  );
}
