import React from "react";
import { Button } from "../ui/Button";
import { TextArea } from "../ui/TextArea";

export function MarkdownJsonPanel({ ioText, onChangeIoText, onExportJson, onImportJson, onExportMarkdown, onDownloadMarkdown, onExportAllMarkdown, onDownloadAllMarkdown, title, lang = "en" }: { ioText: string; onChangeIoText: (value: string) => void; onExportJson: () => void; onImportJson: () => void; onExportMarkdown: () => void; onDownloadMarkdown: () => void; onExportAllMarkdown: () => void; onDownloadAllMarkdown: () => void; title: string; lang?: "ja" | "en" }) {
  return (
    <div className="mt-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
      <div className="text-[9px] text-white/92">{title}</div>
      <div className="mt-1.5"><TextArea rows={10} value={ioText} onChange={(e) => onChangeIoText(e.target.value)} /></div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Button onClick={onExportJson} className="w-full">{lang === "ja" ? "JSON出力" : "Export JSON"}</Button>
        <Button onClick={onImportJson} className="w-full">{lang === "ja" ? "JSON読込" : "Import JSON"}</Button>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Button onClick={onExportMarkdown} className="w-full">{lang === "ja" ? "MD出力" : "Export MD"}</Button>
        <Button onClick={onDownloadMarkdown} className="w-full">{lang === "ja" ? "MD保存" : "Download MD"}</Button>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <Button onClick={onExportAllMarkdown} className="w-full">{lang === "ja" ? "全MD出力" : "Export All MD"}</Button>
        <Button onClick={onDownloadAllMarkdown} className="w-full">{lang === "ja" ? "全MD保存" : "Download All MD"}</Button>
      </div>
    </div>
  );
}
