import React from "react";

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-md border px-2 py-1 text-[10px] leading-4 outline-none ${props.className || ""}`} style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)", ...props.style }} />;
}
