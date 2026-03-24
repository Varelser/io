import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-md border px-2 py-[5px] text-[10px] outline-none placeholder:opacity-30 ${props.className || ""}`} style={{ background: "var(--tw-bg-input)", borderColor: "var(--tw-border)", color: "var(--tw-text)", ...props.style }} />;
}
